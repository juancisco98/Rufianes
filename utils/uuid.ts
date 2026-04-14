/**
 * generateUUID — UUID v4 manual.
 *
 * Por qué no usamos crypto.randomUUID():
 *  - Falla / cuelga en entornos HTTP sin TLS (desarrollo local).
 *  - No disponible en algunos WebViews antiguos (Capacitor Android).
 *
 * Ver Lección 1 en CLAUDE.md.
 */
export const generateUUID = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
