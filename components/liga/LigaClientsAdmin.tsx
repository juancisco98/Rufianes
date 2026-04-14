import React, { useMemo, useState } from 'react';
import { Search, Pencil, Trash2, QrCode, Users, Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { GlassCard, GlassButton, IOSInput, EmptyState, BottomSheet } from '../ui';
import { LigaClient, LigaEntry } from '../../types';
import { useLigaClients } from '../../hooks/useLigaClients';

interface Props {
  barbershopId: string;
  barbershopName: string;
  month: string;                    // YYYY-MM para mostrar puntos del mes
  entries: LigaEntry[];              // todos los entries del shop del mes (para contar puntos/visitas)
  onOpenPublicQR: () => void;        // callback para abrir el modal del QR
}

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

export const LigaClientsAdmin: React.FC<Props> = ({
  barbershopId, barbershopName, month, entries, onOpenPublicQR,
}) => {
  const { getClientsForShop, createClient, updateClient, deleteClient } = useLigaClients();
  const clients = getClientsForShop(barbershopId);

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<LigaClient | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Agregados por cliente para el mes actual
  const stats = useMemo(() => {
    const map = new Map<string, { points: number; visits: number; lastVisit?: string; extraDice: number }>();
    for (const e of entries) {
      if (e.month !== month) continue;
      const key = e.ligaClientId ?? '';
      if (!key) continue;
      const acc = map.get(key) ?? { points: 0, visits: 0, extraDice: 0 };
      acc.points += e.totalPoints;
      acc.visits += 1;
      acc.extraDice += e.extraDiceCount;
      if (!acc.lastVisit || e.createdAt > acc.lastVisit) acc.lastVisit = e.createdAt;
      map.set(key, acc);
    }
    return map;
  }, [entries, month]);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? clients.filter(
        (c) => c.code.includes(term) || c.name.toLowerCase().includes(term) || (c.phone ?? '').includes(term)
      )
    : clients;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ios-label2 dark:text-iosDark-label2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar código, nombre o teléfono…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-ios-grouped dark:bg-iosDark-grouped text-[13px] border border-transparent focus:outline-none focus:border-ios-accent"
          />
        </div>
        <GlassButton variant="secondary" size="sm" iconLeft={<QrCode className="w-3.5 h-3.5" />} onClick={onOpenPublicQR}>
          QR
        </GlassButton>
        <GlassButton variant="primary" size="sm" iconLeft={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowNew(true)}>
          Nuevo
        </GlassButton>
      </div>

      {/* Meta info */}
      <div className="text-[11px] text-ios-label2 dark:text-iosDark-label2 px-1">
        {filtered.length} de {clients.length} fichas en {barbershopName} · Puntos mostrados del mes {month}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7" />}
          title={clients.length === 0 ? 'Todavía no hay clientes' : 'Sin resultados'}
          description={clients.length === 0 ? 'Apenas el barbero registre una tirada, aparecen acá.' : 'Probá otro término'}
        />
      ) : (
        <GlassCard variant="solid" padding="none" className="overflow-hidden">
          <div className="grid grid-cols-[3rem_1fr_4rem_3.5rem_auto] gap-2 items-center py-2 px-3 bg-ios-grouped dark:bg-iosDark-grouped border-b border-ios-divider dark:border-iosDark-divider text-[10px] font-bold uppercase tracking-wider text-ios-label2 dark:text-iosDark-label2">
            <div>Cód</div>
            <div>Cliente</div>
            <div className="text-right">Pts</div>
            <div className="text-right">🎲</div>
            <div />
          </div>
          {filtered.map((c) => {
            const s = stats.get(c.id);
            return (
              <div
                key={c.id}
                className="grid grid-cols-[3rem_1fr_4rem_3.5rem_auto] gap-2 items-center py-2.5 px-3 border-b border-ios-divider dark:border-iosDark-divider last:border-0"
              >
                <div className="font-display text-base text-amber-600 tabular-nums">#{c.code}</div>
                <div className="min-w-0">
                  <div className="text-[14px] text-ios-label dark:text-iosDark-label font-medium truncate">
                    {c.name}
                  </div>
                  <div className="text-[11px] text-ios-label2 dark:text-iosDark-label2 truncate">
                    {c.phone ?? 'sin tel.'}
                    {s ? ` · ${s.visits} visita${s.visits !== 1 ? 's' : ''} · últ. ${fmtDate(s.lastVisit)}` : ' · sin tiradas este mes'}
                  </div>
                </div>
                <div className="text-right font-display text-lg text-ios-accent tabular-nums leading-none">
                  {s?.points ?? 0}
                </div>
                <div className="text-right text-[12px] font-semibold text-emerald-600 tabular-nums">
                  {s?.extraDice ?? 0}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="w-8 h-8 rounded-lg hover:bg-ios-grouped dark:hover:bg-iosDark-grouped flex items-center justify-center text-ios-label2 dark:text-iosDark-label2"
                    aria-label="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const hasEntries = entries.some((e) => e.ligaClientId === c.id);
                      const msg = hasEntries
                        ? `⚠️ ${c.name} tiene tiradas registradas. Al borrar la ficha, las tiradas se conservan (snapshot del nombre) pero pierden el link al código.\n\n¿Borrar igual?`
                        : `¿Borrar la ficha de ${c.name} (#${c.code})?`;
                      if (!confirm(msg)) return;
                      try {
                        await deleteClient(c.id);
                        toast.success(`Ficha #${c.code} eliminada`);
                      } catch (err: any) {
                        toast.error(`Error: ${err?.message ?? 'no se pudo borrar'}`);
                      }
                    }}
                    className="w-8 h-8 rounded-lg hover:bg-rose-500/10 flex items-center justify-center text-rose-500"
                    aria-label="Borrar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </GlassCard>
      )}

      {/* Bottom sheet edit */}
      <BottomSheet open={!!editing} onClose={() => setEditing(null)} title={editing ? `Editar #${editing.code}` : ''}>
        {editing && (
          <EditForm
            client={editing}
            onSave={async (updated) => {
              try {
                await updateClient(updated);
                toast.success('Ficha actualizada');
                setEditing(null);
              } catch (err: any) {
                toast.error(`Error: ${err?.message ?? 'no se pudo guardar'}`);
              }
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </BottomSheet>

      {/* Bottom sheet new */}
      <BottomSheet open={showNew} onClose={() => setShowNew(false)} title="Nueva ficha">
        <NewForm
          onCreate={async ({ name, phone, notes }) => {
            try {
              const c = await createClient({ barbershopId, name, phone, notes });
              toast.success(`Ficha #${c.code} creada`);
              setShowNew(false);
            } catch (err: any) {
              toast.error(err?.message ?? 'No se pudo crear');
            }
          }}
          onCancel={() => setShowNew(false)}
        />
      </BottomSheet>
    </div>
  );
};

// ─── Forms ────────────────────────────────────────────────────────────────────

const EditForm: React.FC<{
  client: LigaClient;
  onSave: (c: LigaClient) => Promise<void>;
  onCancel: () => void;
}> = ({ client, onSave, onCancel }) => {
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone ?? '');
  const [notes, setNotes] = useState(client.notes ?? '');
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-3 p-4">
      <IOSInput label="Nombre *" value={name} onChange={(e) => setName(e.target.value)} autoCapitalize="words" />
      <IOSInput label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" />
      <IOSInput label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-2 pt-1">
        <GlassButton variant="secondary" onClick={onCancel} iconLeft={<X className="w-4 h-4" />} fullWidth>
          Cancelar
        </GlassButton>
        <GlassButton
          variant="primary"
          loading={saving}
          iconLeft={<Save className="w-4 h-4" />}
          onClick={async () => {
            if (!name.trim()) { toast.error('Nombre obligatorio'); return; }
            setSaving(true);
            try {
              await onSave({ ...client, name: name.trim(), phone: phone.trim() || undefined, notes: notes.trim() || undefined });
            } finally {
              setSaving(false);
            }
          }}
          fullWidth
        >
          Guardar
        </GlassButton>
      </div>
    </div>
  );
};

const NewForm: React.FC<{
  onCreate: (params: { name: string; phone?: string; notes?: string }) => Promise<void>;
  onCancel: () => void;
}> = ({ onCreate, onCancel }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-3 p-4">
      <IOSInput label="Nombre *" value={name} onChange={(e) => setName(e.target.value)} autoCapitalize="words" />
      <IOSInput label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" />
      <IOSInput label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-2 pt-1">
        <GlassButton variant="secondary" onClick={onCancel} iconLeft={<X className="w-4 h-4" />} fullWidth>
          Cancelar
        </GlassButton>
        <GlassButton
          variant="primary"
          loading={saving}
          iconLeft={<Plus className="w-4 h-4" />}
          onClick={async () => {
            if (!name.trim()) { toast.error('Nombre obligatorio'); return; }
            setSaving(true);
            try {
              await onCreate({
                name: name.trim(),
                phone: phone.trim() || undefined,
                notes: notes.trim() || undefined,
              });
            } finally {
              setSaving(false);
            }
          }}
          fullWidth
        >
          Crear
        </GlassButton>
      </div>
    </div>
  );
};

export default LigaClientsAdmin;
