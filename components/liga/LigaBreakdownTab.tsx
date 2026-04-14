import React, { useMemo, useState } from 'react';
import { Users, Scissors, ListChecks, Download, Search, ChevronDown, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { GlassCard, GlassButton, SegmentedControl, IOSInput, EmptyState } from '../ui';
import { LigaEntry, LigaClient, Barber } from '../../types';
import {
  computeClientBreakdown,
  computeBarberBreakdown,
  computeTimeline,
  ClientBreakdownRow,
  BarberBreakdownRow,
  TimelineRow,
} from '../../utils/ligaBreakdown';
import {
  exportLigaClients,
  exportLigaBarbers,
  exportLigaTimeline,
  exportLigaFichas,
} from '../../utils/exportLigaBreakdown';
import LigaClientsAdmin from './LigaClientsAdmin';
import LigaPublicQRModal from './LigaPublicQRModal';

type SubTab = 'clientes' | 'barberos' | 'timeline' | 'fichas' | 'export';

interface Props {
  barbershopId: string;
  barbershopName: string;
  month: string;
  entries: LigaEntry[];
  barbers: Barber[];
  ligaClients?: LigaClient[];
}

const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

export const LigaBreakdownTab: React.FC<Props> = ({
  barbershopId,
  barbershopName,
  month,
  entries,
  barbers,
  ligaClients = [],
}) => {
  const [sub, setSub] = useState<SubTab>('clientes');
  const [search, setSearch] = useState('');
  const [qrOpen, setQrOpen] = useState(false);

  const clients = useMemo(
    () => computeClientBreakdown(entries, barbers, barbershopId, month, ligaClients),
    [entries, barbers, barbershopId, month, ligaClients]
  );
  const barberRows = useMemo(
    () => computeBarberBreakdown(entries, barbers, barbershopId, month),
    [entries, barbers, barbershopId, month]
  );
  const timeline = useMemo(
    () => computeTimeline(entries, barbers, barbershopId, month),
    [entries, barbers, barbershopId, month]
  );

  const filenamePrefix = `liga-${barbershopName.toLowerCase().replace(/\s+/g, '-')}-${month}`;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <SegmentedControl<SubTab>
        value={sub}
        onChange={setSub}
        size="sm"
        segments={[
          { value: 'clientes', label: 'Del mes' },
          { value: 'fichas',   label: 'Fichas' },
          { value: 'barberos', label: 'Barberos' },
          { value: 'timeline', label: 'Timeline' },
          { value: 'export',   label: 'Export' },
        ]}
      />

      {/* Search (no aplica a Export ni Fichas — fichas maneja su propia búsqueda) */}
      {sub !== 'export' && sub !== 'fichas' && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ios-label2 dark:text-iosDark-label2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={sub === 'clientes' ? 'Buscar cliente…' : sub === 'barberos' ? 'Buscar barbero…' : 'Buscar cliente o barbero…'}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-ios-grouped dark:bg-iosDark-grouped text-[13px] border border-transparent focus:outline-none focus:border-ios-accent"
          />
        </div>
      )}

      {sub === 'clientes' && (
        <ClientesView rows={clients} barbers={barbers} search={search} entries={entries} />
      )}
      {sub === 'fichas' && (
        <LigaClientsAdmin
          barbershopId={barbershopId}
          barbershopName={barbershopName}
          month={month}
          entries={entries}
          onOpenPublicQR={() => setQrOpen(true)}
        />
      )}
      {sub === 'barberos' && (
        <BarberosView rows={barberRows} search={search} />
      )}
      {sub === 'timeline' && (
        <TimelineView rows={timeline} barbers={barbers} search={search} />
      )}
      {sub === 'export' && (
        <ExportView
          clients={clients}
          barbers={barberRows}
          timeline={timeline}
          fichas={ligaClients}
          entries={entries}
          month={month}
          filenamePrefix={filenamePrefix}
        />
      )}

      <LigaPublicQRModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        barbershopId={barbershopId}
        barbershopName={barbershopName}
      />
    </div>
  );
};

// ─── Clientes ──────────────────────────────────────────────────────────────────

