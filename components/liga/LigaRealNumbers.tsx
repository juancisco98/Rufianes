import React, { useMemo, useState, useEffect } from 'react';
import { Trophy, Dice5, Target, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { GlassCard } from '../ui';
import { LigaConfig, Service, Barber } from '../../types';

interface Props {
  config: LigaConfig;
  services: Service[];
  barbers: Barber[];
}

const WORKING_HOURS = 9; // horas por día — para cálculo de minutos/servicio

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');

type Scenario = {
  id: 'base' | 'mid' | 'opt';
  label: string;
  tagText: string;
  dicePerService: number;
};

const SCENARIOS: Scenario[] = [
  { id: 'base', label: 'Escenario Base',      tagText: 'Mínimo viable', dicePerService: 1 },
  { id: 'mid',  label: 'Escenario Medio',     tagText: '+50% dados',    dicePerService: 1.5 },
  { id: 'opt',  label: 'Escenario Optimista', tagText: 'Los 3 dados',   dicePerService: 3 },
];

export const LigaRealNumbers: React.FC<Props> = ({ config, services, barbers }) => {
  const activeBarbers = useMemo(() => barbers.filter((b) => b.isActive), [barbers]);
  const activeServices = useMemo(() => services.filter((s) => s.isActive), [services]);

  const [selectedBarberId, setSelectedBarberId] = useState<string>(activeBarbers[0]?.id ?? '');

  useEffect(() => {
    if (!selectedBarberId && activeBarbers.length > 0) {
      setSelectedBarberId(activeBarbers[0].id);
    }
  }, [activeBarbers, selectedBarberId]);

  const selectedBarber = activeBarbers.find((b) => b.id === selectedBarberId);
  const commissionPct = selectedBarber?.commissionPct ?? 45;

  // Estado de cantidades por servicio/día. Default sensato: 5 al más barato/clásico, 2 al resto.
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (activeServices.length === 0) return;
    setQuantities((prev) => {
      // Mantener valores previos si todavía existe el servicio.
      const next: Record<string, number> = {};
      activeServices.forEach((s, i) => {
        next[s.id] = prev[s.id] ?? (i === 0 ? 5 : 2);
      });
      return next;
    });
  }, [activeServices]);

  const workingDays = config.workingDaysPerMonth ?? 26;
  const goal = config.monthlyGoal ?? 1_000_000;
  const prizesTotal = config.prize1 + config.prize2 + config.prize3;

  const stats = useMemo(() => {
    const totalServicios = activeServices.reduce((a, s) => a + (quantities[s.id] ?? 0), 0);
    const dailyRevenue = activeServices.reduce(
      (a, s) => a + (quantities[s.id] ?? 0) * s.basePrice, 0
    );
    const avgTicket = totalServicios > 0 ? dailyRevenue / totalServicios : 0;
    return { totalServicios, dailyRevenue, avgTicket };
  }, [activeServices, quantities]);

  const scenarioResults = useMemo(() => {
    return SCENARIOS.map((sc) => {
      const dadosDia = stats.totalServicios * sc.dicePerService;
      const comCortesMes = stats.dailyRevenue * (commissionPct / 100) * workingDays;
      const comDadosMes = dadosDia * config.extraDieCommission * workingDays;
      const sueldoTotal = comCortesMes + comDadosMes;
      const cajaServiciosMes = stats.dailyRevenue * (1 - commissionPct / 100) * workingDays;
      const cajaDadosMes = dadosDia * (config.extraDieCost - config.extraDieCommission) * workingDays;
      const ingDadosMes = dadosDia * config.extraDieCost * workingDays;
      const cajaNeta = cajaServiciosMes + cajaDadosMes - prizesTotal;
      const pctMeta = goal > 0 ? Math.round((sueldoTotal / goal) * 100) : 0;
      const minutosPorServicio = stats.totalServicios > 0
        ? Math.round((WORKING_HOURS * 60) / stats.totalServicios)
        : 0;
      return {
        ...sc,
        dadosDia,
        dadosMes: Math.round(dadosDia * workingDays),
        comCortesMes,
        comDadosMes,
        sueldoTotal,
        cajaServiciosMes,
        cajaDadosMes,
        ingDadosMes,
        cajaNeta,
        pctMeta,
        minutosPorServicio,
        superaMeta: sueldoTotal >= goal,
      };
    });
  }, [stats, commissionPct, workingDays, config, prizesTotal, goal]);

  if (activeServices.length === 0) {
    return (
      <GlassCard variant="solid" padding="md">
        <div className="text-center py-6">
          <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h3 className="text-[15px] font-semibold text-ios-label dark:text-iosDark-label">
            Cargá servicios para ver el simulador
          </h3>
          <p className="text-[12px] text-ios-label2 dark:text-iosDark-label2 mt-1">
            El simulador usa los precios reales de los servicios de la barbería.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <GlassCard variant="tinted" padding="md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl text-ios-label dark:text-iosDark-label leading-none">
              Números Reales
            </h2>
            <p className="text-[12px] text-ios-label2 dark:text-iosDark-label2 mt-1">
              Para hablar con los barberos · Meta {fmt(goal)}/mes · {workingDays} días trabajados
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Strips: servicios y premios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <GlassCard variant="solid" padding="md">
          <div className="text-[10px] uppercase tracking-wider text-ios-label2 dark:text-iosDark-label2 font-semibold mb-2">
            💈 Servicios y precios
          </div>
          <div className="space-y-1.5">
            {activeServices.map((s) => (
              <div key={s.id} className="flex justify-between items-center text-[13px] border-b border-ios-divider dark:border-iosDark-divider last:border-0 pb-1.5 last:pb-0">
                <span className="text-ios-label2 dark:text-iosDark-label2">{s.name}</span>
                <span className="font-medium text-ios-label dark:text-iosDark-label">{fmt(s.basePrice)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center text-[13px] pt-1.5">
              <span className="text-ios-label2 dark:text-iosDark-label2">Dado extra</span>
              <span className="font-medium text-ios-label dark:text-iosDark-label">{fmt(config.extraDieCost)}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-ios-label2 dark:text-iosDark-label2">Comisión corte</span>
              <span className="font-medium text-ios-label dark:text-iosDark-label">{commissionPct}%</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-ios-label2 dark:text-iosDark-label2">Comisión dado</span>
              <span className="font-medium text-ios-label dark:text-iosDark-label">
                {fmt(config.extraDieCommission)} / {fmt(config.extraDieCost)}
              </span>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="solid" padding="md">
          <div className="text-[10px] uppercase tracking-wider text-ios-label2 dark:text-iosDark-label2 font-semibold mb-2">
            🏆 Premios mensuales
          </div>
          <div className="space-y-1.5">
            <PremioRow emoji="🥇" label="1°" amount={config.prize1} />
            <PremioRow emoji="🥈" label="2°" amount={config.prize2} />
            <PremioRow emoji="🥉" label="3°" amount={config.prize3} />
            <div className="flex justify-between items-center text-[13px] pt-2 border-t border-ios-divider dark:border-iosDark-divider">
              <span className="font-semibold text-ios-label dark:text-iosDark-label">Total premios</span>
              <span className="font-semibold text-rose-600">{fmt(prizesTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-ios-label2 dark:text-iosDark-label2">{config.prizeLabel}</span>
              <span className="text-ios-label2 dark:text-iosDark-label2">por mes</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Mix de servicios */}
      <GlassCard variant="solid" padding="md" className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[11px] uppercase tracking-wider text-ios-label2 dark:text-iosDark-label2 font-semibold">
            🎛️ Mix de servicios por día
          </div>
          {activeBarbers.length > 0 && (
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              className="h-8 px-3 rounded-lg bg-ios-grouped dark:bg-iosDark-grouped text-[12px] font-medium border border-transparent focus:outline-none focus:border-ios-accent"
            >
              {activeBarbers.map((b) => (
                <option key={b.id} value={b.id}>{b.name} · {b.commissionPct}%</option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {activeServices.map((s) => (
            <div key={s.id} className="text-center">
              <div className="font-display text-2xl text-amber-600 leading-none">
                {quantities[s.id] ?? 0}
              </div>
              <div className="text-[10px] text-ios-label2 dark:text-iosDark-label2 mt-1 truncate">
                {s.name}
              </div>
              <input
                type="range"
                min={0}
                max={15}
                value={quantities[s.id] ?? 0}
                onChange={(e) => setQuantities((q) => ({ ...q, [s.id]: Number(e.target.value) }))}
                className="w-full mt-1 accent-amber-500"
              />
              <div className="text-[10px] text-ios-label2 dark:text-iosDark-label2">{fmt(s.basePrice)} c/u</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-ios-grouped dark:bg-iosDark-grouped px-3 py-2 flex justify-between items-center">
          <span className="text-[12px] text-ios-label2 dark:text-iosDark-label2">Ticket promedio ponderado</span>
          <span className="font-display text-xl text-amber-600">{fmt(stats.avgTicket)}</span>
        </div>
      </GlassCard>

      {/* Escenarios */}
      <div className="space-y-3">
        {scenarioResults.map((s) => (
          <ScenarioCard key={s.id} s={s} total={stats.totalServicios} workingDays={workingDays} goal={goal} prizesTotal={prizesTotal} />
        ))}
      </div>

      {/* Nota dados */}
      <GlassCard variant="tinted" padding="md">
        <p className="text-[12px] text-ios-label2 dark:text-iosDark-label2 leading-relaxed">
          💡 <strong className="text-ios-label dark:text-iosDark-label">Nota sobre los dados:</strong> cada cliente tiene 3 dados de regalo incluidos
          con el servicio (tirada ×{config.serviceMultiplier} para puntos). Los dados <em>extra</em> los compra aparte — hasta 3 más a {fmt(config.extraDieCost)} c/u.
          El barbero se lleva {fmt(config.extraDieCommission)} por cada dado extra vendido, en el momento.
        </p>
      </GlassCard>

      {/* Conclusión */}
      <div className="rounded-2xl bg-slate-900 dark:bg-black/60 p-5 text-white/85">
        <h3 className="font-display text-xl text-amber-400 tracking-wide mb-3">
          📋 Lo que le decís al barbero
        </h3>
        {(() => {
          const base = scenarioResults[0];
          const mid  = scenarioResults[1];
          const opt  = scenarioResults[2];
          return (
            <div className="space-y-2 text-[13px] leading-relaxed">
              <p>📊 <strong className="text-amber-200">Escenario base:</strong> Con {stats.totalServicios} servicios/día y 1 dado por servicio, el sueldo llega a {fmt(base.sueldoTotal)}. {base.superaMeta ? '✅ Supera el millón.' : '⚠️ No llega al millón — más servicios o más dados.'}</p>
              <p>📈 <strong className="text-amber-200">Escenario medio:</strong> Con 1.5 dados por servicio, sueldo {fmt(mid.sueldoTotal)}. {mid.superaMeta ? '✅ Supera el millón.' : '⚠️ Cerca del millón.'}</p>
              <p>🚀 <strong className="text-amber-200">Optimista:</strong> Vendiendo los 3 dados a cada cliente, {fmt(opt.sueldoTotal)} — un {Math.max(0, Math.round((opt.sueldoTotal / goal - 1) * 100))}% arriba de la meta.</p>
              <p>🎲 <strong className="text-amber-200">La clave:</strong> La diferencia entre {fmt(base.sueldoTotal)} y {fmt(opt.sueldoTotal)} son los dados. El corte es fijo; el dado es el único número que el barbero controla 100%. Por eso la comisión es inmediata y en efectivo.</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

const PremioRow: React.FC<{ emoji: string; label: string; amount: number }> = ({ emoji, label, amount }) => (
  <div className="flex items-center gap-2 text-[13px] border-b border-ios-divider dark:border-iosDark-divider last:border-0 pb-1.5 last:pb-0">
    <span>{emoji}</span>
    <span className="text-ios-label2 dark:text-iosDark-label2">{label}</span>
    <span className="font-display text-lg text-amber-600 ml-auto">${amount.toLocaleString('es-AR')}</span>
  </div>
);

interface ScenarioResult {
  id: 'base' | 'mid' | 'opt';
  label: string;
  tagText: string;
  dicePerService: number;
  dadosDia: number;
  dadosMes: number;
  comCortesMes: number;
  comDadosMes: number;
  sueldoTotal: number;
  cajaServiciosMes: number;
  cajaDadosMes: number;
  ingDadosMes: number;
  cajaNeta: number;
  pctMeta: number;
  minutosPorServicio: number;
  superaMeta: boolean;
}

interface ScenarioCardProps {
  s: ScenarioResult;
  total: number;
  workingDays: number;
  goal: number;
  prizesTotal: number;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ s, total, workingDays, goal, prizesTotal }) => {
  const fillPct = Math.min(100, Math.max(0, s.pctMeta));
  const barColor = s.pctMeta >= 100 ? 'bg-emerald-500' : s.pctMeta >= 80 ? 'bg-amber-500' : 'bg-rose-500';
  const tagClass =
    s.id === 'base' ? 'bg-sky-500/15 text-sky-600' :
    s.id === 'mid'  ? 'bg-emerald-500/15 text-emerald-600' :
                      'bg-orange-500/15 text-orange-600';
  const emoji = s.id === 'base' ? '📊' : s.id === 'mid' ? '📈' : '🚀';

  return (
    <GlassCard variant="solid" padding="none">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-ios-divider dark:border-iosDark-divider">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <div>
            <div className="font-display text-xl text-ios-label dark:text-iosDark-label leading-none">{s.label}</div>
            <div className="text-[11px] text-ios-label2 dark:text-iosDark-label2 mt-0.5">
              {total} servicios/día · {s.dadosDia.toFixed(1).replace('.0', '')} dados/día
            </div>
          </div>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${tagClass}`}>{s.tagText}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Kpi value={total} label="servicios/día" color="text-amber-600" />
          <Kpi value={s.dadosDia.toFixed(1).replace('.0', '')} label="dados/día" color="text-emerald-600" />
          <Kpi value={`${s.minutosPorServicio}'`} label="min por servicio" color="text-sky-600" />
          <Kpi value={`${s.pctMeta}%`} label="del objetivo" color={s.pctMeta >= 100 ? 'text-emerald-600' : 'text-orange-600'} />
        </div>

        {/* Desglose */}
        <div className="rounded-xl border border-ios-divider dark:border-iosDark-divider overflow-hidden text-[13px]">
          <Drow label={`Comisión cortes (${workingDays} días)`} value={fmt(s.comCortesMes)} valueClass="text-emerald-600" />
          <Drow label={`Comisión dados (${s.dadosMes} dados)`} value={fmt(s.comDadosMes)} valueClass="text-emerald-600" />
          <Drow label="💈 Sueldo total del barbero" value={fmt(s.sueldoTotal)} bold valueClass="text-amber-600" surface />
          <Drow muted label="Caja: % restante servicios" value={fmt(s.cajaServiciosMes)} />
          <Drow muted label={`Caja: % restante dados — ingreso ${fmt(s.ingDadosMes)}`} value={fmt(s.cajaDadosMes)} />
          <Drow muted label="Premios Liga" value={`−${fmt(prizesTotal)}`} valueClass="text-rose-600" />
          <Drow label="🏦 Ganancia neta barbería" value={fmt(s.cajaNeta)} bold valueClass={s.cajaNeta >= 0 ? 'text-emerald-600' : 'text-rose-600'} surface />
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-[11px] text-ios-label2 dark:text-iosDark-label2 mb-1">
            <span>Sueldo barbero vs meta {fmt(goal)}</span>
            <span className="flex items-center gap-1">
              {s.pctMeta >= 100 ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-rose-500" />}
              {s.pctMeta}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-ios-divider dark:bg-iosDark-divider overflow-hidden">
            <div className={`h-full ${barColor} transition-all`} style={{ width: `${fillPct}%` }} />
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

const Kpi: React.FC<{ value: React.ReactNode; label: string; color: string }> = ({ value, label, color }) => (
  <div className="rounded-xl bg-ios-grouped dark:bg-iosDark-grouped p-2 text-center">
    <div className={`font-display text-xl leading-none ${color}`}>{value}</div>
    <div className="text-[10px] text-ios-label2 dark:text-iosDark-label2 mt-1 leading-tight">{label}</div>
  </div>
);

const Drow: React.FC<{
  label: string; value: string; valueClass?: string; bold?: boolean; muted?: boolean; surface?: boolean;
}> = ({ label, value, valueClass, bold, muted, surface }) => (
  <div className={`flex justify-between items-center px-3 py-2 border-b border-ios-divider dark:border-iosDark-divider last:border-0 ${surface ? 'bg-ios-grouped dark:bg-iosDark-grouped' : ''} ${muted ? 'opacity-70' : ''}`}>
    <span className={`text-ios-label2 dark:text-iosDark-label2 ${bold ? 'font-semibold !text-ios-label dark:!text-iosDark-label' : ''}`}>{label}</span>
    <span className={`${bold ? 'font-semibold' : 'font-medium'} ${valueClass ?? 'text-ios-label dark:text-iosDark-label'}`}>{value}</span>
  </div>
);

export default LigaRealNumbers;
