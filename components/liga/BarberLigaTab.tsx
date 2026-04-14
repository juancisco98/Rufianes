import React, { useMemo, useState } from 'react';
import {
  Trophy, Dice5, DollarSign, Users, Search, Scissors, Crown, History, Target,
} from 'lucide-react';
import { Barber, Barbershop, Service } from '../../types';
import { useLiga } from '../../hooks/useLiga';
import { GlassCard, IOSInput, SegmentedControl, EmptyState } from '../ui';
import Leaderboard from './Leaderboard';
import LigaRealNumbers from './LigaRealNumbers';

interface BarberLigaTabProps {
  barber: Barber;
  barbershop: Barbershop;
  services?: Service[];
}

type SubTab = 'resumen' | 'mios' | 'ranking' | 'historial' | 'meta';

const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

/** Tab "Liga" del BarberPortal — solo visible si la barbería tiene Liga activa. */
export const BarberLigaTab: React.FC<BarberLigaTabProps> = ({ barber, barbershop, services = [] }) => {
  const {
    getCurrentLeaderboard,
    getBarberLigaTodayMetrics,
    getBarberMonthMetrics,
    getBarberRankingInShop,
    getBarberClientsThisMonth,
    getConfig,
    currentMonth,
    ligaEntries,
  } = useLiga();

  const config = getConfig(barbershop.id);
  const month = currentMonth();
  const leaderboard = getCurrentLeaderboard(barbershop.id);
  const todayMetrics = getBarberLigaTodayMetrics(barber.id);
  const monthMetrics = getBarberMonthMetrics(barber.id, month);
  const barberRanking = getBarberRankingInShop(barbershop.id, month);
  const myClients = getBarberClientsThisMonth(barber.id, barbershop.id, month);

  // Mi posición dentro del ranking de barberos de la sucursal
  const myRankIdx = barberRanking.findIndex((r) => r.barberId === barber.id);
  const myRank = myRankIdx >= 0 ? myRankIdx + 1 : null;
  const topBarber = barberRanking[0];

  // Mis últimas tiradas
  const myRecentEntries = useMemo(
    () =>
      ligaEntries
        .filter((e) => e.barberId === barber.id && e.month === month)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 30),
    [ligaEntries, barber.id, month]
  );

  const [sub, setSub] = useState<SubTab>('resumen');
  const [search, setSearch] = useState('');
  const filteredLeaderboard = search.trim()
    ? leaderboard.filter((r) => r.clientName.toLowerCase().includes(search.trim().toLowerCase()))
    : leaderboard;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <GlassCard variant="tinted" padding="md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-[17px] font-bold text-ios-label dark:text-iosDark-label">
              La Liga del Corte
            </h2>
            <p className="text-[12px] text-ios-label2 dark:text-iosDark-label2 uppercase tracking-wide">
              {month} · {barbershop.name}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* KPIs del barbero hoy */}
      <div>
        <p className="text-[10px] font-bold text-ios-label2 dark:text-iosDark-label2 uppercase tracking-widest mb-2 ml-1">
          Hoy
        </p>
        <div className="grid grid-cols-3 gap-2">
          <KpiCard icon={<Dice5 className="w-4 h-4" />} value={todayMetrics.totalPoints} label="Puntos emitidos" color="amber" />
          <KpiCard icon={<Users className="w-4 h-4" />} value={todayMetrics.extraDiceSold} label="Dados vendidos" color="blue" />
          <KpiCard icon={<DollarSign className="w-4 h-4" />} value={fmt(todayMetrics.commission)} label="Comisión liga" color="emerald" />
        </div>
      </div>

      {/* Sub-tabs */}
      <SegmentedControl<SubTab>
        value={sub}
        onChange={setSub}
        size="sm"
        segments={[
          { value: 'resumen',   label: 'Mes' },
          { value: 'mios',      label: 'Mis clientes' },
          { value: 'ranking',   label: 'Ranking' },
          { value: 'historial', label: 'Historial' },
          { value: 'meta',      label: 'Meta' },
        ]}
      />

      {/* ── RESUMEN DEL MES ─────────────────────────────────────────────────── */}
      {sub === 'resumen' && (
        <div className="space-y-3">
          {/* Mi posición entre barberos */}
          <GlassCard variant="tinted" padding="md">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                myRank === 1 ? 'bg-amber-500/20' :
                myRank === 2 ? 'bg-slate-400/20' :
                myRank === 3 ? 'bg-orange-500/20' : 'bg-ios-grouped dark:bg-iosDark-grouped'
              }`}>
                {myRank === 1
                  ? <Crown className="w-6 h-6 text-amber-600" />
                  : <Scissors className="w-6 h-6 text-ios-label2 dark:text-iosDark-label2" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-ios-label2 dark:text-iosDark-label2 uppercase tracking-wide">
                  Tu posición
                </div>
                <div className="font-display text-3xl text-ios-label dark:text-iosDark-label leading-none mt-0.5">
                  {myRank ? `#${myRank}` : '—'}
                  <span className="text-[13px] text-ios-label2 dark:text-iosDark-label2 font-sans ml-1">
                    de {barberRanking.length || '—'} barberos
                  </span>
                </div>
                {topBarber && myRank !== 1 && topBarber.barberId !== barber.id && (
                  <div className="text-[11px] text-ios-label2 dark:text-iosDark-label2 mt-1">
                    Te faltan {fmt(topBarber.extraDiceCommission - monthMetrics.extraDiceCommission)} de comisión para alcanzar a {topBarber.barberName}
                  </div>
                )}
                {myRank === 1 && (
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-1">
                    🏆 Sos el barbero que más dados vendió este mes
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          {/* KPIs del mes */}
          <div>
            <p className="text-[10px] font-bold text-ios-label2 dark:text-iosDark-label2 uppercase tracking-widest mb-2 ml-1">
              Acumulado del mes
            </p>
            <div className="grid grid-cols-2 gap-2">
              <KpiCard
                icon={<DollarSign className="w-4 h-4" />}
                value={fmt(monthMetrics.extraDiceCommission)}
                label="Comisión liga"
                color="emerald"
                emphasize
              />
              <KpiCard
                icon={<Dice5 className="w-4 h-4" />}
                value={monthMetrics.extraDiceSold}
                label="Dados vendidos"
                color="amber"
                emphasize
              />
              <KpiCard
                icon={<Users className="w-4 h-4" />}
                value={monthMetrics.uniqueClients}
                label="Clientes distintos"
                color="blue"
              />
              <KpiCard
                icon={<Target className="w-4 h-4" />}
                value={monthMetrics.totalPointsEmitted}
                label="Puntos emitidos"
                color="violet"
              />
            </div>
          </div>

          {/* Ingreso/promedio */}
          <GlassCard variant="solid" padding="md">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-ios-label2 dark:text-iosDark-label2">Ingreso por dados al local</span>
              <span className="font-semibold text-ios-label dark:text-iosDark-label">
                {fmt(monthMetrics.extraDiceRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px] mt-2">
              <span className="text-ios-label2 dark:text-iosDark-label2">Promedio por dado</span>
              <span className="font-semibold text-ios-label dark:text-iosDark-label">
                {monthMetrics.extraDiceSold > 0
                  ? fmt(monthMetrics.extraDiceCommission / monthMetrics.extraDiceSold)
                  : fmt(config.extraDieCommission)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px] mt-2">
              <span className="text-ios-label2 dark:text-iosDark-label2">Tiradas registradas</span>
              <span className="font-semibold text-ios-label dark:text-iosDark-label">
                {monthMetrics.entries}
              </span>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── MIS CLIENTES ────────────────────────────────────────────────────── */}
      {sub === 'mios' && (
        <div className="space-y-2">
          {myClients.length === 0 ? (
            <EmptyState
              icon={<Users className="w-7 h-7" />}
              title="Todavía no registraste tiradas"
              description="Tus clientes de este mes van a aparecer acá con sus puntos y dados comprados."
            />
          ) : (
            <GlassCard variant="solid" padding="none" className="overflow-hidden">
              <div className="grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 items-center py-2 px-3 bg-ios-grouped dark:bg-iosDark-grouped border-b border-ios-divider dark:border-iosDark-divider text-[10px] font-bold uppercase tracking-wider text-ios-label2 dark:text-iosDark-label2">
                <div className="text-center">#</div>
                <div>Cliente</div>
                <div className="text-right">Pts</div>
                <div className="text-right">🎲</div>
              </div>
              {myClients.map((c, idx) => (
                <div
                  key={c.clientName}
                  className="grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 items-center py-2.5 px-3 border-b border-ios-divider dark:border-iosDark-divider last:border-0"
                >
                  <div className="text-center text-[12px] font-semibold text-ios-label2 dark:text-iosDark-label2 tabular-nums">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] text-ios-label dark:text-iosDark-label font-medium truncate">
                      {c.clientName}
                    </div>
                    <div className="text-[11px] text-ios-label2 dark:text-iosDark-label2 truncate">
                      {c.visits} visita{c.visits !== 1 ? 's' : ''} · últ. {fmtDate(c.lastVisit)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg text-ios-accent leading-none tabular-nums">
                      {c.totalPoints}
                    </div>
                  </div>
                  <div className="text-right text-[12px] font-semibold text-emerald-600 tabular-nums">
                    {c.extraDiceBought}
                  </div>
                </div>
              ))}
            </GlassCard>
          )}
        </div>
      )}

      {/* ── RANKING DE CLIENTES ─────────────────────────────────────────────── */}
      {sub === 'ranking' && (
        <div>
          <IOSInput
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            iconLeft={<Search className="w-4 h-4" />}
            className="mb-3"
          />
          <Leaderboard
            rows={filteredLeaderboard}
            prizeLabel={config.prizeLabel}
            showPodiumHero={!search}
            limit={20}
          />
        </div>
      )}

      {/* ── META MENSUAL (simulador) ───────────────────────────────────────── */}
      {sub === 'meta' && (
        <LigaRealNumbers
          config={config}
          services={services}
          barbers={[barber]}
        />
      )}

      {/* ── HISTORIAL PERSONAL ──────────────────────────────────────────────── */}
      {sub === 'historial' && (
        <div>
          {myRecentEntries.length === 0 ? (
            <EmptyState
              icon={<History className="w-7 h-7" />}
              title="Sin tiradas este mes"
              description="Registrá una tirada en el modal de corte y la vas a ver acá."
            />
          ) : (
            <GlassCard variant="solid" padding="none" className="overflow-hidden">
              {myRecentEntries.map((e, idx) => (
                <div
                  key={e.id}
                  className={`px-3 py-2.5 text-[12px] ${idx !== myRecentEntries.length - 1 ? 'border-b border-ios-divider dark:border-iosDark-divider' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-ios-label2 dark:text-iosDark-label2 tabular-nums shrink-0">
                        {fmtDate(e.createdAt)} {fmtTime(e.createdAt)}
                      </span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${e.isService ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-slate-500/15 text-slate-600 dark:text-slate-300'}`}>
                        {e.isService ? 'CORTE' : 'NO CORTE'}
                      </span>
                    </div>
                    <span className="font-display text-lg text-ios-accent leading-none tabular-nums shrink-0">
                      {e.totalPoints}pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-ios-label dark:text-iosDark-label font-medium truncate">
                      {e.clientName}
                    </span>
                    <div className="flex items-center gap-2 text-ios-label2 dark:text-iosDark-label2 shrink-0">
                      <span>Σ{e.diceSum}={e.servicePoints}</span>
                      {e.extraDiceCount > 0 && (
                        <span>+{e.extraDiceCount}🎲</span>
                      )}
                      {e.extraDiceCommission > 0 && (
                        <span className="text-emerald-600 font-semibold">
                          +{fmt(e.extraDiceCommission)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  amber:   { bg: 'bg-amber-50 dark:bg-amber-500/10',       icon: 'text-amber-600',   value: 'text-amber-700 dark:text-amber-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10',   icon: 'text-emerald-600', value: 'text-emerald-700 dark:text-emerald-400' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-500/10',         icon: 'text-blue-600',    value: 'text-blue-700 dark:text-blue-400' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-500/10',     icon: 'text-violet-600',  value: 'text-violet-700 dark:text-violet-400' },
} as const;

const KpiCard: React.FC<{
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  color: keyof typeof COLOR_MAP;
  emphasize?: boolean;
}> = ({ icon, value, label, color, emphasize }) => {
  const cls = COLOR_MAP[color];
  return (
    <div className={`${cls.bg} rounded-2xl p-3 text-center`}>
      <div className={`${cls.icon} mx-auto mb-1 flex justify-center`}>{icon}</div>
      <div className={`font-display ${emphasize ? 'text-2xl' : 'text-xl'} ${cls.value} leading-none tabular-nums`}>
        {value}
      </div>
      <div className="text-[10px] text-ios-label2 dark:text-iosDark-label2 uppercase tracking-wider mt-1 leading-tight">
        {label}
      </div>
    </div>
  );
};

export default BarberLigaTab;
