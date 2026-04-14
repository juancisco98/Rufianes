// ─────────────────────────────────────────────
// RUFIANES — Tipos de la aplicación (camelCase)
// ─────────────────────────────────────────────

// ── USUARIOS ──

export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  role: 'ADMIN' | 'BARBER';
  barberId?: string;       // presente cuando role === 'BARBER'
  barbershopId?: string;   // barbería de origen del barbero
}

// ── BARBERÍAS ──

export interface DayHours {
  open: string;    // "HH:mm"
  close: string;   // "HH:mm"
  isOpen: boolean;
}

export type WeekSchedule = {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
};

export const DEFAULT_WEEK_SCHEDULE: WeekSchedule = {
  mon: { open: '09:00', close: '20:00', isOpen: false },
  tue: { open: '09:00', close: '20:00', isOpen: true },
  wed: { open: '09:00', close: '20:00', isOpen: true },
  thu: { open: '09:00', close: '20:00', isOpen: true },
  fri: { open: '09:00', close: '20:00', isOpen: true },
  sat: { open: '09:00', close: '20:00', isOpen: true },
  sun: { open: '09:00', close: '20:00', isOpen: false },
};

export interface Barbershop {
  id: string;
  name: string;
  address: string;
  coordinates: [number, number]; // [lat, lng]
  neighborhood?: string;
  phone?: string;
  imageUrl?: string;
  isActive: boolean;
  managerName?: string;
  notes?: string;
  chairCount?: number;
  openingHours?: WeekSchedule;
  ligaEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ── LA LIGA DEL CORTE ──

export interface LigaEntry {
  id: string;
  sessionId: string;
  barbershopId: string;
  barberId: string;
  clientName: string;
  clientPhone?: string;
  month: string;                     // "YYYY-MM"
  ligaClientId?: string;             // FK a liga_clients (opcional por compat con filas viejas)
  dice1?: number;                    // legacy — valores individuales (filas viejas)
  dice2?: number;
  dice3?: number;
  diceSum: number;                   // suma total de la tirada (3–18 para 3 dados)
  isService: boolean;                // true = CORTE (aplica multiplicador), false = NO CORTE (1×)
  servicePoints: number;             // diceSum * (isService ? multiplier : 1)
  extraDiceCount: number;
  extraDicePoints: number;           // suma plana de los valores
  extraDiceRevenue: number;          // count * extraDieCost
  extraDiceCommission: number;       // count * extraDieCommission
  totalPoints: number;               // GENERATED en DB
  createdAt: string;
}

export interface LigaConfig {
  barbershopId: string;
  serviceMultiplier: number;
  extraDieCost: number;
  extraDieCommission: number;
  prize1: number;
  prize2: number;
  prize3: number;
  prizeLabel: string;
  isActive: boolean;
  workingDaysPerMonth?: number;   // default 26 — usado en el simulador "Números Reales"
  monthlyGoal?: number;            // default 1_000_000 — meta mensual de sueldo del barbero
  updatedAt?: string;
}

export interface LigaClient {
  id: string;
  barbershopId: string;
  code: string;              // 4 dígitos "0001"–"9999"
  name: string;
  phone?: string;
  notes?: string;
  createdAt?: string;
}

export interface LigaPodiumEntry {
  rank: number;
  clientName: string;
  points: number;
  prize: number;
}

export interface LigaMonthlyClosing {
  id: string;
  barbershopId: string;
  month: string;
  podium: LigaPodiumEntry[];
  totalRevenue: number;
  totalCommission: number;
  totalPrizes: number;
  net: number;
  closedAt: string;
  closedBy?: string;
}

export interface LigaLeaderboardRow {
  rank: number;
  ligaClientId?: string;             // undefined para filas viejas sin ficha
  clientCode?: string;                // 4 dígitos si hay ficha asociada
  clientName: string;
  clientPhone?: string;
  totalPoints: number;
  visits: number;
  extraDiceBought: number;
  lastVisit: string;
  reachedTopAt: string;              // para desempate (primero en alcanzar puntaje)
}

export interface LigaSummary {
  barbershopId: string;
  month: string;
  totalEntries: number;
  totalPoints: number;
  totalExtraDiceSold: number;
  totalRevenue: number;
  totalCommission: number;
  uniqueClients: number;
}

// ── BARBEROS ──

export interface Barber {
  id: string;
  barbershopId: string;
  name: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  specialties: string[];
  commissionPct: number;   // 0–100
  isActive: boolean;
  isManager?: boolean;     // encargado de sucursal — hace auditoría de caja al cerrar turno
  hireDate?: string;
  notes?: string;
  createdAt?: string;
}

// ── SERVICIOS ──

export interface Service {
  id: string;
  barbershopId?: string;   // null = global para todas las barberías
  name: string;
  description?: string;
  basePrice: number;
  durationMins: number;
  isActive: boolean;
  createdAt?: string;
}

// ── CLIENTES ──

export interface Client {
  id: string;
  barbershopId?: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt?: string;
}

// ── SESIONES DE CORTE ──

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';

export interface HaircutSession {
  id: string;
  barbershopId: string;
  barberId: string;
  clientId?: string;
  clientName?: string;        // denormalizado para entrada rápida
  serviceId?: string;
  serviceName: string;        // snapshot del nombre al momento del corte
  price: number;
  commissionPct: number;      // snapshot del % al momento del corte
  commissionAmt: number;      // price * commissionPct / 100
  paymentMethod: PaymentMethod;
  startedAt: string;          // ISO timestamp
  endedAt?: string;
  durationMins?: number;
  shiftClosingId?: string;    // asignado al cerrar el turno
  notes?: string;
  createdAt?: string;
}

// ── CIERRE DE TURNO ──

export interface ShiftExpense {
  description: string;
  amount: number;
}

/**
 * Auditoría de caja — solo la completa el encargado al cerrar turno.
 * Conteo manual de billetes/monedas vs. lo que el sistema esperaba.
 */
export interface CashAudit {
  /** Cuenta de cada denominación: { "10000": 5, "1000": 12, ... } */
  denominations: Record<string, number>;
  /** Total contado físicamente */
  countedTotal: number;
  /** Total que el sistema esperaba en caja */
  expectedTotal: number;
  /** countedTotal - expectedTotal (puede ser negativo) */
  difference: number;
  notes?: string;
  auditedAt: string;
  auditedBy: string;  // barberId
}

export interface ShiftClosing {
  id: string;
  barbershopId: string;
  barberId: string;
  shiftDate: string;          // YYYY-MM-DD
  startedAt?: string;
  closedAt: string | null;
  totalCuts: number;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  totalRevenue: number;
  totalCommission: number;
  expensesCash: number;
  expensesDetail: ShiftExpense[];
  netCashToHand?: number;     // totalCash - expensesCash
  cashAudit?: CashAudit;      // solo presente si el encargado hizo auditoría
  notes?: string;
  status: 'OPEN' | 'CLOSED';
  createdAt?: string;
}

// ── NOTIFICACIONES ──

export type NotificationType =
  | 'SHIFT_CLOSED'
  | 'SHIFT_PENDING'
  | 'BARBER_ADDED'
  | 'GENERAL';

export interface ShiftClosingMetadata {
  barbershopId: string;
  barbershopName: string;
  barberId: string;
  barberName: string;
  shiftDate: string;
  startedAt?: string;       // hora de apertura del turno
  closedAt?: string;        // hora de cierre del turno
  totalCuts: number;
  totalRevenue: number;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  totalCommission: number;
  expensesCash: number;
  netCashToHand: number;
  expensesDetail: { description: string; amount: number }[];
  cashAudit?: CashAudit;    // si el barbero es encargado
  isManager?: boolean;
}

export interface AppNotification {
  id: string;
  recipientEmail: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedId?: string;
  read: boolean;
  createdAt: string;
  metadata?: ShiftClosingMetadata;
}

// ── ANALYTICS (computados en cliente, no almacenados) ──

export interface BarberDayMetrics {
  barberId: string;
  barberName: string;
  date: string;
  totalCuts: number;
  totalRevenue: number;
  totalCommission: number;
  avgDurationMins?: number;
  avgPricePerCut?: number;
  cashRevenue: number;
  cardRevenue: number;
  transferRevenue: number;
}

export interface BarbershopMetrics {
  barbershopId: string;
  barbershopName: string;
  totalCuts: number;
  totalRevenue: number;
  totalCommission: number;
  activeBarbers: number;
  avgCutsPerDay: number;
  topBarberId?: string;
  topBarberName?: string;
}

export interface PeriodSummary {
  totalCuts: number;
  totalRevenue: number;
  totalCommission: number;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  avgCutsPerDay: number;
  avgRevenuePerCut: number;
  busyDay?: string;
  topBarberId?: string;
}

export interface BarbershopFinancials {
  barbershopId: string;
  barbershopName: string;
  totalShifts: number;
  totalCuts: number;
  totalRevenue: number;
  totalCommissions: number;    // lo que los barberos se llevan diariamente
  totalExpenses: number;       // gastos operativos del turno
  netOwnerRevenue: number;     // revenue - commissions - expenses
  barberBreakdown: {
    barberId: string;
    barberName: string;
    cuts: number;
    revenue: number;
    commission: number;
    shifts: { shiftDate: string; startedAt?: string; closedAt?: string | null }[];
  }[];
  expensesDetail: { description: string; amount: number }[];
}

export interface NetworkFinancialSummary {
  totalRevenue: number;
  totalCommissions: number;
  totalExpenses: number;
  netOwnerRevenue: number;
  totalCuts: number;
  totalShifts: number;
}
