-- Vincula liga_entries con liga_clients (FK opcional para compat con filas viejas).
ALTER TABLE liga_entries
  ADD COLUMN IF NOT EXISTS liga_client_id UUID REFERENCES liga_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_liga_entries_client_id
  ON liga_entries(liga_client_id);
NOTIFY pgrst, 'reload schema';
