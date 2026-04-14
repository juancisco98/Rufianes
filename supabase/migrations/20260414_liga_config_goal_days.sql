-- Extiende liga_configs con los campos del simulador "Números Reales".
-- workingDaysPerMonth: días trabajados al mes (default 26).
-- monthlyGoal: meta de sueldo mensual del barbero (default 1.000.000).

ALTER TABLE liga_config
  ADD COLUMN IF NOT EXISTS working_days_per_month integer NOT NULL DEFAULT 26,
  ADD COLUMN IF NOT EXISTS monthly_goal numeric NOT NULL DEFAULT 1000000;
