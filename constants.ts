// Google Auth Allowlist — Admins (dueños de Rufianes)
export const ALLOWED_EMAILS = [
  'juan.sada98@gmail.com',
];

// Buenos Aires Center — todas las barberías están en CABA/GBA
export const MAP_CENTER: [number, number] = [-34.6037, -58.3816];
export const MAP_ZOOM_DEFAULT = 13;

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const DAY_NAMES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

// Catálogo de servicios por defecto (se puede personalizar por barbería)
export const DEFAULT_SERVICES = [
  { name: 'Corte clásico', basePrice: 3500, durationMins: 30 },
  { name: 'Fade', basePrice: 4500, durationMins: 40 },
  { name: 'Corte + Barba', basePrice: 5500, durationMins: 50 },
  { name: 'Barba', basePrice: 2500, durationMins: 20 },
  { name: 'Degradado', basePrice: 4000, durationMins: 35 },
  { name: 'Corte Niño', basePrice: 2800, durationMins: 25 },
  { name: 'Alisado', basePrice: 6000, durationMins: 60 },
  { name: 'Tintura', basePrice: 5000, durationMins: 45 },
] as const;

// Métodos de pago
export const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER'] as const;
export type PaymentMethodType = typeof PAYMENT_METHODS[number];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
};

// Comisión por defecto para barberos (%)
export const DEFAULT_COMMISSION_PCT = 50;

// Mapa
export const MAP_RESIZE_DELAY_MS = 200;

// Analytics — ventana de carga de sesiones (días hacia atrás)
export const SESSIONS_LOAD_DAYS = 90;

// Horario de recordatorio para cierre de turno (hora del día, formato 24h)
export const SHIFT_CLOSE_REMINDER_HOUR = 20;

// ── LA LIGA DEL CORTE ─────────────────────────────────────────────────────────
// Defaults usados al crear liga_config para una barbería nueva.
// Pueden editarse desde el panel admin sin tocar código.
export const LIGA_DEFAULT_CONFIG = {
  serviceMultiplier: 2,         // ×2 puntos para corte/barba/corte+barba
  extraDieCost: 2000,           // $ por dado extra que compra el cliente
  extraDieCommission: 1000,     // $ comisión al barbero por cada dado vendido
  prize1: 30000,
  prize2: 20000,
  prize3: 10000,
  prizeLabel: 'Tarjeta Nike',
  workingDaysPerMonth: 26,      // días trabajados por mes (para simulador Números Reales)
  monthlyGoal: 1_000_000,        // meta mensual de sueldo del barbero
} as const;

export const LIGA_DICE_FACES = [1, 2, 3, 4, 5, 6] as const;
export const LIGA_DICE_PER_ROLL = 3;

// Especialidades disponibles para barberos
export const BARBER_SPECIALTIES = [
  'Fade',
  'Clásico',
  'Barba',
  'Degradado',
  'Tintura',
  'Alisado',
  'Diseño',
  'Niños',
] as const;
