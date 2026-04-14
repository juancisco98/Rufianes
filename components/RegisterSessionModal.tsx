import React, { useEffect, useMemo, useState } from 'react';
import { Scissors, DollarSign, User, Banknote, CreditCard, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  HaircutSession,
  Barber,
  Service,
  PaymentMethod,
  Barbershop,
  LigaEntry,
} from '../types';
import { PAYMENT_METHOD_LABELS } from '../constants';
import { generateUUID } from '../utils/uuid';
import { hapticImpact, hapticSuccess, hapticError } from '../utils/haptics';
import {
  BottomSheet,
  GlassButton,
  GlassCard,
  IOSInput,
  SegmentedControl,
} from './ui';
import { LigaSection, emptyLigaState, isLigaSectionValid, LigaSectionState } from './liga/LigaSection';
import { useLiga } from '../hooks/useLiga';

interface RegisterSessionModalProps {
  barber: Barber;
  barbershop?: Barbershop;
  services: Service[];
  open: boolean;
  onSave: (session: HaircutSession) => Promise<void>;
  onClose: () => void;
}

const PAYMENT_ICONS: Record<PaymentMethod, React.ReactNode> = {
  CASH: <Banknote className="w-3.5 h-3.5" />,
  CARD: <CreditCard className="w-3.5 h-3.5" />,
  TRANSFER: <ArrowLeftRight className="w-3.5 h-3.5" />,
};

