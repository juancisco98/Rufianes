/**
 * RUFIANES — Mappers DB ↔ App
 *
 * Convención:
 *  dbTo*   → Supabase row (snake_case) → App interface (camelCase)
 *  *ToDb   → App interface (camelCase) → Supabase payload (snake_case)
 */

import {
  Barbershop,
  Barber,
  Service,
  Client,
  HaircutSession,
  ShiftClosing,
  AppNotification,
  PaymentMethod,
  NotificationType,
  WeekSchedule,
  ShiftClosingMetadata,
  CashAudit,
  LigaEntry,
  LigaConfig,
  LigaClient,
  LigaMonthlyClosing,
} from '../types';

import {
  DbBarbershopRow,
  DbBarberRow,
  DbServiceRow,
  DbClientRow,
  DbHaircutSessionRow,
  DbShiftClosingRow,
  DbNotificationRow,
  DbLigaEntryRow,
  DbLigaConfigRow,
  DbLigaClientRow,
  DbLigaMonthlyClosingRow,
} from '../types/dbRows';

// ─── BARBERSHOP ───────────────────────────────────────────────────────────────

export const dbToBarbershop = (row: DbBarbershopRow): Barbershop => ({
  id: row.id,
  name: row.name,
  address: row.address,
  coordinates: row.coordinates,
  neighborhood: row.neighborhood ?? undefined,
  phone: row.phone ?? undefined,
  imageUrl: row.image_url ?? undefined,
  isActive: row.is_active,
  managerName: row.manager_name ?? undefined,
  notes: row.notes ?? undefined,
  chairCount: row.chair_count ?? undefined,
  openingHours: row.opening_hours
    ? (row.opening_hours as unknown as WeekSchedule)
    : undefined,
  ligaEnabled: row.liga_enabled ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const barbershopToDb = (shop: Barbershop): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    id: shop.id,
    name: shop.name,
    address: shop.address,
    coordinates: shop.coordinates,
    neighborhood: shop.neighborhood ?? null,
    phone: shop.phone ?? null,
    image_url: shop.imageUrl ?? null,
    is_active: shop.isActive,
    manager_name: shop.managerName ?? null,
    notes: shop.notes ?? null,
  };
  // Solo incluir si la columna existe (requiere migración SQL en Supabase)
  if (shop.chairCount !== undefined) payload.chair_count = shop.chairCount;
  if (shop.openingHours !== undefined) payload.opening_hours = shop.openingHours;
  if (shop.ligaEnabled !== undefined) payload.liga_enabled = shop.ligaEnabled;
  return payload;
};

// ─── LIGA ENTRY ───────────────────────────────────────────────────────────────

export const dbToLigaEntry = (row: DbLigaEntryRow): LigaEntry => {
  const d1 = row.dice_1 ?? undefined;
  const d2 = row.dice_2 ?? undefined;
  const d3 = row.dice_3 ?? undefined;
  const sumFromIndividual = (d1 ?? 0) + (d2 ?? 0) + (d3 ?? 0);
  return {
    id: row.id,
    sessionId: row.session_id,
    barbershopId: row.barbershop_id,
    barberId: row.barber_id,
    clientName: row.client_name,
    clientPhone: row.client_phone ?? undefined,
    ligaClientId: row.liga_client_id ?? undefined,
    month: row.month,
    dice1: d1,
    dice2: d2,
    dice3: d3,
    diceSum: row.dice_sum ?? sumFromIndividual,
    isService: row.is_service ?? true,
    servicePoints: row.service_points,
    extraDiceCount: row.extra_dice_count,
    extraDicePoints: row.extra_dice_points,
    extraDiceRevenue: Number(row.extra_dice_revenue),
    extraDiceCommission: Number(row.extra_dice_commission),
    totalPoints: row.total_points,
    createdAt: row.created_at,
  };
};

export const ligaEntryToDb = (e: LigaEntry): Record<string, unknown> => {
  // Lección 10: campos nuevos (dice_sum, is_service) se omiten si undefined
  // para no romper si la migración aún no corrió.
  const payload: Record<string, unknown> = {
    id: e.id,
    session_id: e.sessionId,
    barbershop_id: e.barbershopId,
    barber_id: e.barberId,
    client_name: e.clientName.trim(),
    client_phone: e.clientPhone ?? null,
    month: e.month,
    service_points: e.servicePoints,
    extra_dice_count: e.extraDiceCount,
    extra_dice_points: e.extraDicePoints,
    extra_dice_revenue: e.extraDiceRevenue,
    extra_dice_commission: e.extraDiceCommission,
    // total_points es GENERATED en DB — NO enviar
  };
  if (e.diceSum !== undefined) payload.dice_sum = e.diceSum;
  if (e.isService !== undefined) payload.is_service = e.isService;
  if (e.dice1 !== undefined) payload.dice_1 = e.dice1;
  if (e.dice2 !== undefined) payload.dice_2 = e.dice2;
  if (e.dice3 !== undefined) payload.dice_3 = e.dice3;
  if (e.ligaClientId !== undefined) payload.liga_client_id = e.ligaClientId;
  return payload;
};

