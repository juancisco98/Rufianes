import React, { useState, useMemo } from 'react';
import { CheckCircle, Plus, Trash2, Trophy, Banknote, CreditCard, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import { ShiftClosing, HaircutSession, ShiftExpense, Barber } from '../types';
import { PAYMENT_METHOD_LABELS } from '../constants';
import { hapticImpact, hapticSuccess, hapticError } from '../utils/haptics';
import {
  BottomSheet,
  GlassButton,
  GlassCard,
  IOSInput,
} from './ui';
import { useLiga } from '../hooks/useLiga';
import { CashAuditSection, emptyCashAuditState, buildCashAudit, CashAuditState } from './CashAuditSection';

interface ShiftClosingModalProps {
  open: boolean;
  closing: ShiftClosing;
  barber?: Barber;            // necesario para detectar si es encargado
  todaySessions: HaircutSession[];
  onClose: (closing: ShiftClosing) => Promise<void>;
  onDismiss: () => void;
}

const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`;

const ShiftClosingModal: React.FC<ShiftClosingModalProps> = ({
  open, closing, barber, todaySessions, onClose, onDismiss,
}) => {
  const isManager = barber?.isManager === true;
  // Totales auto-calculados desde las sesiones
  const computed = useMemo(() => {
    const cash = todaySessions.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + s.price, 0);
    const card = todaySessions.filter(s => s.paymentMethod === 'CARD').reduce((sum, s) => sum + s.price, 0);
    const transfer = todaySessions.filter(s => s.paymentMethod === 'TRANSFER').reduce((sum, s) => sum + s.price, 0);
    const commission = todaySessions.reduce((sum, s) => sum + s.commissionAmt, 0);
    return { cash, card, transfer, total: cash + card + transfer, commission };
  }, [todaySessions]);

  // Comisión + efectivo Liga del día (dados extra cobrados/comisionados hoy por este barbero)
  const {
    getBarberLigaCommissionForDate,
    getBarberLigaRevenueForDate,
    getBarberLigaDiceCountForDate,
  } = useLiga();
  const ligaCommission = getBarberLigaCommissionForDate(closing.barberId, closing.shiftDate);
  const ligaCashRevenue = getBarberLigaRevenueForDate(closing.barberId, closing.shiftDate);
  const ligaDiceCount = getBarberLigaDiceCountForDate(closing.barberId, closing.shiftDate);

  // El efectivo de los dados extra lo cobra el barbero en mano al cliente — se suma al efectivo del día.
  const initialCash = computed.cash + ligaCashRevenue;

  const [totalCash, setTotalCash] = useState(String(initialCash));
  const [totalCard, setTotalCard] = useState(String(computed.card));
  const [totalTransfer, setTotalTransfer] = useState(String(computed.transfer));
  const [expenses, setExpenses] = useState<ShiftExpense[]>([]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [cashAuditState, setCashAuditState] = useState<CashAuditState>(emptyCashAuditState());

  const cashNum = Number(totalCash) || 0;
  const cardNum = Number(totalCard) || 0;
  const transferNum = Number(totalTransfer) || 0;
  const totalRevenue = cashNum + cardNum + transferNum;
  const validExpenses = expenses.filter(e => e.description.trim() && e.amount > 0);
  const totalExpenses = validExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashToHand = cashNum - totalExpenses;
  const totalCommissionWithLiga = computed.commission + ligaCommission;

  const addExpense = () => setExpenses(prev => [...prev, { description: '', amount: 0 }]);
  const removeExpense = (idx: number) => setExpenses(prev => prev.filter((_, i) => i !== idx));
  const updateExpense = (idx: number, field: 'description' | 'amount', value: string) => {
    setExpenses(prev => prev.map((e, i) => i === idx ? { ...e, [field]: field === 'amount' ? Number(value) : value } : e));
  };

  // Validación de gastos antes de cerrar (mejora #8)
  const expensesHaveErrors = expenses.some(e => (e.description.trim() === '') !== (e.amount === 0));

  const handleClose = async () => {
    setSubmitAttempted(true);

    if (expensesHaveErrors) {
      hapticError();
      toast.error('Hay gastos incompletos. Borrá los vacíos o completá la descripción y el monto.');
      return;
    }

    const closedClosing: ShiftClosing = {
      ...closing,
      totalCuts: todaySessions.length,
      totalCash: cashNum,
      totalCard: cardNum,
      totalTransfer: transferNum,
      totalRevenue,
      totalCommission: totalCommissionWithLiga,
      expensesCash: totalExpenses,
      expensesDetail: validExpenses,
      netCashToHand,
      cashAudit: isManager
        ? buildCashAudit(cashAuditState, netCashToHand, closing.barberId)
        : undefined,
      notes: notes.trim() || undefined,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    hapticImpact();
    try {
      await onClose(closedClosing);
      hapticSuccess();
      toast.success(`Turno cerrado — ${todaySessions.length} cortes · ${fmt(totalRevenue)}`);
      onDismiss();
    } catch (error: any) {
      hapticError();
      toast.error(`Error al cerrar turno: ${error?.code ?? ''} ${error?.message ?? 'Error desconocido'}`);
      // NO cerrar el modal — Lección 5
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onDismiss}
      title="Cierre de turno"
      subtitle={`${closing.shiftDate} · ${todaySessions.length} cortes`}
      maxHeightVh={94}
      footer={
        <GlassButton
          variant="success"
          size="xl"
          fullWidth
          loading={isSaving}
          onClick={handleClose}
          iconLeft={<CheckCircle className="w-5 h-5" />}
        >
          Cerrar turno · {fmt(netCashToHand)}
        </GlassButton>
      }
    >
      <div className="px-5 py-4 space-y-4">
        {/* Sesiones del día (resumen) */}
        {todaySessions.length > 0 && (
          <GlassCard variant="solid" padding="md">
            <h3 className="text-[13px] font-semibold text-ios-label2 dark:text-iosDark-label2 uppercase tracking-wide mb-2">
              Cortes del turno
            </h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {todaySessions.map((s, idx) => (
                <div key={s.id} className="flex items-center justify-between text-[13px] px-2 py-1.5 rounded-lg">
                  <span className="text-ios-label dark:text-iosDark-label truncate">
                    {idx + 1}. {s.clientName ?? 'Sin nombre'} — {s.serviceName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-ios-label2 dark:text-iosDark-label2 text-[11px]">
                      {PAYMENT_METHOD_LABELS[s.paymentMethod]}
                    </span>
                    <span className="font-semibold text-ios-label dark:text-iosDark-label">
                      {fmt(s.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Totales por método de pago */}
        <div>
          <h3 className="text-[13px] font-semibold text-ios-label2 dark:text-iosDark-label2 uppercase tracking-wide mb-2 ml-1">
            Totales por método de pago
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <IOSInput
              label="Efectivo"
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              value={totalCash}
              onChange={e => setTotalCash(e.target.value)}
              iconLeft={<Banknote className="w-3.5 h-3.5 text-emerald-500" />}
            />
            <IOSInput
              label="Tarjeta"
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              value={totalCard}
              onChange={e => setTotalCard(e.target.value)}
              iconLeft={<CreditCard className="w-3.5 h-3.5 text-blue-500" />}
            />
            <IOSInput
              label="Transfer."
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              value={totalTransfer}
              onChange={e => setTotalTransfer(e.target.value)}
              iconLeft={<ArrowLeftRight className="w-3.5 h-3.5 text-violet-500" />}
            />
          </div>
          {ligaCashRevenue > 0 && (
            <div className="mt-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Trophy className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold">
                  Efectivo del día = servicios {fmt(computed.cash)} + dados extra {fmt(ligaCashRevenue)}
                </div>
                <div className="mt-0.5 text-amber-700/80 dark:text-amber-400/80">
                  Vendiste {ligaDiceCount} dado{ligaDiceCount !== 1 ? 's' : ''} extra. Tu comisión ({fmt(ligaCommission)}) la cobrás aparte; el resto va a caja.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gastos */}
        <GlassCard variant="solid" padding="md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold text-ios-label dark:text-iosDark-label">Gastos del turno</h3>
            <GlassButton size="sm" variant="ghost" iconLeft={<Plus className="w-3.5 h-3.5" />} onClick={addExpense}>
              Agregar
            </GlassButton>
          </div>
          {expenses.length === 0 ? (
            <p className="text-[12px] text-ios-label2 dark:text-iosDark-label2 text-center py-2">
              Sin gastos registrados
            </p>
          ) : (
            <div className="space-y-2">
              {expenses.map((exp, idx) => {
                const incomplete = submitAttempted && (exp.description.trim() === '' || exp.amount <= 0);
                return (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Descripción"
                      value={exp.description}
                      onChange={e => updateExpense(idx, 'description', e.target.value)}
                      className={[
                        'flex-1 h-10 px-3 rounded-xl text-[14px]',
                        'bg-ios-grouped dark:bg-iosDark-grouped',
                        'text-ios-label dark:text-iosDark-label',
                        'border border-transparent focus:outline-none focus:border-ios-accent',
                        incomplete && exp.description.trim() === '' ? '!border-ios-red' : '',
                      ].join(' ')}
                    />
                    <input
                      type="number"
                      placeholder="$"
                      min={0}
                      value={exp.amount || ''}
                      onChange={e => updateExpense(idx, 'amount', e.target.value)}
                      className={[
                        'w-24 h-10 px-3 rounded-xl text-[14px]',
                        'bg-ios-grouped dark:bg-iosDark-grouped',
                        'text-ios-label dark:text-iosDark-label',
                        'border border-transparent focus:outline-none focus:border-ios-accent',
                        incomplete && exp.amount <= 0 ? '!border-ios-red' : '',
                      ].join(' ')}
                    />
                    <button
                      type="button"
                      onClick={() => removeExpense(idx)}
                      className="w-10 h-10 rounded-xl bg-ios-grouped dark:bg-iosDark-grouped flex items-center justify-center text-ios-red active:scale-90 transition-transform"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Notas */}
        <IOSInput
          label="Notas del turno"
          placeholder="Observaciones..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        {/* Auditoría de caja (solo encargado) */}
        {isManager && (
          <CashAuditSection
            state={cashAuditState}
            onChange={setCashAuditState}
            expectedTotal={netCashToHand}
          />
        )}

        {/* Balance */}
        <GlassCard variant="tinted" padding="md">
          <h3 className="text-[13px] font-semibold text-ios-label2 dark:text-iosDark-label2 uppercase tracking-wide mb-3">
            Balance de caja
          </h3>
          <div className="space-y-1.5 text-[13px]">
            <Row label="Efectivo recibido" value={fmt(cashNum)} className="text-emerald-600" />
            <Row label="Tarjeta recibida" value={fmt(cardNum)} className="text-blue-600" />
            <Row label="Transferencias" value={fmt(transferNum)} className="text-violet-600" />
            <div className="border-t border-amber-200/50 dark:border-amber-500/20 pt-1.5">
              <Row label="Revenue total" value={fmt(totalRevenue)} bold />
            </div>
            <div className="border-t border-amber-200/50 dark:border-amber-500/20 pt-1.5">
              <Row
                label={`Comisión cortes (${Math.round((computed.commission / (totalRevenue || 1)) * 100)}%)`}
                value={fmt(computed.commission)}
                className="text-amber-600"
              />
              {ligaCommission > 0 && (
                <Row
                  label={
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-600" /> Comisión Liga (dados extra)
                    </span>
                  }
                  value={fmt(ligaCommission)}
                  className="text-amber-600"
                />
              )}
              {totalExpenses > 0 && (
                <Row label="Gastos del turno" value={`-${fmt(totalExpenses)}`} className="text-ios-red" />
              )}
            </div>
            <div className="border-t-2 border-amber-300/60 dark:border-amber-500/40 pt-2 mt-1">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[14px] font-semibold text-ios-label dark:text-iosDark-label">
                    Efectivo a entregar
                  </div>
                  <div className="text-[10px] text-ios-label2 dark:text-iosDark-label2">
                    Efectivo − Gastos
                  </div>
                </div>
                <span className={`font-display text-3xl leading-none ${netCashToHand >= 0 ? 'text-amber-600' : 'text-ios-red'}`}>
                  {fmt(netCashToHand)}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </BottomSheet>
  );
};

const Row: React.FC<{
  label: React.ReactNode;
  value: string;
  bold?: boolean;
  className?: string;
}> = ({ label, value, bold, className = '' }) => (
  <div className="flex justify-between items-center">
    <span className="text-ios-label2 dark:text-iosDark-label2">{label}</span>
    <span className={`tabular-nums ${bold ? 'font-bold text-ios-label dark:text-iosDark-label' : 'font-semibold'} ${className}`}>
      {value}
    </span>
  </div>
);

export default ShiftClosingModal;
