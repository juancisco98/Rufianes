import { toast } from 'sonner';
import { logger } from './logger';

/**
 * Centralized error handler.
 * Logs the full error in dev and shows a user-friendly toast that incluye
 * el código y mensaje del error de Supabase cuando están disponibles.
 *
 * Lección 5: SIEMPRE mostrar el código real al usuario, no genéricos.
 */
export const handleError = (error: unknown, userMessage?: string) => {
    logger.error('[AppError]', error);
    // En flujos críticos, también imprimir directo a console (Lección 6)
    // eslint-disable-next-line no-console
    console.error('[AppError]', error);

    const detail = extractErrorDetail(error);
    const base = userMessage || 'Error inesperado.';
    const message = detail ? `${base} (${detail})` : base;

    toast.error(message);
};

/**
 * Extrae código + mensaje de un error de Supabase / fetch / Error genérico.
 * Devuelve string corto para mostrar en toast.
 */
export const extractErrorDetail = (error: unknown): string | null => {
    if (!error) return null;
    if (typeof error === 'string') return error;
    if (typeof error === 'object') {
        const e = error as { code?: string; message?: string; details?: string; hint?: string };
        const parts: string[] = [];
        if (e.code) parts.push(e.code);
        if (e.message) parts.push(e.message);
        else if (e.details) parts.push(e.details);
        if (parts.length) return parts.join(': ').slice(0, 200);
    }
    return null;
};
