-- ─────────────────────────────────────────────
-- RUFIANES — Encargado de sucursal + Auditoría de caja
-- ─────────────────────────────────────────────

-- Encargado: barbero con responsabilidad de cerrar caja
ALTER TABLE barbers
  ADD COLUMN IF NOT EXISTS is_manager BOOLEAN NOT NULL DEFAULT false;

-- Auditoría de caja (conteo de billetes/monedas) en el cierre de turno.
-- Solo el encargado la completa. JSONB con la forma:
-- {
--   "denominations": { "10000": 5, "1000": 12, "500": 4, ... },
--   "countedTotal": 17500,
--   "expectedTotal": 17000,
--   "difference": 500,
--   "notes": "..."
-- }
ALTER TABLE shift_closings
  ADD COLUMN IF NOT EXISTS cash_audit JSONB;
