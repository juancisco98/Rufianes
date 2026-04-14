-- ─────────────────────────────────────────────
-- RUFIANES — La Liga del Corte (gamificación)
-- Migración: feature flag + tablas liga_config, liga_entries, liga_monthly_closings
-- ─────────────────────────────────────────────

-- Feature flag por barbería (gating del piloto en Martínez)
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS liga_enabled BOOLEAN DEFAULT false;

-- ─── liga_config ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS liga_config (
  barbershop_id UUID PRIMARY KEY REFERENCES barbershops(id) ON DELETE CASCADE,
  service_multiplier INT NOT NULL DEFAULT 2 CHECK (service_multiplier > 0),
  extra_die_cost NUMERIC NOT NULL DEFAULT 2000 CHECK (extra_die_cost >= 0),
  extra_die_commission NUMERIC NOT NULL DEFAULT 1000 CHECK (extra_die_commission >= 0),
  prize_1 NUMERIC NOT NULL DEFAULT 30000,
  prize_2 NUMERIC NOT NULL DEFAULT 20000,
  prize_3 NUMERIC NOT NULL DEFAULT 10000,
  prize_label TEXT NOT NULL DEFAULT 'Tarjeta Nike',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── liga_entries ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS liga_entries (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES haircut_sessions(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE RESTRICT,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  month TEXT NOT NULL,                              -- "YYYY-MM"
  dice_1 INT NOT NULL CHECK (dice_1 BETWEEN 1 AND 6),
  dice_2 INT NOT NULL CHECK (dice_2 BETWEEN 1 AND 6),
  dice_3 INT NOT NULL CHECK (dice_3 BETWEEN 1 AND 6),
  service_points INT NOT NULL CHECK (service_points >= 0),
  extra_dice_count INT NOT NULL DEFAULT 0 CHECK (extra_dice_count >= 0),
  extra_dice_points INT NOT NULL DEFAULT 0 CHECK (extra_dice_points >= 0),
  extra_dice_revenue NUMERIC NOT NULL DEFAULT 0 CHECK (extra_dice_revenue >= 0),
  extra_dice_commission NUMERIC NOT NULL DEFAULT 0 CHECK (extra_dice_commission >= 0),
  total_points INT GENERATED ALWAYS AS (service_points + extra_dice_points) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_liga_entries_month
  ON liga_entries(barbershop_id, month);
CREATE INDEX IF NOT EXISTS idx_liga_entries_client
  ON liga_entries(barbershop_id, lower(client_name));
CREATE INDEX IF NOT EXISTS idx_liga_entries_barber
  ON liga_entries(barber_id, month);

-- ─── liga_monthly_closings ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS liga_monthly_closings (
  id UUID PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  podium JSONB NOT NULL,                            -- [{rank, clientName, points, prize}]
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  total_commission NUMERIC NOT NULL DEFAULT 0,
  total_prizes NUMERIC NOT NULL DEFAULT 0,
  net NUMERIC NOT NULL DEFAULT 0,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_by TEXT,                                   -- email del admin que cerró
  UNIQUE (barbershop_id, month)
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE liga_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE liga_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE liga_monthly_closings ENABLE ROW LEVEL SECURITY;

-- Limpieza idempotente
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
           WHERE tablename IN ('liga_config', 'liga_entries', 'liga_monthly_closings')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename;
  END LOOP;
END $$;

-- liga_config: admin lee/escribe, barbero solo lee la de su barbería
CREATE POLICY liga_config_admin_all ON liga_config FOR ALL
  USING ((auth.jwt() ->> 'email') IN (SELECT email FROM allowed_emails))
  WITH CHECK ((auth.jwt() ->> 'email') IN (SELECT email FROM allowed_emails));

CREATE POLICY liga_config_barber_select ON liga_config FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM barber_auth ba
    JOIN barbers b ON b.id = ba.barber_id
    WHERE ba.user_id = auth.uid()
      AND b.barbershop_id = liga_config.barbershop_id
  ));

-- liga_entries: admin total; barbero CRUD solo de sus propias entries
CREATE POLICY liga_entries_admin_all ON liga_entries FOR ALL
  USING ((auth.jwt() ->> 'email') IN (SELECT email FROM allowed_emails))
  WITH CHECK ((auth.jwt() ->> 'email') IN (SELECT email FROM allowed_emails));

CREATE POLICY liga_entries_barber_select ON liga_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM barber_auth ba
    WHERE ba.user_id = auth.uid() AND ba.barber_id = liga_entries.barber_id
  ));

CREATE POLICY liga_entries_barber_insert ON liga_entries FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM barber_auth ba
    WHERE ba.user_id = auth.uid() AND ba.barber_id = liga_entries.barber_id
  ));

CREATE POLICY liga_entries_barber_update ON liga_entries FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM barber_auth ba
    WHERE ba.user_id = auth.uid() AND ba.barber_id = liga_entries.barber_id
  ));

-- liga_monthly_closings: solo admin
CREATE POLICY liga_closings_admin_all ON liga_monthly_closings FOR ALL
  USING ((auth.jwt() ->> 'email') IN (SELECT email FROM allowed_emails))
  WITH CHECK ((auth.jwt() ->> 'email') IN (SELECT email FROM allowed_emails));

CREATE POLICY liga_closings_barber_select ON liga_monthly_closings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM barber_auth ba
    JOIN barbers b ON b.id = ba.barber_id
    WHERE ba.user_id = auth.uid()
      AND b.barbershop_id = liga_monthly_closings.barbershop_id
  ));

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Asegurar que las tablas estén publicadas para realtime
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE liga_entries;
    ALTER PUBLICATION supabase_realtime ADD TABLE liga_config;
    ALTER PUBLICATION supabase_realtime ADD TABLE liga_monthly_closings;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