const ClientesView: React.FC<{
  rows: ClientBreakdownRow[];
  barbers: Barber[];
  search: string;
  entries: LigaEntry[];
}> = ({ rows, search, entries, barbers }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const term = search.trim().toLowerCase();
  const filtered = term
    ? rows.filter(
        (r) =>
          r.clientName.toLowerCase().includes(term) ||
          (r.clientPhone ?? '').toLowerCase().includes(term)
      )
    : rows;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Users className="w-7 h-7" />}
        title={rows.length === 0 ? 'Sin clientes este mes' : 'Sin resultados'}
        description={rows.length === 0 ? 'Apenas registren tiradas aparecen acá.' : 'Probá con otro término'}
      />
    );
  }

  return (
    <GlassCard variant="solid" padding="none" className="overflow-hidden">
      <div className="grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 items-center py-2 px-3 bg-ios-grouped dark:bg-iosDark-grouped border-b border-ios-divider dark:border-iosDark-divider text-[10px] font-bold uppercase tracking-wider text-ios-label2 dark:text-iosDark-label2">
        <div className="text-center">#</div>
        <div>Cliente</div>
        <div className="text-right">Pts</div>
        <div className="text-right">$</div>
      </div>
      {filtered.map((r, idx) => {
        const rowKey = r.ligaClientId ?? `name:${r.clientName.trim().toLowerCase()}`;
        const isExp = expanded === rowKey;
        const clientEntries = isExp
          ? entries
              .filter((e) =>
                r.ligaClientId
                  ? e.ligaClientId === r.ligaClientId
                  : e.clientName.trim().toLowerCase() === r.clientName.trim().toLowerCase()
              )
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          : [];
        return (
          <React.Fragment key={rowKey}>
            <button
              type="button"
              onClick={() => setExpanded(isExp ? null : rowKey)}
              className="w-full text-left grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 items-center py-2.5 px-3 border-b border-ios-divider dark:border-iosDark-divider last:border-0 hover:bg-ios-grouped/60 dark:hover:bg-iosDark-grouped/60"
            >
              <div className="text-center text-[13px] font-semibold text-ios-label2 dark:text-iosDark-label2 tabular-nums">
                {idx + 1}
              </div>
              <div className="min-w-0">
                <div className="text-[14px] text-ios-label dark:text-iosDark-label font-medium truncate flex items-center gap-1.5">
                  <span className="truncate">{r.clientName}</span>
                  {r.clientCode && (
                    <span className="text-[10px] text-amber-600 tabular-nums shrink-0">
                      #{r.clientCode}
                    </span>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-ios-label3 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                </div>
                <div className="text-[11px] text-ios-label2 dark:text-iosDark-label2 truncate">
                  {r.visits} visita{r.visits !== 1 ? 's' : ''}
                  {r.extraDiceBought > 0 && ` · ${r.extraDiceBought} dados extra`}
                  {` · ${r.habitualBarberName}`}
                  {r.clientPhone && ` · ${r.clientPhone}`}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-xl text-ios-accent leading-none tabular-nums">
                  {r.totalPoints}
                </div>
                <div className="text-[10px] text-ios-label3 dark:text-iosDark-label3">
                  {fmtDate(r.lastVisit)}
                </div>
              </div>
              <div className="text-right text-[12px] font-semibold text-emerald-600 tabular-nums">
                {fmt(r.extraDiceRevenue)}
              </div>
            </button>
            {isExp && clientEntries.length > 0 && (
              <div className="bg-ios-grouped/60 dark:bg-iosDark-grouped/40 px-3 py-2 border-b border-ios-divider dark:border-iosDark-divider space-y-1.5">
                {clientEntries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-[11px] gap-2">
                    <span className="text-ios-label2 dark:text-iosDark-label2 shrink-0">
                      {fmtDate(e.createdAt)} {fmtTime(e.createdAt)}
                    </span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold ${e.isService ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-slate-500/15 text-slate-600 dark:text-slate-300'}`}>
                      {e.isService ? 'CORTE' : 'NO CORTE'}
                    </span>
                    <span className="text-ios-label dark:text-iosDark-label">
                      Σ{e.diceSum} → <strong>{e.servicePoints}</strong> pts
                    </span>
                    {e.extraDiceCount > 0 && (
                      <span className="text-ios-label2 dark:text-iosDark-label2">
                        +{e.extraDiceCount}🎲 ({e.extraDicePoints}pts)
                      </span>
                    )}
                    <span className="ml-auto font-semibold text-ios-accent tabular-nums shrink-0">
                      {e.totalPoints}pts
                    </span>
                    <span className="text-ios-label3 dark:text-iosDark-label3 truncate max-w-[80px]">
                      {barbers.find((b) => b.id === e.barberId)?.name ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </GlassCard>
  );
};

// ─── Barberos ──────────────────────────────────────────────────────────────────

const BarberosView: React.FC<{ rows: BarberBreakdownRow[]; search: string }> = ({ rows, search }) => {
  const term = search.trim().toLowerCase();
  const filtered = term ? rows.filter((r) => r.barberName.toLowerCase().includes(term)) : rows;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Scissors className="w-7 h-7" />}
        title={rows.length === 0 ? 'Sin actividad de barberos' : 'Sin resultados'}
        description={rows.length === 0 ? 'Apenas registren tiradas aparecen acá.' : ''}
      />
    );
  }

  const totalCommission = filtered.reduce((a, r) => a + r.extraDiceCommission, 0);
  const totalEntries = filtered.reduce((a, r) => a + r.entries, 0);

  return (
    <div className="space-y-3">
      {filtered.map((r) => (
        <GlassCard key={r.barberId} variant="solid" padding="md">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[15px] font-semibold text-ios-label dark:text-iosDark-label">
                {r.barberName}
              </div>
              <div className="text-[11px] text-ios-label2 dark:text-iosDark-label2">
                {r.entries} tirada{r.entries !== 1 ? 's' : ''} · {r.uniqueClients} cliente{r.uniqueClients !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl text-emerald-600 leading-none tabular-nums">
                {fmt(r.extraDiceCommission)}
              </div>
              <div className="text-[10px] text-ios-label2 dark:text-iosDark-label2 uppercase tracking-wider">
                Comisión
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-ios-divider dark:border-iosDark-divider">
            <Stat label="Puntos" value={r.totalPointsEmitted} />
            <Stat label="Dados vend." value={r.extraDiceSold} />
            <Stat label="$ dados" value={fmt(r.extraDiceRevenue)} />
            <Stat label="Prom. pts" value={r.avgPointsPerEntry.toFixed(1)} />
          </div>
        </GlassCard>
      ))}
      <GlassCard variant="tinted" padding="md">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-semibold text-ios-label dark:text-iosDark-label">
            Total ({filtered.length} barbero{filtered.length !== 1 ? 's' : ''})
          </span>
          <div className="flex items-center gap-4">
            <span className="text-ios-label2 dark:text-iosDark-label2">
              {totalEntries} tiradas
            </span>
            <span className="font-display text-xl text-emerald-600 tabular-nums">
              {fmt(totalCommission)}
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="text-center">
    <div className="text-[13px] font-semibold text-ios-label dark:text-iosDark-label tabular-nums">
      {value}
    </div>
    <div className="text-[10px] text-ios-label2 dark:text-iosDark-label2 uppercase tracking-wider">
      {label}
    </div>
  </div>
);

// ─── Timeline ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const TimelineView: React.FC<{
  rows: TimelineRow[];
  barbers: Barber[];
  search: string;
}> = ({ rows, barbers, search }) => {
  const [page, setPage] = useState(1);
  const [barberFilter, setBarberFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'corte' | 'nocorte'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const term = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (term && !r.clientName.toLowerCase().includes(term) && !r.barberName.toLowerCase().includes(term)) {
        return false;
      }
      if (barberFilter && r.barberId !== barberFilter) return false;
      if (typeFilter === 'corte' && !r.isService) return false;
      if (typeFilter === 'nocorte' && r.isService) return false;
      const day = r.createdAt.slice(0, 10); // Lección 8: nunca comparar ISO completos
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [rows, term, barberFilter, typeFilter, dateFrom, dateTo]);

  const visible = filtered.slice(0, page * PAGE_SIZE);

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <GlassCard variant="solid" padding="sm" className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-ios-label2 dark:text-iosDark-label2 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={barberFilter}
            onChange={(e) => { setBarberFilter(e.target.value); setPage(1); }}
            className="h-9 px-2 rounded-lg bg-ios-grouped dark:bg-iosDark-grouped text-[12px] border border-transparent focus:outline-none focus:border-ios-accent"
          >
            <option value="">Todos los barberos</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as typeof typeFilter); setPage(1); }}
            className="h-9 px-2 rounded-lg bg-ios-grouped dark:bg-iosDark-grouped text-[12px] border border-transparent focus:outline-none focus:border-ios-accent"
          >
            <option value="all">CORTE y NO CORTE</option>
            <option value="corte">Solo CORTE</option>
            <option value="nocorte">Solo NO CORTE</option>
          </select>
          <IOSInput
            label="Desde"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          />
          <IOSInput
            label="Hasta"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          />
        </div>
      </GlassCard>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="w-7 h-7" />}
          title="Sin tiradas"
          description="Ajustá los filtros o registrá una tirada."
        />
      ) : (
        <>
          <GlassCard variant="solid" padding="none" className="overflow-hidden">
            {visible.map((r, idx) => (
              <div
                key={r.id}
                className={`px-3 py-2.5 text-[12px] ${idx !== visible.length - 1 ? 'border-b border-ios-divider dark:border-iosDark-divider' : ''}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-ios-label2 dark:text-iosDark-label2 tabular-nums shrink-0">
                      {fmtDate(r.createdAt)} {fmtTime(r.createdAt)}
                    </span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${r.isService ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-slate-500/15 text-slate-600 dark:text-slate-300'}`}>
                      {r.isService ? 'CORTE' : 'NO CORTE'}
                    </span>
                  </div>
                  <span className="font-display text-lg text-ios-accent leading-none tabular-nums shrink-0">
                    {r.totalPoints}pts
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="min-w-0 truncate">
                    <span className="text-ios-label2 dark:text-iosDark-label2">{r.barberName}</span>
                    <span className="text-ios-label3 dark:text-iosDark-label3 mx-1">→</span>
                    <span className="text-ios-label dark:text-iosDark-label font-medium">{r.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-ios-label2 dark:text-iosDark-label2 shrink-0">
                    <span>Σ{r.diceSum}={r.servicePoints}</span>
                    {r.extraDiceCount > 0 && (
                      <span>+{r.extraDiceCount}🎲 ({r.extraDicePoints})</span>
                    )}
                    {r.extraDiceCommission > 0 && (
                      <span className="text-emerald-600 font-semibold">{fmt(r.extraDiceCommission)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </GlassCard>
          <div className="flex items-center justify-between text-[12px] text-ios-label2 dark:text-iosDark-label2 px-1">
            <span>
              Mostrando {visible.length} de {filtered.length}
            </span>
            {visible.length < filtered.length && (
              <GlassButton variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)}>
                Ver más
              </GlassButton>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Export ────────────────────────────────────────────────────────────────────

const ExportView: React.FC<{
  clients: ClientBreakdownRow[];
  barbers: BarberBreakdownRow[];
  timeline: TimelineRow[];
  fichas: LigaClient[];
  entries: LigaEntry[];
  month: string;
  filenamePrefix: string;
}> = ({ clients, barbers, timeline, fichas, entries, month, filenamePrefix }) => {
  const handle = (fn: () => void, label: string) => {
    try {
      fn();
      toast.success(`${label} descargado`);
    } catch (err: any) {
      toast.error(`Error al exportar: ${err?.message ?? 'desconocido'}`);
    }
  };

  return (
    <GlassCard variant="solid" padding="md" className="space-y-3">
      <div>
        <h3 className="text-[15px] font-semibold text-ios-label dark:text-iosDark-label">
          Exportar desglose del mes
        </h3>
        <p className="text-[12px] text-ios-label2 dark:text-iosDark-label2 mt-1">
          Descargá los datos en Excel para auditoría, impuestos o reporte al dueño.
        </p>
      </div>
      <div className="space-y-2">
        <GlassButton
          fullWidth
          variant="primary"
          iconLeft={<Download className="w-4 h-4" />}
          onClick={() => handle(() => exportLigaClients(clients, `${filenamePrefix}-clientes`), 'Clientes')}
          disabled={clients.length === 0}
        >
          Clientes ({clients.length})
        </GlassButton>
        <GlassButton
          fullWidth
          variant="secondary"
          iconLeft={<Download className="w-4 h-4" />}
          onClick={() => handle(() => exportLigaBarbers(barbers, `${filenamePrefix}-barberos`), 'Barberos')}
          disabled={barbers.length === 0}
        >
          Barberos ({barbers.length})
        </GlassButton>
        <GlassButton
          fullWidth
          variant="secondary"
          iconLeft={<Download className="w-4 h-4" />}
          onClick={() => handle(() => exportLigaTimeline(timeline, `${filenamePrefix}-timeline`), 'Timeline')}
          disabled={timeline.length === 0}
        >
          Timeline ({timeline.length} tiradas)
        </GlassButton>
        <GlassButton
          fullWidth
          variant="secondary"
          iconLeft={<Download className="w-4 h-4" />}
          onClick={() => handle(() => exportLigaFichas(fichas, entries, month, `${filenamePrefix.replace(/-\d{4}-\d{2}$/, '')}-fichas`), 'Fichas')}
          disabled={fichas.length === 0}
        >
          Fichas de clientes ({fichas.length})
        </GlassButton>
      </div>
    </GlassCard>
  );
};

export default LigaBreakdownTab;