// ─── LIGA CLIENT ──────────────────────────────────────────────────────────────

export const dbToLigaClient = (row: DbLigaClientRow): LigaClient => ({
  id: row.id,
  barbershopId: row.barbershop_id,
  code: row.code,
  name: row.name,
  phone: row.phone ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
});

export const ligaClientToDb = (c: LigaClient): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    id: c.id,
    barbershop_id: c.barbershopId,
    code: c.code,
    name: c.name.trim(),
  };
  if (c.phone !== undefined) payload.phone = c.phone.trim() || null;
  if (c.notes !== undefined) payload.notes = c.notes.trim() || null;
  return payload;
};

// ─── LIGA CONFIG ──────────────────────────────────────────────────────────────

export const dbToLigaConfig = (row: DbLigaConfigRow): LigaConfig => ({
  barbershopId: row.barbershop_id,
  serviceMultiplier: row.service_multiplier,
  extraDieCost: Number(row.extra_die_cost),
  extraDieCommission: Number(row.extra_die_commission),
  prize1: Number(row.prize_1),
  prize2: Number(row.prize_2),
  prize3: Number(row.prize_3),
  prizeLabel: row.prize_label,
  isActive: row.is_active,
  workingDaysPerMonth: row.working_days_per_month ?? undefined,
  monthlyGoal: row.monthly_goal != null ? Number(row.monthly_goal) : undefined,
  updatedAt: row.updated_at,
});

export const ligaConfigToDb = (c: LigaConfig): Record<string, unknown> => {
  // Lección 10: los campos opcionales que dependen de migraciones se omiten
  // si son undefined (no se envían como null) para evitar errores de schema.
  const payload: Record<string, unknown> = {
    barbershop_id: c.barbershopId,
    service_multiplier: c.serviceMultiplier,
    extra_die_cost: c.extraDieCost,
    extra_die_commission: c.extraDieCommission,
    prize_1: c.prize1,
    prize_2: c.prize2,
    prize_3: c.prize3,
    prize_label: c.prizeLabel,
    is_active: c.isActive,
    updated_at: new Date().toISOString(),
  };
  if (c.workingDaysPerMonth !== undefined) payload.working_days_per_month = c.workingDaysPerMonth;
  if (c.monthlyGoal !== undefined) payload.monthly_goal = c.monthlyGoal;
  return payload;
};

// ─── LIGA MONTHLY CLOSING ─────────────────────────────────────────────────────

export const dbToLigaMonthlyClosing = (row: DbLigaMonthlyClosingRow): LigaMonthlyClosing => ({
  id: row.id,
  barbershopId: row.barbershop_id,
  month: row.month,
  podium: row.podium ?? [],
  totalRevenue: Number(row.total_revenue),
  totalCommission: Number(row.total_commission),
  totalPrizes: Number(row.total_prizes),
  net: Number(row.net),
  closedAt: row.closed_at,
  closedBy: row.closed_by ?? undefined,
});

export const ligaMonthlyClosingToDb = (c: LigaMonthlyClosing): Record<string, unknown> => ({
  id: c.id,
  barbershop_id: c.barbershopId,
  month: c.month,
  podium: c.podium,
  total_revenue: c.totalRevenue,
  total_commission: c.totalCommission,
  total_prizes: c.totalPrizes,
  net: c.net,
  closed_at: c.closedAt,
  closed_by: c.closedBy ?? null,
});

// ─── BARBER ───────────────────────────────────────────────────────────────────

export const dbToBarber = (row: DbBarberRow): Barber => ({
  id: row.id,
  barbershopId: row.barbershop_id,
  name: row.name,
  phone: row.phone ?? undefined,
  email: row.email ?? undefined,
  photoUrl: row.photo_url ?? undefined,
  specialties: row.specialties ?? [],
  commissionPct: Number(row.commission_pct),
  isActive: row.is_active,
  isManager: row.is_manager ?? undefined,
  hireDate: row.hire_date ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
});

export const barberToDb = (barber: Barber): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    id: barber.id,
    barbershop_id: barber.barbershopId,
    name: barber.name,
    phone: barber.phone ?? null,
    email: barber.email ? barber.email.trim().toLowerCase() : null,
    photo_url: barber.photoUrl ?? null,
    specialties: barber.specialties,
    commission_pct: barber.commissionPct,
    is_active: barber.isActive,
    hire_date: barber.hireDate ?? null,
    notes: barber.notes ?? null,
  };
  // Solo incluir si la columna existe (requiere migración 20260408_manager_and_cash_audit)
  if (barber.isManager !== undefined) payload.is_manager = barber.isManager;
  return payload;
};

// ─── SERVICE ──────────────────────────────────────────────────────────────────

export const dbToService = (row: DbServiceRow): Service => ({
  id: row.id,
  barbershopId: row.barbershop_id ?? undefined,
  name: row.name,
  description: row.description ?? undefined,
  basePrice: Number(row.base_price),
  durationMins: row.duration_mins,
  isActive: row.is_active,
  createdAt: row.created_at,
});

