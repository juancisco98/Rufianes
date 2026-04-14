/**
 * Haptics — wrapper liviano sobre Vibration API y (futuro) Capacitor Haptics.
 * Falla silenciosamente si no hay soporte. Usar en cualquier interacción táctil
 * para sensación nativa.
 */

const supportsVibrate = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

/** Tap suave (10ms) — botones secundarios, taps generales */
export const hapticTap = (): void => {
  if (supportsVibrate()) {
    try { navigator.vibrate(8); } catch { /* noop */ }
  }
};

/** Impacto medio — confirmaciones, submit */
export const hapticImpact = (): void => {
  if (supportsVibrate()) {
    try { navigator.vibrate(15); } catch { /* noop */ }
  }
};

/** Éxito — patrón de 3 pulsos cortos */
export const hapticSuccess = (): void => {
  if (supportsVibrate()) {
    try { navigator.vibrate([10, 30, 10]); } catch { /* noop */ }
  }
};

/** Error — pulso largo */
export const hapticError = (): void => {
  if (supportsVibrate()) {
    try { navigator.vibrate([20, 40, 20, 40]); } catch { /* noop */ }
  }
};

/** Warning — patrón intermedio */
export const hapticWarning = (): void => {
  if (supportsVibrate()) {
    try { navigator.vibrate([15, 30]); } catch { /* noop */ }
  }
};
