import React, { useMemo, useState, useEffect } from 'react';
import {
  Trophy, Settings, Calculator, History, List, Save, Lock,
  DollarSign, Users, TrendingUp, Share2, Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  GlassCard, GlassButton, SegmentedControl, IOSInput, IOSSwitch, ListGroup, ListRow, EmptyState,
} from './ui';
import Leaderboard from './liga/Leaderboard';
import LigaRealNumbers from './liga/LigaRealNumbers';
import LigaBreakdownTab from './liga/LigaBreakdownTab';
import { useLiga } from '../hooks/useLiga';
import { useDataContext } from '../context/DataContext';
import { LigaConfig, Barbershop } from '../types';
import { LIGA_DEFAULT_CONFIG } from '../constants';
import { supabaseUpdate } from '../utils/supabaseHelpers';

type Tab = 'summary' | 'leaderboard' | 'simulator' | 'breakdown' | 'config' | 'closings';

const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`;

const LigaView: React.FC = () => {
  const { barbershops, setBarbershops, barbers, services, ligaClients } = useDataContext();
  const {
    ligaEnabledShops,
    getConfig,
    saveConfig,
    getLeaderboard,
    getSummary,
    closeMonth,
    ligaEntries,
    ligaMonthlyClosings,
    currentMonth,
  } = useLiga();

  // Si no hay barberías con liga habilitada, ofrecer habilitarla
  const eligibleShops = barbershops.filter((s) => s.isActive);
  const [selectedShopId, setSelectedShopId] = useState<string>(
    ligaEnabledShops[0]?.id ?? ''
  );

  useEffect(() => {
    if (!selectedShopId && ligaEnabledShops.length > 0) {
      setSelectedShopId(ligaEnabledShops[0].id);
    }
  }, [ligaEnabledShops, selectedShopId]);

  const [tab, setTab] = useState<Tab>('summary');
  const [month, setMonth] = useState<string>(currentMonth());

  const selectedShop = barbershops.find((s) => s.id === selectedShopId);
  const config = selectedShopId ? getConfig(selectedShopId) : null;
  const leaderboard = selectedShopId ? getLeaderboard(selectedShopId, month) : [];
  const summary = selectedShopId ? getSummary(selectedShopId, month) : null;

  const closingsForShop = useMemo(
    () => ligaMonthlyClosings.filter((c) => c.barbershopId === selectedShopId),
    [ligaMonthlyClosings, selectedShopId]
  );

  // ── Si ningún shop tiene la liga habilitada ────────────────────────────────
  if (ligaEnabledShops.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <GlassCard variant="tinted" padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-ios-label dark:text-iosDark-label">
                La Liga del Corte
              </h2>
              <p className="text-[13px] text-ios-label2 dark:text-iosDark-label2">
                Ninguna barbería tiene la liga habilitada
              </p>
            </div>
          </div>
          <p className="text-[13px] text-ios-label2 dark:text-iosDark-label2 mb-4">
            Elegí la sucursal piloto (ej: Martínez) para activar la gamificación.
          </p>
          <ListGroup>
            {eligibleShops.map((s) => (
              <ListRow
                key={s.id}
                title={s.name}
                subtitle={s.address}
                trailing={
                  <IOSSwitch
                    checked={false}
                    onChange={async (on) => {
                      if (!on) return;
                      try {
                        await supabaseUpdate('barbershops', s.id, { liga_enabled: true }, 'barbershop');
                        setBarbershops((prev) =>
                          prev.map((b) => (b.id === s.id ? { ...b, ligaEnabled: true } : b))
                        );
                        setSelectedShopId(s.id);
                        toast.success(`Liga activada en ${s.name}`);
                      } catch (err: any) {
                        toast.error(`Error: ${err?.code ?? ''} ${err?.message ?? ''}`);
                      }
                    }}
                  />
                }
              />
            ))}
          </ListGroup>
        </GlassCard>
      </div>
    );
  }

  if (!selectedShop || !config || !summary) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 pb-24 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ios-label dark:text-iosDark-label leading-none">
            La Liga del Corte
          </h1>
          <p className="text-[13px] text-ios-label2 dark:text-iosDark-label2 mt-1">
            {selectedShop.name} · {month}
          </p>
        </div>
        {ligaEnabledShops.length > 1 && (
          <select
            value={selectedShopId}
            onChange={(e) => setSelectedShopId(e.target.value)}
            className="h-9 px-3 rounded-xl bg-ios-grouped dark:bg-iosDark-grouped text-[13px] font-medium border border-transparent focus:outline-none focus:border-ios-accent"
          >
            {ligaEnabledShops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        size="sm"
        segments={[
          { value: 'summary',     label: 'Resumen' },
          { value: 'leaderboard', label: 'Ranking' },
          { value: 'simulator',   label: 'Simulador' },
          { value: 'breakdown',   label: 'Desglose' },
          { value: 'config',      label: 'Config' },
          { value: 'closings',    label: 'Cierres' },
        ]}
      />

      {/* ── RESUMEN ─────────────────────────────────────────────────────────── */}
      {tab === 'summary' && (
        <div className="space-y-4">
          {/* Compartir link público */}
          <GlassCard variant="tinted" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Share2 className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-ios-label dark:text-iosDark-label">
                  Dashboard público para clientes
                </div>
                <div className="text-[12px] text-ios-label2 dark:text-iosDark-label2 truncate">
                  Compartilo en redes o proyectalo en una TV del local
                </div>
              </div>
              <GlassButton
                variant="primary"
                size="sm"
                iconLeft={<LinkIcon className="w-3.5 h-3.5" />}
                onClick={async () => {
                  const url = `${window.location.origin}${window.location.pathname}?liga=${selectedShop.id}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success('Link copiado al portapapeles');
                  } catch {
                    toast.error('No se pudo copiar — copialo manualmente: ' + url);
                  }
                }}
              >
                Copiar link
              </GlassButton>
            </div>
          </GlassCard>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Clientes" value={summary.uniqueClients} icon={<Users className="w-4 h-4" />} color="blue" />
            <Kpi label="Puntos" value={summary.totalPoints} icon={<Trophy className="w-4 h-4" />} color="amber" />
            <Kpi label="Dados vendidos" value={summary.totalExtraDiceSold} icon={<Calculator className="w-4 h-4" />} color="violet" />
            <Kpi label="Ingreso" value={fmt(summary.totalRevenue)} icon={<DollarSign className="w-4 h-4" />} color="green" />
          </div>

          <GlassCard variant="solid" padding="md">
            <h3 className="text-[15px] font-semibold text-ios-label dark:text-iosDark-label mb-3">
              Break-even en vivo
            </h3>
            <div className="space-y-2 text-[13px]">
              <Row label="Ingreso dados extra" value={fmt(summary.totalRevenue)} positive />
              <Row label="Comisión barberos" value={`-${fmt(summary.totalCommission)}`} negative />
              <Row label="Premios comprometidos" value={`-${fmt(config.prize1 + config.prize2 + config.prize3)}`} negative />
              <div className="pt-2 border-t border-ios-divider dark:border-iosDark-divider flex justify-between">
                <span className="font-semibold text-ios-label dark:text-iosDark-label">Neto proyectado</span>
                <span
                  className={`font-display text-xl ${
                    summary.totalRevenue - summary.totalCommission - (config.prize1 + config.prize2 + config.prize3) >= 0
                      ? 'text-emerald-600'
                      : 'text-ios-red'
                  }`}
                >
                  {fmt(
                    summary.totalRevenue -
                      summary.totalCommission -
                      (config.prize1 + config.prize2 + config.prize3)
                  )}
                </span>
              </div>
            </div>
          </GlassCard>

          <Leaderboard rows={leaderboard.slice(0, 5)} prizeLabel={config.prizeLabel} showPodiumHero={true} limit={5} />
        </div>
      )}

      {/* ── LEADERBOARD ─────────────────────────────────────────────────────── */}
      {tab === 'leaderboard' && (
        <Leaderboard rows={leaderboard} prizeLabel={config.prizeLabel} limit={50} />
      )}

      {/* ── SIMULADOR ───────────────────────────────────────────────────────── */}
      {tab === 'simulator' && (
        <LigaRealNumbers
          config={config}
          services={services.filter((s) => !s.barbershopId || s.barbershopId === selectedShop.id)}
          barbers={barbers.filter((b) => b.barbershopId === selectedShop.id)}
        />
      )}

      {/* ── DESGLOSE ────────────────────────────────────────────────────────── */}
      {tab === 'breakdown' && (
        <LigaBreakdownTab
          barbershopId={selectedShop.id}
          barbershopName={selectedShop.name}
          month={month}
          entries={ligaEntries}
          barbers={barbers.filter((b) => b.barbershopId === selectedShop.id)}
          ligaClients={ligaClients.filter((c) => c.barbershopId === selectedShop.id)}
        />
      )}

      {/* ── CONFIG ──────────────────────────────────────────────────────────── */}
      {tab === 'config' && <ConfigTab config={config} onSave={saveConfig} barbershop={selectedShop} setBarbershops={setBarbershops} />}

      {/* ── CIERRES ─────────────────────────────────────────────────────────── */}
      {tab === 'closings' && (
        <div className="space-y-4">
          <GlassCard variant="solid" padding="md">
            <h3 className="text-[15px] font-semibold text-ios-label dark:text-iosDark-label mb-1">
              Cerrar mes actual ({month})
            </h3>
            <p className="text-[12px] text-ios-label2 dark:text-iosDark-label2 mb-3">
              Congela el podio. Los premios quedan asignados y el mes no se puede modificar. Arranca uno nuevo automáticamente.
            </p>
            <GlassButton
              variant="destructive"
              iconLeft={<Lock className="w-4 h-4" />}
              onClick={async () => {
                if (!confirm(`¿Cerrar la liga de ${month}? Esta acción no se puede deshacer.`)) return;
                try {
                  const closing = await closeMonth(selectedShop.id, month);
                  toast.success(
                    `Mes ${month} cerrado · Top: ${closing.podium[0]?.clientName ?? '—'}`
                  );
                } catch (err: any) {
                  toast.error(`Error: ${err?.code ?? ''} ${err?.message ?? ''}`);
                }
              }}
              disabled={leaderboard.length === 0}
            >
              Cerrar mes
            </GlassButton>
          </GlassCard>

          {closingsForShop.length === 0 ? (
            <EmptyState
              icon={<History className="w-6 h-6" />}
              title="Sin cierres previos"
              description="Cada cierre mensual queda registrado acá."
            />
          ) : (
            <ListGroup header="Histórico de cierres">
              {closingsForShop.map((c) => (
                <ListRow
                  key={c.id}
                  icon={<Trophy className="w-4 h-4 text-amber-600" />}
                  iconBg="bg-amber-500/15"
                  title={c.month}
                  subtitle={`${c.podium[0]?.clientName ?? '—'} · ${c.podium[0]?.points ?? 0} pts`}
                  value={
                    <span className={c.net >= 0 ? 'text-emerald-600' : 'text-ios-red'}>
                      {fmt(c.net)}
                    </span>
                  }
                />
              ))}
            </ListGroup>
          )}
        </div>
      )}
    </div>
  );
};