export const serviceToDb = (service: Service): Record<string, unknown> => ({
  id: service.id,
  barbershop_id: service.barbershopId ?? null,
  name: service.name,
  description: service.description ?? null,
  base_price: service.basePrice,
  duration_mins: service.durationMins,
  is_active: service.isActive,
});

// ─── CLIENT ───────────────────────────────────────────────────────────────────

export const dbToClient = (row: DbClientRow): Client => ({
  id: row.id,
  barbershopId: row.barbershop_id ?? undefined,
  name: row.name,
  phone: row.phone ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
});

export const clientToDb = (client: Client): Record<string, unknown> => ({
  id: client.id,
  barbershop_id: client.barbershopId ?? null,
  name: client.name,
  phone: client.phone ?? null,
  notes: client.notes ?? null,
});

// ─── HAIRCUT SESSION ──────────────────────────────────────────────────────────

export const dbToHaircutSession = (row: DbHaircutSessionRow): HaircutSession => ({
  id: row.id,
  barbershopId: row.barbershop_id,
  barberId: row.barber_id,
  clientId: row.client_id ?? undefined,
  clientName: row.client_name ?? undefined,
  serviceId: row.service_id ?? undefined,
  serviceName: row.service_name,
  price: Number(row.price),
  commissionPct: Number(row.commission_pct),
  commissionAmt: Number(row.commission_amt),
  paymentMethod: row.payment_method as PaymentMethod,
  startedAt: row.started_at,
  endedAt: row.ended_at ?? undefined,
  durationMins: row.duration_mins ?? undefined,
  shiftClosingId: row.shift_closing_id ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
});

export const haircutSessionToDb = (session: HaircutSession): Record<string, unknown> => ({
  id: session.id,
  barbershop_id: session.barbershopId,
  barber_id: session.barberId,
  client_id: session.clientId ?? null,
  client_name: session.clientName ?? null,
  service_id: session.serviceId ?? null,
  service_name: session.serviceName,
  price: session.price,
  commission_pct: session.commissionPct,
  commission_amt: session.commissionAmt,
  payment_method: session.paymentMethod,
  started_at: session.startedAt,
  ended_at: session.endedAt ?? null,
  duration_mins: session.durationMins ?? null,
  shift_closing_id: session.shiftClosingId ?? null,
  notes: session.notes ?? null,
});

// ─── SHIFT CLOSING ────────────────────────────────────────────────────────────

export const dbToShiftClosing = (row: DbShiftClosingRow): ShiftClosing => ({
  id: row.id,
  barbershopId: row.barbershop_id,
  barberId: row.barber_id,
  shiftDate: row.shift_date,
  startedAt: row.started_at ?? undefined,
  closedAt: row.closed_at,
  totalCuts: row.total_cuts,
  totalCash: Number(row.total_cash),
  totalCard: Number(row.total_card),
  totalTransfer: Number(row.total_transfer),
  totalRevenue: Number(row.total_revenue),
  totalCommission: Number(row.total_commission),
  expensesCash: Number(row.expenses_cash),
  expensesDetail: row.expenses_detail ?? [],
  netCashToHand: row.net_cash_to_hand != null ? Number(row.net_cash_to_hand) : undefined,
  cashAudit: row.cash_audit ? (row.cash_audit as unknown as CashAudit) : undefined,
  notes: row.notes ?? undefined,
  status: row.status as 'OPEN' | 'CLOSED',
  createdAt: row.created_at,
});

export const shiftClosingToDb = (closing: ShiftClosing): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    id: closing.id,
    barbershop_id: closing.barbershopId,
    barber_id: closing.barberId,
    shift_date: closing.shiftDate,
    started_at: closing.startedAt ?? null,
    closed_at: closing.closedAt,
    total_cuts: closing.totalCuts,
    total_cash: closing.totalCash,
    total_card: closing.totalCard,
    total_transfer: closing.totalTransfer,
    total_revenue: closing.totalRevenue,
    total_commission: closing.totalCommission,
    expenses_cash: closing.expensesCash,
    expenses_detail: closing.expensesDetail,
    net_cash_to_hand: closing.netCashToHand ?? null,
    notes: closing.notes ?? null,
    status: closing.status,
  };
  if (closing.cashAudit !== undefined) payload.cash_audit = closing.cashAudit;
  return payload;
};

// ─── NOTIFICATION ─────────────────────────────────────────────────────────────

export const dbToNotification = (row: DbNotificationRow): AppNotification => ({
  id: row.id,
  recipientEmail: row.recipient_email,
  title: row.title,
  message: row.message,
  type: row.type as NotificationType,
  relatedId: row.related_id ?? undefined,
  read: row.read,
  createdAt: row.created_at,
  metadata: row.metadata as unknown as ShiftClosingMetadata | undefined,
});

export const notificationToDb = (n: AppNotification): Record<string, unknown> => ({
  id: n.id,
  recipient_email: n.recipientEmail,
  type: n.type,
  title: n.title,
  message: n.message,
  related_id: n.relatedId ?? null,
  read: n.read,
  created_at: n.createdAt,
  metadata: n.metadata ?? null,
});
