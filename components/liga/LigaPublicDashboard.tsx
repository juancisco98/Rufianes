import React, { useEffect, useState, useMemo } from 'react';
import { Trophy, Crown, Medal, Loader2, Scissors, Radio } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { LigaEntry, LigaConfig, LigaClient, Barbershop, LigaLeaderboardRow } from '../../types';
import { dbToLigaEntry, dbToLigaConfig, dbToLigaClient, dbToBarbershop } from '../../utils/mappers';
import { computeLeaderboard, currentMonth } from '../../utils/ligaLeaderboard';
import {
  DbLigaEntryRow,
  DbLigaConfigRow,
  DbLigaClientRow,
  DbBarbershopRow,
} from '../../types/dbRows';

interface LigaPublicDashboardProps {
  barbershopId: string;
}

const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`;

const MONTH_LABEL = (m: string): string => {
  const [y, mm] = m.split('-').map(Number);
  const d = new Date(y, mm - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
};

const RANK_COLORS = [
  { bg: 'from-amber-300 via-amber-400 to-amber-600', text: 'text-amber-50', icon: Crown, label: 'CAMPEÓN' },
  { bg: 'from-slate-300 via-slate-400 to-slate-600', text: 'text-slate-50', icon: Medal, label: 'SUBCAMPEÓN' },
  { bg: 'from-orange-400 via-orange-500 to-orange-700', text: 'text-orange-50', icon: Medal, label: 'TERCERO' },
];

/**
 * Dashboard público de la Liga del Corte — sin login.
 * Accesible desde URL `?liga=<barbershopId>`.
 * Realtime: se actualiza solo cuando los barberos cargan tiradas.
 */
const LigaPublicDashboard: React.FC<LigaPublicDashboardProps> = ({ barbershopId }) => {
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [config, setConfig] = useState<LigaConfig | null>(null);
  const [entries, setEntries] = useState<LigaEntry[]>([]);
  const [ligaClients, setLigaClients] = useState<LigaClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulseKey, setPulseKey] = useState(0); // re-render visual al recibir realtime

  const month = currentMonth();

  // Carga inicial
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Barbería (debe tener liga_enabled = true)
        const { data: shopData, error: shopErr } = await supabase
          .from('barbershops')
          .select('*')
          .eq('id', barbershopId)
          .eq('liga_enabled', true)
          .limit(1)
          .maybeSingle();
        if (shopErr) throw shopErr;
        if (!shopData) {
          if (!cancelled) {
            setError('La Liga no está disponible en esta barbería.');
            setLoading(false);
          }
          return;
        }

        // Config (puede no existir todavía)
        const { data: cfgData, error: cfgErr } = await supabase
          .from('liga_config')
          .select('*')
          .eq('barbershop_id', barbershopId)
          .limit(1)
          .maybeSingle();
        if (cfgErr) console.warn('[LigaPublic] config error', cfgErr);

        // Entries del mes actual
        const { data: entriesData, error: entriesErr } = await supabase
          .from('liga_entries')
          .select('*')
          .eq('barbershop_id', barbershopId)
          .eq('month', month)
          .order('created_at', { ascending: false });
        if (entriesErr) throw entriesErr;

        // Fichas de clientes de la sucursal (RLS anon permite SELECT)
        const { data: clientsData } = await supabase
          .from('liga_clients')
          .select('*')
          .eq('barbershop_id', barbershopId);

        if (cancelled) return;
        setBarbershop(dbToBarbershop(shopData as DbBarbershopRow));
        if (cfgData) setConfig(dbToLigaConfig(cfgData as DbLigaConfigRow));
        setEntries((entriesData || []).map((r) => dbToLigaEntry(r as DbLigaEntryRow)));
        setLigaClients((clientsData || []).map((r) => dbToLigaClient(r as DbLigaClientRow)));
        setLoading(false);
      } catch (err: any) {
        console.error('[LigaPublic] load error', err);
        if (!cancelled) {
          setError(`No se pudo cargar la liga: ${err?.message ?? 'error desconocido'}`);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [barbershopId, month]);

  // Realtime — escuchar inserts/updates/deletes filtrados por barbería
  useEffect(() => {
    if (!barbershop) return;
    const channel = supabase
      .channel(`liga_public_${barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'liga_entries',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newEntry = dbToLigaEntry(payload.new as DbLigaEntryRow);
            if (newEntry.month === month) {
              setEntries((prev) =>
                prev.some((e) => e.id === newEntry.id) ? prev : [newEntry, ...prev]
              );
              setPulseKey((k) => k + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToLigaEntry(payload.new as DbLigaEntryRow);
            setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            setPulseKey((k) => k + 1);
          } else if (payload.eventType === 'DELETE') {
            setEntries((prev) => prev.filter((e) => e.id !== (payload.old as { id?: string })?.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'liga_clients',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const c = dbToLigaClient(payload.new as DbLigaClientRow);
            setLigaClients((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
          } else if (payload.eventType === 'UPDATE') {
            const c = dbToLigaClient(payload.new as DbLigaClientRow);
            setLigaClients((prev) => prev.map((x) => (x.id === c.id ? c : x)));
          } else if (payload.eventType === 'DELETE') {
            setLigaClients((prev) => prev.filter((x) => x.id !== (payload.old as { id?: string })?.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershop, barbershopId, month]);

  const leaderboard: LigaLeaderboardRow[] = useMemo(
    () => computeLeaderboard(entries, barbershopId, month, ligaClients),
    [entries, barbershopId, month, ligaClients]
  );

  // ── Estados de carga / error ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 z-[5000] bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-amber-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Cargando ranking...</p>
        </div>
      </div>
    );
  }

  if (error || !barbershop) {
    return (
      <div className="fixed inset-0 z-[5000] bg-black flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Trophy className="w-12 h-12 text-amber-500/50 mx-auto mb-4" />
          <h1 className="font-display text-3xl text-amber-400 mb-2">Liga no disponible</h1>
          <p className="text-sm text-slate-400">{error ?? 'Probá refrescar la página.'}</p>
        </div>
      </div>
    );
  }

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 30);
  const leader = leaderboard[0];

  return (
    <div className="fixed inset-0 z-[5000] bg-black overflow-y-auto">
      {/* Background ambiental */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 20%, rgba(255,179,0,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,179,0,0.2) 0%, transparent 50%)',
        }}
      />

      <div className="relative max-w-3xl mx-auto px-5 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 mb-3">
            <Scissors className="w-7 h-7 text-amber-400" />
          </div>
          <p className="text-amber-400/80 text-[11px] font-bold uppercase tracking-[0.3em] mb-1">
            Rufianes
          </p>
          <h1 className="font-display text-5xl sm:text-7xl text-white leading-none tracking-wide">
            {barbershop.name.replace(/^Rufianes\s+/i, '')}
          </h1>
          <h2 className="font-display text-2xl sm:text-4xl text-amber-400 mt-3">
            La Liga del Corte
          </h2>
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="text-slate-400 text-[12px] uppercase tracking-wider">
              {MONTH_LABEL(month)}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30">
              <Radio key={pulseKey} className="w-3 h-3 text-red-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                En vivo
              </span>
            </span>
          </div>
        </div>

        {/* Podio */}
        {podium.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 text-amber-500/30 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Sin participantes este mes</p>
            <p className="text-slate-500 text-sm mt-1">El primer corte arranca la liga</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[1, 0, 2].map((idx) => {
              const row = podium[idx];
              if (!row) return <div key={idx} />;
              const rc = RANK_COLORS[idx];
              const Icon = rc.icon;
              const heightClass = idx === 0 ? 'h-44 sm:h-52' : idx === 1 ? 'h-32 sm:h-40' : 'h-28 sm:h-36';
              return (
                <div key={idx} className="flex flex-col items-center justify-end">
                  <div
                    className={`w-full ${heightClass} rounded-3xl bg-gradient-to-b ${rc.bg} flex flex-col items-center justify-end p-3 shadow-2xl border border-white/10`}
                  >
                    <Icon className={`w-7 h-7 ${rc.text} mb-2 drop-shadow-lg`} />
                    <div className="font-display text-5xl sm:text-6xl text-white leading-none drop-shadow-lg">
                      {idx + 1}°
                    </div>
                    <div className={`text-[10px] font-bold ${rc.text} uppercase tracking-widest mt-2`}>
                      {rc.label}
                    </div>
                  </div>
                  <div className="text-center mt-3 w-full">
                    <div className="text-sm font-bold text-white truncate px-1">
                      {row.clientName}
                    </div>
                    {row.clientCode && (
                      <div className="text-[10px] text-amber-400/70 tabular-nums">
                        #{row.clientCode}
                      </div>
                    )}
                    <div className="font-display text-2xl text-amber-400 leading-none mt-1">
                      {row.totalPoints}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                      puntos
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabla del resto */}
        {rest.length > 0 && (
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-md">
            {/* Header */}
            <div className="grid grid-cols-[2.5rem_1fr_4rem_3.5rem] gap-2 items-center px-4 py-3 bg-white/[0.04] border-b border-white/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">#</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cliente</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Pts</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Dif</div>
            </div>
            {rest.map((row, idx) => {
              const diff = leader.totalPoints - row.totalPoints;
              return (
                <div
                  key={`${row.clientName}-${idx}`}
                  className="grid grid-cols-[2.5rem_1fr_4rem_3.5rem] gap-2 items-center px-4 py-3 border-b border-white/5 last:border-0"
                >
                  <div className="flex justify-center">
                    <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-[12px] font-bold text-slate-300 tabular-nums">
                      {row.rank}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] text-white truncate font-medium flex items-center gap-1.5">
                      <span className="truncate">{row.clientName}</span>
                      {row.clientCode && (
                        <span className="text-[10px] text-amber-400/60 tabular-nums shrink-0">
                          #{row.clientCode}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {row.visits} visita{row.visits !== 1 ? 's' : ''}
                      {row.extraDiceBought > 0 && ` · ${row.extraDiceBought} dados extra`}
                    </div>
                  </div>
                  <div className="text-right font-display text-2xl text-amber-400 leading-none tabular-nums">
                    {row.totalPoints}
                  </div>
                  <div className="text-right text-[12px] font-semibold text-red-400/80 tabular-nums">
                    -{diff}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer con premios */}
        {config && podium.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-slate-500 text-[11px] uppercase tracking-widest mb-2">
              Premios al cierre del mes
            </p>
            <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3">
                <div className="text-[10px] text-amber-400 uppercase tracking-wider">1°</div>
                <div className="font-display text-xl text-amber-300 mt-0.5">{fmt(config.prize1)}</div>
              </div>
              <div className="rounded-2xl bg-slate-500/10 border border-slate-500/20 p-3">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">2°</div>
                <div className="font-display text-xl text-slate-300 mt-0.5">{fmt(config.prize2)}</div>
              </div>
              <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 p-3">
                <div className="text-[10px] text-orange-400 uppercase tracking-wider">3°</div>
                <div className="font-display text-xl text-orange-300 mt-0.5">{fmt(config.prize3)}</div>
              </div>
            </div>
            <p className="text-slate-600 text-[11px] mt-3">
              {config.prizeLabel}
            </p>
          </div>
        )}

        <p className="text-center text-slate-700 text-[10px] mt-8">
          © {new Date().getFullYear()} Rufianes Barbershop · La Liga del Corte
        </p>
      </div>
    </div>
  );
};

export default LigaPublicDashboard;
