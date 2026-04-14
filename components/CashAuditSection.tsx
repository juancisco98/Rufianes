import React, { useMemo } from 'react';
import { ShieldCheck, Calculator } from 'lucide-react';
import { GlassCard } from './ui';
import { CashAudit } from '../types';

/** Denominaciones de pesos argentinos en orden descendente. */
export const ARS_DENOMINATIONS = [20000, 10000, 2000, 1000, 500, 200, 100, 50, 20, 10] as const;

export interface CashAuditState {
  /** count por denominación: { "10000": 5, ... } — string keys porque vienen del DOM */
  counts: Record<string, number>;
  notes: string;
}

export const emptyCashAuditState = (): CashAuditState => ({
  counts: {},
  notes: '',
});

interface CashAuditSectionProps {
  state: CashAuditState;
  onChange: (next: CashAuditState) => void;
  /** Total esperado en caja según el sistema (cash - gastos efectivo) */
  expectedTotal: number;
}

const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`;

/**
 * CashAuditSection — auditoría manual de caja para el encargado.
 * Conteo de billetes por denominación, comparación con lo esperado por el sistema.
 */
export const CashAuditSection: React.FC<CashAuditSectionProps> = ({
  state,
  onChange,
  expectedTotal,
}) => {
  const countedTotal = useMemo(
    () => ARS_DENOMINATIONS.reduce((sum, d) => sum + (state.counts[String(d)] ?? 0) * d, 0),
    [state.counts]
  );
  const difference = countedTotal - expectedTotal;

  const setCount = (denom: number, count: number) => {
    onChange({
      ...state,
      counts: { ...state.counts, [String(denom)]: Math.max(0, count) },
    });
  };

  return (
    <GlassCard variant="solid" padding="md" className="border-2 border-amber-300/50 dark:border-amber-500/30">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-semibold text-ios-label dark:text-iosDark-label">
            Auditoría de caja
          </h3>
          <p className="text-[11px] text-ios-label2 dark:text-iosDark-label2">
            Encargado · contá los billetes físicos
          </p>
        </div>
      </div>

      {/* Grid de denominaciones */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {ARS_DENOMINATIONS.map((denom) => {
          const count = state.counts[String(denom)] ?? 0;
          const subtotal = count * denom;
          return (
            <div
              key={denom}
              className="flex items-center gap-2 p-2 rounded-xl bg-ios-grouped dark:bg-iosDark-grouped"
            >
              <div className="text-[12px] font-semibold text-ios-label2 dark:text-iosDark-label2 w-12 tabular-nums">
                ${denom >= 1000 ? `${denom / 1000}k` : denom}
              </div>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={count || ''}
                placeholder="0"
                onChange={(e) => setCount(denom, Number(e.target.value) || 0)}
                className="flex-1 w-full h-8 px-2 rounded-lg bg-white dark:bg-iosDark-bg2 border border-transparent focus:border-ios-accent focus:outline-none text-center text-[14px] font-semibold text-ios-label dark:text-iosDark-label"
              />
              {subtotal > 0 && (
                <div className="text-[10px] text-ios-label2 dark:text-iosDark-label2 w-14 text-right tabular-nums">
                  {fmt(subtotal)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resumen */}
      <div className="rounded-xl bg-ios-grouped dark:bg-iosDark-grouped p-3 space-y-1.5 text-[13px]">
        <div className="flex justify-between">
          <span className="text-ios-label2 dark:text-iosDark-label2">Esperado en caja</span>
          <span className="font-semibold text-ios-label dark:text-iosDark-label tabular-nums">
            {fmt(expectedTotal)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-ios-label2 dark:text-iosDark-label2 flex items-center gap-1">
            <Calculator className="w-3 h-3" /> Contado físico
          </span>
          <span className="font-semibold text-ios-label dark:text-iosDark-label tabular-nums">
            {fmt(countedTotal)}
          </span>
        </div>
        <div className="border-t border-ios-divider dark:border-iosDark-divider pt-1.5 flex justify-between items-center">
          <span className="font-semibold text-ios-label dark:text-iosDark-label">Diferencia</span>
          <span
            className={`font-display text-2xl tabular-nums leading-none ${
              difference === 0
                ? 'text-emerald-600'
                : difference > 0
                ? 'text-blue-600'
                : 'text-ios-red'
            }`}
          >
            {difference >= 0 ? '+' : ''}
            {fmt(difference)}
          </span>
        </div>
        {difference !== 0 && (
          <p className="text-[11px] text-ios-label2 dark:text-iosDark-label2 mt-1">
            {difference > 0
              ? '⚠ Sobra plata en caja — verificá si hubo cobro sin registrar'
              : '⚠ Falta plata en caja — verificá gastos sin registrar o errores de tipeo'}
          </p>
        )}
      </div>

      {/* Notas */}
      <textarea
        value={state.notes}
        onChange={(e) => onChange({ ...state, notes: e.target.value })}
        placeholder="Observaciones de la auditoría (opcional)..."
        rows={2}
        className="w-full mt-3 px-3 py-2 rounded-xl bg-ios-grouped dark:bg-iosDark-grouped text-[13px] text-ios-label dark:text-iosDark-label border border-transparent focus:outline-none focus:border-ios-accent resize-none"
      />
    </GlassCard>
  );
};

/** Construye el objeto CashAudit final desde el state UI */
export const buildCashAudit = (
  state: CashAuditState,
  expectedTotal: number,
  auditedBy: string
): CashAudit => {
  const counts = Object.fromEntries(
    Object.entries(state.counts).filter(([, v]) => v > 0)
  );
  const countedTotal = ARS_DENOMINATIONS.reduce(
    (sum, d) => sum + (state.counts[String(d)] ?? 0) * d,
    0
  );
  return {
    denominations: counts,
    countedTotal,
    expectedTotal,
    difference: countedTotal - expectedTotal,
    notes: state.notes.trim() || undefined,
    auditedAt: new Date().toISOString(),
    auditedBy,
  };
};

export default CashAuditSection;
