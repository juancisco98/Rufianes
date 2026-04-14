-- ─────────────────────────────────────────────
-- RUFIANES — Acceso público (anon) al ranking de la Liga
-- Permite que clientes sin loguearse vean el ranking en vivo
-- ─────────────────────────────────────────────

-- liga_entries: lectura pública SOLO para barberías con liga habilitada
DROP POLICY IF EXISTS liga_entries_public_select ON liga_entries;
CREATE POLICY liga_entries_public_select ON liga_entries FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM barbershops b
      WHERE b.id = liga_entries.barbershop_id
        AND b.liga_enabled = true
    )
  );

-- liga_config: lectura pública SOLO para barberías con liga habilitada
DROP POLICY IF EXISTS liga_config_public_select ON liga_config;
CREATE POLICY liga_config_public_select ON liga_config FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM barbershops b
      WHERE b.id = liga_config.barbershop_id
        AND b.liga_enabled = true
    )
  );

-- barbershops: lectura pública del nombre/dirección SOLO si tiene liga habilitada
DROP POLICY IF EXISTS barbershops_public_liga ON barbershops;
CREATE POLICY barbershops_public_liga ON barbershops FOR SELECT
  TO anon
  USING (liga_enabled = true);

-- Refrescar schema cache
NOTIFY pgrst, 'reload schema';