const RegisterSessionModal: React.FC<RegisterSessionModalProps> = ({
  barber,
  barbershop,
  services,
  open,
  onSave,
  onClose,
}) => {
  // ── Estado del corte ────────────────────────────────────────────────────────
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // ── Liga (si la barbería la tiene activa) ───────────────────────────────────
  const ligaActive = barbershop?.ligaEnabled === true;
  const { getConfig, buildLigaEntry, registerLigaEntry } = useLiga();
  const ligaConfig = ligaActive && barbershop ? getConfig(barbershop.id) : null;
  const [ligaState, setLigaState] = useState<LigaSectionState>(emptyLigaState());

  // ── Reset al cerrar/abrir ───────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setSelectedServiceId('');
      setCustomPrice('');
      setPaymentMethod('CASH');
      setNotes('');
      setLigaState(emptyLigaState());
      setSubmitAttempted(false);
    }
  }, [open]);

  // Precio efectivo
  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId),
    [services, selectedServiceId]
  );
  const effectivePrice = customPrice !== '' ? Number(customPrice) : selectedService?.basePrice ?? 0;
  const commissionAmt = Math.round((effectivePrice * barber.commissionPct) / 100);

  // Auto-fill price desde servicio
  useEffect(() => {
    if (selectedService) setCustomPrice(String(selectedService.basePrice));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceId]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitAttempted(true);

    if (effectivePrice <= 0) {
      hapticError();
      toast.error('El precio debe ser mayor a 0.');
      return;
    }
    if (ligaActive && !isLigaSectionValid(ligaState)) {
      hapticError();
      toast.error('Completá los datos de la Liga (cliente y todos los dados).');
      return;
    }

    const serviceName = selectedService?.name ?? 'Servicio libre';
    const now = new Date().toISOString();
    const sessionId = generateUUID();
    // durationMins: usamos la duración del servicio si existe; si no, dejamos undefined
    // (Lección: NO usar el tiempo entre apertura del modal y submit, se infla)
    const durationMins = selectedService?.durationMins ?? undefined;

    const session: HaircutSession = {
      id: sessionId,
      barbershopId: barber.barbershopId,
      barberId: barber.id,
      clientName: ligaActive
        ? ligaState.clientNameSnapshot.trim() || undefined
        : undefined,
      serviceId: selectedServiceId || undefined,
      serviceName,
      price: effectivePrice,
      commissionPct: barber.commissionPct,
      commissionAmt,
      paymentMethod,
      startedAt: now,
      endedAt: now,
      durationMins,
      notes: notes.trim() || undefined,
    };

    setIsSaving(true);
    hapticImpact();
    try {
      await onSave(session);

      // Si la liga está activa, registrar la entry vinculada
      if (ligaActive && ligaConfig && barbershop) {
        try {
          const entry: LigaEntry = buildLigaEntry({
            sessionId,
            barbershopId: barbershop.id,
            barberId: barber.id,
            clientName: ligaState.clientNameSnapshot,
            clientPhone: ligaState.clientPhoneSnapshot || undefined,
            ligaClientId: ligaState.ligaClientId as string,
            diceSum: ligaState.diceSum as number,
            isService: ligaState.isService,
            extraDiceCount: ligaState.extraDiceCount,
            extraDiceSum: ligaState.extraDiceSum ?? 0,
          });
          await registerLigaEntry(entry);
          toast.success(
            `Corte registrado · ${entry.totalPoints} pts en la Liga 🏆`,
            {
              description: `Comisión: $${(commissionAmt + entry.extraDiceCommission).toLocaleString('es-AR')}`,
            }
          );
        } catch (ligaErr: any) {
          // El corte ya se guardó. NO cerrar el modal — el admin puede arreglar después
          toast.error(
            `El corte se guardó pero falló la Liga: ${ligaErr?.code ?? ''} ${ligaErr?.message ?? 'error'}`,
            { duration: 8000 }
          );
          setIsSaving(false);
          return;
        }
      } else {
        toast.success(
          `Corte registrado — $${effectivePrice.toLocaleString('es-AR')}`,
          { description: `Comisión: $${commissionAmt.toLocaleString('es-AR')}` }
        );
      }

      hapticSuccess();
      onClose();
    } catch (error: any) {
      hapticError();
      toast.error(`Error al registrar: ${error?.code ?? ''} ${error?.message ?? 'Error desconocido'}`);
      // NO cerrar el modal — Lección 5
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Registrar corte"
      subtitle={`${barber.name} · ${barber.commissionPct}% comisión`}
      maxHeightVh={94}
      footer={
        <GlassButton
          variant="primary"
          size="xl"
          fullWidth
          loading={isSaving}
          onClick={handleSubmit}
          iconLeft={<Scissors className="w-5 h-5" />}
        >
          Registrar · ${effectivePrice.toLocaleString('es-AR')}
        </GlassButton>
      }
    >
      <div className="px-5 py-4 space-y-4">
        {/* Cliente (solo cuando NO hay liga, porque la liga ya pide nombre) */}
        {!ligaActive && (
          <IOSInput
            label="Cliente"
            iconLeft={<User className="w-4 h-4" />}
            placeholder="Nombre (opcional)"
            value={''}
            onChange={() => { /* sin liga, no usamos clientName aquí */ }}
            disabled
          />
        )}

        {/* Servicio + Precio */}
        <GlassCard variant="solid" padding="md" className="space-y-3">
          <div>
            <label className="block text-[13px] font-medium text-ios-label2 dark:text-iosDark-label2 mb-1.5 ml-1">
              Servicio
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full h-11 px-4 rounded-2xl bg-ios-grouped dark:bg-iosDark-grouped text-[15px] text-ios-label dark:text-iosDark-label border border-transparent focus:outline-none focus:border-ios-accent focus:bg-white dark:focus:bg-iosDark-bg2"
            >
              <option value="">— Precio libre —</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — ${s.basePrice.toLocaleString('es-AR')}
                </option>
              ))}
            </select>
          </div>

          <IOSInput
            label="Precio"
            iconLeft={<DollarSign className="w-4 h-4" />}
            type="number"
            inputMode="numeric"
            min={0}
            step={50}
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            placeholder="0"
            error={submitAttempted && effectivePrice <= 0 ? 'Debe ser mayor a 0' : undefined}
            helper={
              effectivePrice > 0
                ? `Tu comisión: $${commissionAmt.toLocaleString('es-AR')} (${barber.commissionPct}%)`
                : undefined
            }
          />
        </GlassCard>

        {/* Método de pago */}
        <div>
          <label className="block text-[13px] font-medium text-ios-label2 dark:text-iosDark-label2 mb-1.5 ml-1">
            Método de pago
          </label>
          <SegmentedControl<PaymentMethod>
            value={paymentMethod}
            onChange={setPaymentMethod}
            segments={(['CASH', 'CARD', 'TRANSFER'] as PaymentMethod[]).map((m) => ({
              value: m,
              label: PAYMENT_METHOD_LABELS[m],
              icon: PAYMENT_ICONS[m],
            }))}
          />
        </div>

        {/* Notas */}
        <IOSInput
          label="Notas"
          placeholder="Fade bajo, barba perfilada..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Liga */}
        {ligaActive && ligaConfig && barbershop && (
          <LigaSection
            barbershopId={barbershop.id}
            config={ligaConfig}
            state={ligaState}
            onChange={setLigaState}
            showClientError={submitAttempted}
          />
        )}
      </div>
    </BottomSheet>
  );
};

export default RegisterSessionModal;
