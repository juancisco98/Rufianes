-- Refactor del registro de tiradas.
-- Antes: el barbero cargaba cada dado individual (dice_1, dice_2, dice_3) entre 1 y 6.
-- Ahora: los dados son físicos, el barbero sube sólo la SUMA TOTAL y elige CORTE / NO CORTE.
-- CORTE → los puntos se multiplican por service_multiplier.
-- NO CORTE → los puntos suman tal cual (ej: cliente que sólo compra dados sin pelarse).

-- 1) Relajar los dados individuales (pasan a nullable, sin CHECK) para compatibilidad con filas viejas.
ALTER TABLE liga_entries ALTER COLUMN dice_1 DROP NOT NULL;
ALTER TABLE liga_entries ALTER COLUMN dice_2 DROP NOT NULL;
ALTER TABLE liga_entries ALTER COLUMN dice_3 DROP NOT NULL;
ALTER TABLE liga_entries DROP CONSTRAINT IF EXISTS liga_entries_dice_1_check;
ALTER TABLE liga_entries DROP CONSTRAINT IF EXISTS liga_entries_dice_2_check;
ALTER TABLE liga_entries DROP CONSTRAINT IF EXISTS liga_entries_dice_3_check;

-- 2) Nueva columna con la suma total de la tirada y el flag de servicio.
ALTER TABLE liga_entries
  ADD COLUMN IF NOT EXISTS dice_sum INT CHECK (dice_sum IS NULL OR dice_sum >= 0),
  ADD COLUMN IF NOT EXISTS is_service BOOLEAN NOT NULL DEFAULT true;

-- 3) Backfill: para las filas existentes, dice_sum = dice_1+dice_2+dice_3 y is_service=true
UPDATE liga_entries
SET dice_sum = COALESCE(dice_1,0) + COALESCE(dice_2,0) + COALESCE(dice_3,0)
WHERE dice_sum IS NULL;