// ── Subcomponentes ─────────────────────────────────────────────────────────────

const Kpi: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: 'amber' | 'blue' | 'green' | 'violet';
}> = ({ label, value, icon, color }) => {
  const colors = {
    amber: 'bg-amber-500/15 text-amber-600',
    blue: 'bg-blue-500/15 text-blue-600',
    green: 'bg-emerald-500/15 text-emerald-600',
    violet: 'bg-violet-500/15 text-violet-600',
  }[color];
  return (
    <GlassCard variant="solid" padding="md">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colors}`}>
        {icon}
      </div>
      <div className="font-display text-2xl text-ios-label dark:text-iosDark-label leading-none">
        {value}
      </div>
      <div className="text-[11px] text-ios-label2 dark:text-iosDark-label2 uppercase tracking-wider mt-1">
        {label}
      </div>
    </GlassCard>
  );
};

const Row: React.FC<{ label: string; value: string; positive?: boolean; negative?: boolean }> = ({
  label, value, positive, negative,
}) => (
  <div className="flex justify-between">
    <span className="text-ios-label2 dark:text-iosDark-label2">{label}</span>
    <span
      className={`font-semibold ${positive ? 'text-emerald-600' : negative ? 'text-ios-red' : 'text-ios-label dark:text-iosDark-label'}`}
    >
      {value}
    </span>
  </div>
);

const ConfigTab: React.FC<{
  config: LigaConfig;
  onSave: (c: LigaConfig) => Promise<void>;
  barbershop: Barbershop;
  setBarbershops: React.Dispatch<React.SetStateAction<Barbershop[]>>;
}> = ({ config, onSave, barbershop, setBarbershops }) => {
  const [draft, setDraft] = useState<LigaConfig>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(config); }, [config.barbershopId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      toast.success('Configuración guardada');
    } catch (err: any) {
      toast.error(`Error: ${err?.code ?? ''} ${err?.message ?? ''}`);
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => setDraft({ ...draft, ...LIGA_DEFAULT_CONFIG, isActive: draft.isActive });

  return (
    <div className="space-y-4">
      <GlassCard variant="solid" padding="md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold text-ios-label dark:text-iosDark-label">
              Liga activa en esta sucursal
            </div>
            <div className="text-[12px] text-ios-label2 dark:text-iosDark-label2">
              Si la desactivás, el modal de corte deja de mostrar la sección Liga
            </div>
          </div>
          <IOSSwitch
            checked={barbershop.ligaEnabled === true}
            onChange={async (on) => {
              try {
                await supabaseUpdate('barbershops', barbershop.id, { liga_enabled: on }, 'barbershop');
                setBarbershops((prev) =>
                  prev.map((b) => (b.id === barbershop.id ? { ...b, ligaEnabled: on } : b))
                );
                toast.success(on ? 'Liga activada' : 'Liga desactivada');
              } catch (err: any) {
                toast.error(`Error: ${err?.code ?? ''} ${err?.message ?? ''}`);
              }
            }}
          />
        </div>
      </GlassCard>

      <GlassCard variant="solid" padding="md" className="space-y-3">
        <h3 className="text-[15px] font-semibold text-ios-label dark:text-iosDark-label">
          Mecánica
        </h3>
        <IOSInput
          label="Multiplicador de la tirada"
          type="number"
          min={1}
          max={5}
          value={draft.serviceMultiplier}
          onChange={(e) => setDraft({ ...draft, serviceMultiplier: Number(e.target.value) })}
          helper="×2 es lo recomendado (3-18 pts base → 6-36 pts)"
        />
        <div className="grid grid-cols-2 gap-3">
          <IOSInput
            label="Costo dado extra"
            type="number"
            min={0}
            step={100}
            value={draft.extraDieCost}
            onChange={(e) => setDraft({ ...draft, extraDieCost: Number(e.target.value) })}
          />
          <IOSInput
            label="Comisión barbero"
            type="number"
            min={0}
            step={100}
            value={draft.extraDieCommission}
            onChange={(e) => setDraft({ ...draft, extraDieCommission: Number(e.target.value) })}
          />
        </div>
      </GlassCard>

      <GlassCard variant="solid" padding="md" className="space-y-3">
        <h3 className="text-[15px] font-semibold text-ios-label dark:text-iosDark-label">
          Simulador Números Reales
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <IOSInput
            label="Días trabajados/mes"
            type="number"
            min={1}
            max={31}
            value={draft.workingDaysPerMonth ?? 26}
            onChange={(e) => setDraft({ ...draft, workingDaysPerMonth: Number(e.target.value) })}
            helper="Usado en el simulador"
          />
          <IOSInput
            label="Meta mensual sueldo ($)"
            type="number"
            min={0}
            step={10000}
            value={draft.monthlyGoal ?? 1_000_000}
            onChange={(e) => setDraft({ ...draft, monthlyGoal: Number(e.target.value) })}
          />
        </div>
      </GlassCard>

      <GlassCard variant="solid" padding="md" className="space-y-3">
        <h3 className="text-[15px] font-semibold text-ios-label dark:text-iosDark-label">
          Premios
        </h3>
        <IOSInput
          label="Nombre del premio"
          value={draft.prizeLabel}
          onChange={(e) => setDraft({ ...draft, prizeLabel: e.target.value })}
          placeholder="Tarjeta Nike"
        />
        <div className="grid grid-cols-3 gap-2">
          <IOSInput
            label="1° lugar"
            type="number"
            min={0}
            step={1000}
            value={draft.prize1}
            onChange={(e) => setDraft({ ...draft, prize1: Number(e.target.value) })}
          />
          <IOSInput
            label="2° lugar"
            type="number"
            min={0}
            step={1000}
            value={draft.prize2}
            onChange={(e) => setDraft({ ...draft, prize2: Number(e.target.value) })}
          />
          <IOSInput
            label="3° lugar"
            type="number"
            min={0}
            step={1000}
            value={draft.prize3}
            onChange={(e) => setDraft({ ...draft, prize3: Number(e.target.value) })}
          />
        </div>
      </GlassCard>

      <div className="flex gap-2">
        <GlassButton variant="secondary" onClick={resetDefaults} fullWidth>
          Defaults
        </GlassButton>
        <GlassButton
          variant="primary"
          onClick={handleSave}
          loading={saving}
          iconLeft={<Save className="w-4 h-4" />}
          fullWidth
        >
          Guardar
        </GlassButton>
      </div>
    </div>
  );
};

export default LigaView;
