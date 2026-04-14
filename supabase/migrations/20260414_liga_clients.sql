-- ─────────────────────────────────────────────
-- Liga del Corte — Fichas de clientes por barbería.
-- Cada cliente tiene un código numérico de 4 dígitos único dentro de su sucursal.
-- El barbero al registrar una tirada selecciona al cliente por código o nombre.
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS liga_clients (
  id UUID PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (barbershop_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_liga_clients_shop_lower_name
  ON liga_clients(barbershop_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_liga_clients_shop ON liga_clients(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_liga_clients_code ON liga_clients(barbershop_id, code);

ALTER TABLE liga_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS liga_clients_admin_all ON liga_clients;
CREATE POLICY liga_clients_admin_all ON liga_clients FOR ALL
  USING ((auth.jwt() ->> 'email') IN (SELECT email FROM allowed_emails))
  WITH CHECK ((auth.jwt() ->> 'email') IN (SELECT email FROM allowed_emails));

DROP POLICY IF EXISTS liga_clients_barber_select ON liga_clients;
CREATE POLICY liga_clients_barber_select ON liga_clients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM barber_auth ba
    JOIN barbers b ON b.id = ba.barber_id
    WHERE ba.user_id = auth.uid()
      AND b.barbershop_id = liga_clients.barbershop_id
  ));

DROP POLICY IF EXISTS liga_clients_barber_insert ON liga_clients;
CREATE POLICY liga_clients_barber_insert ON liga_clients FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM barber_auth ba
    JOIN barbers b ON b.id = ba.barber_id
    WHERE ba.user_id = auth.uid()
      AND b.barbershop_id = liga_clients.barbershop_id
  ));

DROP POLICY IF EXISTS liga_clients_public_select ON liga_clients;
CREATE POLICY liga_clients_public_select ON liga_clients FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM barbershops s
    WHERE s.id = liga_clients.barbershop_id AND s.liga_enabled = true
  ));

NOTIFY pgrst, 'reload schema';
