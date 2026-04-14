import React, { useMemo, useState } from 'react';
import {
  Clock, ShieldCheck, Search, Filter, Scissors, DollarSign,
  CheckCircle, AlertCircle, Calendar, User, Store,
} from 'lucide-react';
import { ShiftClosing, ShiftClosingMetadata } from '../types';
import { useDataContext } from '../context/DataContext';
import { GlassCard, IOSInput, SegmentedControl, EmptyState } from './ui';
import ShiftClosingDetailModal from './ShiftClosingDetailModal';

const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`;

const fmtTime = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const fmtDate = (date: string) => {
  const d = new Date(date + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' });
};

type StatusFilter = 'all' | 'open' | 'closed';

/**
 * ShiftsView — vista admin de TODOS los turnos (abiertos + cerrados).
 * Filtros: barbería, barbero, fecha, estado, búsqueda.
 * Click en un turno → detalle completo con horarios, totales, gastos y auditoría de caja.
 */
const ShiftsView: React.FC = () => {
  const { shiftClosings, barbers, barbershops } = useDataContext();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [shopFilter, setShopFilter] = useState<string>('');
  const [barberFilter, setBarberFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedClosing, setSelectedClosing] = useState<ShiftClosing | null>(null);

  const filtered = useMemo(() => {
    return shiftClosings
      .filter((c) => {
        if (statusFilter === 'open' && c.status !== 'OPEN') return false;
        if (statusFilter === 'closed' && c.status !== 'CLOSED') return false;
        if (shopFilter && c.barbershopId !== shopFilter) return false;
        if (barberFilter && c.barberId !== barberFilter) return false;
        if (dateFilter && c.shiftDate !== dateFilter) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const barber = barbers.find((b) => b.id === c.barberId);
          const shop = barbershops.find((s) => s.id === c.barbershopId);
          if (
            !barber?.name.toLowerCase().includes(q) &&
            !shop?.name.toLowerCase().includes(q) &&
            !c.shiftDate.includes(q)
          ) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Abiertos arriba, después por fecha desc, después por hora de inicio desc
        if (a.status !== b.status) return a.status === 'OPEN' ? -1 : 1;
        if (a.shiftDate !== b.shiftDate) return b.shiftDate.localeCompare(a.shiftDate);
        return (b.startedAt ?? '').localeCompare(a.startedAt ?? '');
      });
  }, [shiftClosings, statusFilter, shopFilter, barberFilter, dateFilter, search, barbers, barbershops]);

  // Métricas agregadas del filtro actual
  const aggregate = useMemo(() => {
    const closed = filtered.filter((c) => c.status === 'CLOSED');
    return {
      openCount: filtered.filter((c) => c.status === 'OPEN').length,
      closedCount: closed.length,
      totalCuts: closed.reduce((sum, c) => sum + c.totalCuts, 0),
      totalRevenue: closed.reduce((sum, c) => sum + c.totalRevenue, 0),
      totalCommission: closed.reduce((sum, c) => sum + c.totalCommission, 0),
      withAudit: closed.filter((c) => c.cashAudit).length,
      auditDifferences: closed
        .filter((c) => c.cashAudit && c.cashAudit.difference !== 0)
        .reduce((sum, c) => sum + (c.cashAudit?.difference ?? 0), 0),
    };
  }, [filtered]);

  // Convertir un ShiftClosing a ShiftClosingMetadata para el detail modal
  const buildMetadata = (closing: ShiftClosing): ShiftClosingMetadata => {
    const barber = barbers.find((b) => b.id === closing.barberId);
    const shop = barbershops.find((s) => s.id === closing.barbershopId);
    return {
      barbershopId: closing.barbershopId,
      barbershopName: shop?.name ?? '',
      barberId: closing.barberId,
      barberName: barber?.name ?? '',
      shiftDate: closing.shiftDate,
      startedAt: closing.startedAt,
      closedAt: closing.closedAt ?? undefined,
      totalCuts: closing.totalCuts,
      totalRevenue: closing.totalRevenue,
      totalCash: closing.totalCash,
      totalCard: closing.totalCard,
      totalTransfer: closing.totalTransfer,
      totalCommission: closing.totalCommission,
      expensesCash: closing.expensesCash,
      netCashToHand: closing.netCashToHand ?? closing.totalCash - closing.expensesCash,
      expensesDetail: closing.expensesDetail,
      cashAudit: closing.cashAudit,
      isManager: barber?.isManager === true,
    };
  };

  const filteredBarbers = shopFilter
    ? barbers.filter((b) => b.barbershopId === shopFilter)
    : barbers;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4 pb-24 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-ios-label dark:text-iosDark-label leading-none">
          Turnos
        </h1>
        <p className="text-[13px] text-ios-label2 dark:text-iosDark-label2 mt-1">
          Histórico completo de turnos abiertos y cerrados
        </p>
      </div>

      {/* KPIs agregados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard variant="solid" padding="md">
          <Clock className="w-4 h-4 text-amber-500 mb-2" />
          <div className="font-display text-2xl text-ios-label dark:text-iosDark-label leading-none">
            {aggregate.openCount}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-ios-label2 dark:text-iosDark-label2 mt-1">
            Abiertos
          </div>
        </GlassCard>
        <GlassCard variant="solid" padding="md">
          <CheckCircle className="w-4 h-4 text-emerald-500 mb-2" />
          <div className="font-display text-2xl text-ios-label dark:text-iosDark-label leading-none">
            {aggregate.closedCount}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-ios-label2 dark:text-iosDark-label2 mt-1">
            Cerrados
          </div>
        </GlassCard>
        <GlassCard variant="solid" padding="md">
          <Scissors className="w-4 h-4 text-blue-500 mb-2" />
          <div className="font-display text-2xl text-ios-label dark:text-iosDark-label leading-none">
            {aggregate.totalCuts}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-ios-label2 dark:text-iosDark-label2 mt-1">
            Cortes totales
          </div>
        </GlassCard>
        <GlassCard variant="solid" padding="md">
          <DollarSign className="w-4 h-4 text-emerald-500 mb-2" />
          <div className="font-display text-2xl text-ios-label dark:text-iosDark-label leading-none">
            {fmt(aggregate.totalRevenue)}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-ios-label2 dark:text-iosDark-label2 mt-1">
            Revenue
          </div>
        </GlassCard>
      </div>

      {/* Banner de auditorías con diferencia */}
      {aggregate.auditDifferences !== 0 && (
        <GlassCard variant="solid" padding="md" className="border-2 border-amber-300/50 dark:border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-ios-label dark:text-iosDark-label">
                Diferencias de caja en auditorías
              </div>
              <div className="text-[12px] text-ios-label2 dark:text-iosDark-label2">
                {aggregate.withAudit} turnos auditados · diferencia neta:{' '}
                <span className={`font-bold ${aggregate.auditDifferences >= 0 ? 'text-blue-600' : 'text-ios-red'}`}>
                  {aggregate.auditDifferences >= 0 ? '+' : ''}
                  {fmt(aggregate.auditDifferences)}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Filtros */}
      <GlassCard variant="solid" padding="md" className="space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-ios-label2 dark:text-iosDark-label2" />
          <span className="text-[13px] font-semibold text-ios-label dark:text-iosDark-label">Filtros</span>
        </div>

        <SegmentedControl<StatusFilter>
          value={statusFilter}
          onChange={setStatusFilter}
          size="sm"
          segments={[
            { value: 'all', label: 'Todos' },
            { value: 'open', label: 'Abiertos' },
            { value: 'closed', label: 'Cerrados' },
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-[12px] font-medium text-ios-label2 dark:text-iosDark-label2 mb-1.5 ml-1">
              Barbería
            </label>
            <select
              value={shopFilter}
              onChange={(e) => { setShopFilter(e.target.value); setBarberFilter(''); }}
              className="w-full h-11 px-4 rounded-2xl bg-ios-grouped dark:bg-iosDark-grouped text-[14px] text-ios-label dark:text-iosDark-label border border-transparent focus:outline-none focus:border-ios-accent"
            >
              <option value="">Todas</option>
              {barbershops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ios-label2 dark:text-iosDark-label2 mb-1.5 ml-1">
              Barbero
            </label>
            <select
              value={barberFilter}
              onChange={(e) => setBarberFilter(e.target.value)}
              className="w-full h-11 px-4 rounded-2xl bg-ios-grouped dark:bg-iosDark-grouped text-[14px] text-ios-label dark:text-iosDark-label border border-transparent focus:outline-none focus:border-ios-accent"
            >
              <option value="">Todos</option>
              {filteredBarbers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <IOSInput
            label="Fecha"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <IOSInput
          placeholder="Buscar por barbero, barbería o fecha..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          iconLeft={<Search className="w-4 h-4" />}
        />
      </GlassCard>

      {/* Lista de turnos */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-7 h-7" />}
          title="Sin turnos para mostrar"
          description="Probá ajustar los filtros o esperá a que un barbero abra/cierre un turno."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const barber = barbers.find((b) => b.id === c.barberId);
            const shop = barbershops.find((s) => s.id === c.barbershopId);
            const isOpen = c.status === 'OPEN';
            const hasAudit = !!c.cashAudit;
            const auditDiff = c.cashAudit?.difference ?? 0;

            return (
              <button
                key={c.id}
                onClick={() => !isOpen && setSelectedClosing(c)}
                disabled={isOpen}
                className={[
                  'w-full text-left transition-all',
                  !isOpen && 'active:scale-[0.99]',
                ].join(' ')}
              >
                <GlassCard
                  variant="solid"
                  padding="md"
                  className={[
                    'flex items-center gap-3',
                    isOpen ? 'border-2 border-amber-300/60 dark:border-amber-500/30' : '',
                  ].join(' ')}
                >
                  {/* Estado */}
                  <div className="shrink-0">
                    {isOpen ? (
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      </div>
                    )}
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[15px] font-semibold text-ios-label dark:text-iosDark-label truncate">
                        {barber?.name ?? '—'}
                      </span>
                      {barber?.isManager && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-0.5">
                          <ShieldCheck className="w-2.5 h-2.5" /> Encargado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-ios-label2 dark:text-iosDark-label2 flex-wrap">
                      <Store className="w-3 h-3 shrink-0" />
                      <span className="truncate">{shop?.name ?? '—'}</span>
                      <span className="opacity-50">·</span>
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>{fmtDate(c.shiftDate)}</span>
                      <span className="opacity-50">·</span>
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="tabular-nums">
                        {fmtTime(c.startedAt)} → {fmtTime(c.closedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Stats compactos */}
                  <div className="text-right shrink-0">
                    {isOpen ? (
                      <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                        En curso
                      </div>
                    ) : (
                      <>
                        <div className="font-display text-xl text-ios-label dark:text-iosDark-label leading-none tabular-nums">
                          {fmt(c.totalRevenue)}
                        </div>
                        <div className="text-[11px] text-ios-label2 dark:text-iosDark-label2 mt-0.5">
                          {c.totalCuts} cortes
                        </div>
                        {hasAudit && (
                          <div
                            className={`text-[10px] font-bold tabular-nums mt-0.5 flex items-center justify-end gap-0.5 ${
                              auditDiff === 0
                                ? 'text-emerald-600'
                                : auditDiff > 0
                                ? 'text-blue-600'
                                : 'text-ios-red'
                            }`}
                          >
                            <ShieldCheck className="w-2.5 h-2.5" />
                            {auditDiff >= 0 ? '+' : ''}
                            {fmt(auditDiff)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </GlassCard>
              </button>
            );
          })}
        </div>
      )}

      {/* Modal de detalle */}
      {selectedClosing && (
        <ShiftClosingDetailModal
          metadata={buildMetadata(selectedClosing)}
          onClose={() => setSelectedClosing(null)}
        />
      )}
    </div>
  );
};

export default ShiftsView;
