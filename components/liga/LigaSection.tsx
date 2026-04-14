import React, { useMemo, useState } from 'react';
import { Trophy, Scissors, Search, UserPlus, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { GlassCard, IOSInput, Stepper, GlassButton } from '../ui';
import { LigaConfig, LigaClient } from '../../types';
import { useLigaClients } from '../../hooks/useLigaClients';

export interface LigaSectionState {
  ligaClientId: string | null;       // null mientras no seleccionó cliente
  clientNameSnapshot: string;         // copia del nombre canónico al momento de la tirada
  clientPhoneSnapshot?: string;
  diceSum: number | null;
  isService: boolean;
  extraDiceCount: number;
  extraDiceSum: number | null;
}

interface LigaSectionProps {
  barbershopId: string;
  config: LigaConfig;
  state: LigaSectionState;
  onChange: (next: LigaSectionState) => void;
  showClientError?: boolean;
}

const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`;

export const LigaSection: React.FC<LigaSectionProps> = ({
  barbershopId,
  config,
  state,
  onChange,
  showClientError,
}) => {
  const { ligaClientId, diceSum, isService, extraDiceCount, extraDiceSum } = state;

  const { getClientById, searchClients, createClient } = useLigaClients();
  const [query, setQuery] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedClient = ligaClientId ? getClientById(ligaClientId) : undefined;
  const results = useMemo(
    () => (ligaClientId ? [] : searchClients(barbershopId, query)),
    [ligaClientId, searchClients, barbershopId, query]
  );

  const selectClient = (c: LigaClient) => {
    onChange({
      ...state,
      ligaClientId: c.id,
      clientNameSnapshot: c.name,
      clientPhoneSnapshot: c.phone,
    });
    setQuery('');
    setShowNewForm(false);
  };

  const clearClient = () => {
    onChange({
      ...state,
      ligaClientId: null,
      clientNameSnapshot: '',
      clientPhoneSnapshot: undefined,
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setCreating(true);
    try {
      const c = await createClient({
        barbershopId,
        name: newName,
        phone: newPhone.trim() || undefined,
      });
      toast.success(`Cliente #${c.code} creado`);
      selectClient(c);
      setNewName('');
      setNewPhone('');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo crear el cliente');
    } finally {
      setCreating(false);
    }
  };

  // Cálculos en vivo
  const calc = useMemo(() => {
    const baseSum = diceSum ?? 0;
    const multiplier = isService ? config.serviceMultiplier : 1;
    const servicePoints = baseSum * multiplier;
    const extraPoints = extraDiceSum ?? 0;
    const extraRevenue = extraDiceCount * config.extraDieCost;
    const extraCommission = extraDiceCount * config.extraDieCommission;
    return {
      servicePoints, multiplier, extraPoints, extraRevenue, extraCommission,
      totalPoints: servicePoints + extraPoints,
    };
  }, [diceSum, isService, extraDiceSum, extraDiceCount, config]);

  const diceSumMin = 3;
  const diceSumMax = 18;
  const diceSumInvalid = diceSum !== null && (diceSum < diceSumMin || diceSum > diceSumMax);

  const extraMin = extraDiceCount;
  const extraMax = extraDiceCount * 6;
  const extraInvalid =
    extraDiceCount > 0 && extraDiceSum !== null && (extraDiceSum < extraMin || extraDiceSum > extraMax);

  return (
    <GlassCard variant="tinted" padding="md" className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-semibold text-ios-label dark:text-iosDark-label">
            La Liga del Corte
          </h3>
          <p className="text-[12px] text-ios-label2 dark:text-iosDark-label2">
            Seleccioná cliente, tirada y puntos
          </p>
        </div>
      </div>

      {/* Selector de cliente */}
      <div>
        <label className="block text-[13px] font-medium text-ios-label2 dark:text-iosDark-label2 mb-2 ml-1">
          Cliente *
        </label>

        {selectedClient ? (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white font-display text-base flex items-center justify-center shrink-0 tabular-nums">
              #{selectedClient.code}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-ios-label dark:text-iosDark-label truncate">
                {selectedClient.name}
              </div>
              {selectedClient.phone && (
                <div className="text-[11px] text-ios-label2 dark:text-iosDark-label2 truncate">
                  {selectedClient.phone}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={clearClient}
              className="w-8 h-8 rounded-lg hover:bg-amber-500/20 flex items-center justify-center text-ios-label2 dark:text-iosDark-label2"
              aria-label="Cambiar cliente"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ios-label2 dark:text-iosDark-label2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por código (ej 0042) o nombre…"
                className={`w-full h-11 pl-9 pr-3 rounded-xl bg-white/70 dark:bg-iosDark-bg2/40 text-[14px] border ${
                  showClientError ? 'border-ios-red' : 'border-transparent'
                } focus:outline-none focus:border-ios-accent`}
                autoFocus
              />
            </div>
            {showClientError && (
              <p className="text-[11px] text-ios-red ml-1">Seleccioná o creá un cliente</p>
            )}

            {/* Resultados */}
            <div className="max-h-48 overflow-y-auto rounded-xl bg-white/60 dark:bg-iosDark-bg2/40 divide-y divide-ios-divider dark:divide-iosDark-divider">
              {results.length === 0 ? (
                <div className="p-3 text-center text-[12px] text-ios-label2 dark:text-iosDark-label2">
                  {query.trim() ? 'Sin resultados' : 'Sin clientes cargados todavía'}
                </div>
              ) : (
                results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectClient(c)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-500/10"
                  >
                    <span className="inline-flex items-center justify-center min-w-[44px] h-7 px-2 rounded-md bg-slate-200 dark:bg-slate-700 text-[11px] font-display text-ios-label dark:text-iosDark-label tabular-nums">
                      #{c.code}
                    </span>
                    <span className="flex-1 text-[13px] text-ios-label dark:text-iosDark-label truncate">
                      {c.name}
                    </span>
                    {c.phone && (
                      <span className="text-[11px] text-ios-label2 dark:text-iosDark-label2">
                        {c.phone}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Botón / form de nuevo cliente */}
            {!showNewForm ? (
              <button
                type="button"
                onClick={() => {
                  setShowNewForm(true);
                  setNewName(query);
                }}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-amber-500/50 text-amber-700 dark:text-amber-400 text-[13px] font-semibold hover:bg-amber-500/10"
              >
                <UserPlus className="w-4 h-4" />
                + Nuevo cliente
              </button>
            ) : (
              <div className="rounded-xl bg-white/70 dark:bg-iosDark-bg2/40 p-3 space-y-2 border border-amber-500/30">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Nuevo cliente
                </div>
                <IOSInput
                  label="Nombre *"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre y apellido"
                  autoCapitalize="words"
                />
                <IOSInput
                  label="Teléfono (opcional)"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+54 9 11..."
                  type="tel"
                  inputMode="tel"
                />
                <div className="flex gap-2">
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowNewForm(false);
                      setNewName('');
                      setNewPhone('');
                    }}
                    fullWidth
                  >
                    Cancelar
                  </GlassButton>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={handleCreate}
                    loading={creating}
                    iconLeft={<Check className="w-3.5 h-3.5" />}
                    fullWidth
                  >
                    Crear y seleccionar
                  </GlassButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CORTE / NO CORTE */}
      <div>
        <label className="block text-[13px] font-medium text-ios-label2 dark:text-iosDark-label2 mb-2 ml-1">
          ¿Fue por corte?
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...state, isService: true })}
            className={`h-12 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors border ${
              isService
                ? 'bg-amber-500 text-white border-amber-500 shadow-ios-sm'
                : 'bg-white/60 dark:bg-iosDark-bg2/40 text-ios-label dark:text-iosDark-label border-ios-divider dark:border-iosDark-divider'
            }`}
          >
            <Scissors className="w-4 h-4" />
            CORTE
            <span className="text-[11px] opacity-80">×{config.serviceMultiplier}</span>
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...state, isService: false })}
            className={`h-12 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors border ${
              !isService
                ? 'bg-slate-700 text-white border-slate-700 shadow-ios-sm'
                : 'bg-white/60 dark:bg-iosDark-bg2/40 text-ios-label dark:text-iosDark-label border-ios-divider dark:border-iosDark-divider'
            }`}
          >
            NO CORTE
            <span className="text-[11px] opacity-80">×1</span>
          </button>
        </div>
        <p className="text-[11px] text-ios-label2 dark:text-iosDark-label2 mt-1.5 ml-1">
          {isService
            ? `La tirada se multiplica por ${config.serviceMultiplier} porque el cliente se pela.`
            : 'El cliente solo juega la liga (sin corte). Los puntos valen 1× sin multiplicador.'}
        </p>
      </div>

      {/* Suma de los 3 dados */}
      <div>
        <label className="block text-[13px] font-medium text-ios-label2 dark:text-iosDark-label2 mb-2 ml-1">
          Suma total de los 3 dados
        </label>
        <div className="bg-white/60 dark:bg-iosDark-bg2/40 rounded-2xl p-3">
          <input
            type="number"
            inputMode="numeric"
            min={diceSumMin}
            max={diceSumMax}
            placeholder={`${diceSumMin} – ${diceSumMax}`}
            value={diceSum ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ ...state, diceSum: v === '' ? null : Number(v) });
            }}
            className={`w-full h-14 text-center font-display text-4xl bg-transparent tabular-nums focus:outline-none ${
              diceSumInvalid ? 'text-ios-red' : 'text-ios-label dark:text-iosDark-label'
            }`}
          />
          {diceSum !== null && !diceSumInvalid && (
            <div className="text-center text-[13px] text-ios-label2 dark:text-iosDark-label2 mt-1">
              {diceSum} × {calc.multiplier} ={' '}
              <span className="font-bold text-ios-accent text-base">{calc.servicePoints} pts</span>
            </div>
          )}
          {diceSumInvalid && (
            <p className="text-[11px] text-ios-red text-center mt-1">
              La suma debe estar entre {diceSumMin} y {diceSumMax}
            </p>
          )}
        </div>
      </div>

      {/* Dados extra */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[13px] font-medium text-ios-label2 dark:text-iosDark-label2 ml-1">
            Dados extra ({fmt(config.extraDieCost)} c/u)
          </label>
          <Stepper
            value={extraDiceCount}
            onChange={(count) =>
              onChange({
                ...state,
                extraDiceCount: count,
                extraDiceSum: count === 0 ? null : state.extraDiceSum,
              })
            }
            min={0}
            max={20}
            size="sm"
          />
        </div>
        {extraDiceCount > 0 && (
          <div className="bg-white/60 dark:bg-iosDark-bg2/40 rounded-2xl p-3 space-y-2">
            <input
              type="number"
              inputMode="numeric"
              min={extraMin}
              max={extraMax}
              placeholder={`Suma (${extraMin}–${extraMax})`}
              value={extraDiceSum ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                onChange({ ...state, extraDiceSum: v === '' ? null : Number(v) });
              }}
              className={`w-full h-12 text-center font-display text-2xl bg-transparent tabular-nums focus:outline-none ${
                extraInvalid ? 'text-ios-red' : 'text-ios-label dark:text-iosDark-label'
              }`}
            />
            <div className="grid grid-cols-3 gap-2 text-[12px] text-center">
              <div>
                <div className="text-ios-label2 dark:text-iosDark-label2">Cobro</div>
                <div className="font-semibold text-ios-label dark:text-iosDark-label">{fmt(calc.extraRevenue)}</div>
              </div>
              <div>
                <div className="text-ios-label2 dark:text-iosDark-label2">Tu comisión</div>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(calc.extraCommission)}</div>
              </div>
              <div>
                <div className="text-ios-label2 dark:text-iosDark-label2">+ Puntos</div>
                <div className="font-semibold text-ios-accent">{calc.extraPoints}</div>
              </div>
            </div>
            {extraInvalid && (
              <p className="text-[11px] text-ios-red text-center">
                La suma debe estar entre {extraMin} y {extraMax}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Total */}
      {selectedClient && diceSum !== null && !diceSumInvalid && (
        <div className="flex items-center justify-between pt-3 border-t border-amber-200/60 dark:border-amber-500/20">
          <span className="text-[13px] font-medium text-ios-label2 dark:text-iosDark-label2">
            Total puntos del cliente
          </span>
          <span className="font-display text-3xl text-ios-accent leading-none tabular-nums">
            {calc.totalPoints}
          </span>
        </div>
      )}
    </GlassCard>
  );
};

export const emptyLigaState = (): LigaSectionState => ({
  ligaClientId: null,
  clientNameSnapshot: '',
  clientPhoneSnapshot: undefined,
  diceSum: null,
  isService: true,
  extraDiceCount: 0,
  extraDiceSum: null,
});

export const isLigaSectionValid = (s: LigaSectionState): boolean => {
  if (!s.ligaClientId) return false;
  if (s.diceSum === null || s.diceSum < 3 || s.diceSum > 18) return false;
  if (s.extraDiceCount > 0) {
    if (s.extraDiceSum === null) return false;
    const min = s.extraDiceCount;
    const max = s.extraDiceCount * 6;
    if (s.extraDiceSum < min || s.extraDiceSum > max) return false;
  }
  return true;
};

export default LigaSection;
