/**
 * retry — wrapper simple con backoff exponencial para llamadas de red.
 *
 * Reintenta SOLO errores transitorios (red, timeout, 5xx). NO reintenta:
 *  - Errores de RLS / permisos (PostgREST: 401, 403, PGRST*)
 *  - Constraints / unique violations (Postgres: 23xxx)
 *  - Validación cliente (4xx que no sea 408/429)
 */

interface RetryOpts {
  maxAttempts?: number;
  baseDelayMs?: number;
  label?: string;
}

const NON_RETRYABLE_CODES = new Set([
  '23505', // unique_violation
  '23502', // not_null_violation
  '23503', // foreign_key_violation
  '23514', // check_violation
  '42501', // insufficient_privilege
  '42P17', // infinite_recursion (RLS)
  'PGRST116', // PostgREST: not found
  'PGRST301', // PostgREST: row-level security
]);

const isRetryable = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return true;
  const e = err as { code?: string; status?: number; message?: string };
  if (e.code && NON_RETRYABLE_CODES.has(e.code)) return false;
  if (typeof e.status === 'number') {
    if (e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429) return false;
  }
  return true;
};

export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOpts = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 300, label = 'op' } = opts;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === maxAttempts) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      // eslint-disable-next-line no-console
      console.warn(`[retry:${label}] attempt ${attempt} failed, retrying in ${delay}ms`, err);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw lastErr;
}
