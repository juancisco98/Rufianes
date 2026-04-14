import React from 'react';
import { Trophy, Crown, Medal } from 'lucide-react';
import { LigaLeaderboardRow } from '../../types';
import { GlassCard } from '../ui';
import EmptyState from '../ui/EmptyState';

interface LeaderboardProps {
  rows: LigaLeaderboardRow[];
  prizeLabel?: string;
  /** Si se pasa, resalta esta fila (ej: el cliente actual del barbero) */
  highlightClientName?: string;
  limit?: number;
  /** Mostrar el podio visual hero arriba (default true) */
  showPodiumHero?: boolean;
  /** Tamaño de la tabla — útil para el dashboard público */
  tableSize?: 'sm' | 'md' | 'lg';
}

const RANK_COLORS = [
  { bg: 'from-amber-400 to-amber-600', text: 'text-amber-50', icon: Crown, label: 'ORO' },
  { bg: 'from-slate-300 to-slate-500', text: 'text-slate-50', icon: Medal, label: 'PLATA' },
  { bg: 'from-orange-400 to-orange-700', text: 'text-orange-50', icon: Medal, label: 'BRONCE' },
];

const SIZES = {
  sm: { row: 'py-2.5 px-3', name: 'text-[14px]', sub: 'text-[11px]', pts: 'text-xl', dif: 'text-[12px]', rank: 'w-7 h-7 text-[12px]' },
  md: { row: 'py-3 px-4', name: 'text-[15px]', sub: 'text-[12px]', pts: 'text-2xl', dif: 'text-[13px]', rank: 'w-8 h-8 text-[13px]' },
  lg: { row: 'py-4 px-5', name: 'text-lg',     sub: 'text-[13px]', pts: 'text-3xl', dif: 'text-base', rank: 'w-10 h-10 text-base' },
};

export const Leaderboard: React.FC<LeaderboardProps> = ({
  rows,
  prizeLabel = 'Tarjeta Nike',
  highlightClientName,
  limit = 20,
  showPodiumHero = true,
  tableSize = 'md',
}) => {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="w-7 h-7" />}
        title="Sin participantes este mes"
        description="Apenas registres el primer corte con dados, el ranking aparece acá."
      />
    );
  }

  const displayed = rows.slice(0, limit);
  const podium = showPodiumHero ? displayed.slice(0, 3) : [];
  const tableRows = showPodiumHero ? displayed.slice(3) : displayed;
  const hk = highlightClientName?.trim().toLowerCase();
  const leader = rows[0];
  const sz = SIZES[tableSize];

  return (
    <div className="space-y-3">
      {/* Podio visual (top 3) */}
      {podium.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {/* Reordenar visualmente: 2 - 1 - 3 */}
          {[1, 0, 2].map((idx) => {
            const row = podium[idx];
            if (!row) return <div key={idx} />;
            const rc = RANK_COLORS[idx];
            const Icon = rc.icon;
            const heightClass = idx === 0 ? 'h-32' : idx === 1 ? 'h-24' : 'h-20';
            return (
              <div key={idx} className="flex flex-col items-center justify-end">
                <div className={`w-full ${heightClass} rounded-2xl bg-gradient-to-b ${rc.bg} flex flex-col items-center justify-end p-2 shadow-ios`}>
                  <Icon className={`w-5 h-5 ${rc.text} mb-1`} />
                  <div className="font-display text-2xl text-white leading-none">{idx + 1}°</div>
                  <div className={`text-[10px] font-bold ${rc.text} uppercase tracking-wider mt-1`}>
                    {rc.label}
                  </div>
                </div>
                <div className="text-center mt-2 w-full">
                  <div className="text-[12px] font-semibold text-ios-label dark:text-iosDark-label truncate px-1">
                    {row.clientName}
                  </div>
                  <div className="text-[11px] text-ios-accent font-bold">{row.totalPoints} pts</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabla estilo fútbol — todo el ranking visible (incluyendo top 3 si no hay podio hero) */}
      {(showPodiumHero ? tableRows.length > 0 : displayed.length > 0) && (
        <GlassCard variant="solid" padding="none" className="overflow-hidden">
          {/* Header */}
          <div className={`grid grid-cols-[2.5rem_1fr_3.5rem_3rem] gap-2 items-center ${sz.row} bg-ios-grouped dark:bg-iosDark-grouped border-b border-ios-divider dark:border-iosDark-divider`}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ios-label2 dark:text-iosDark-label2 text-center">
              #
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ios-label2 dark:text-iosDark-label2">
              Cliente
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ios-label2 dark:text-iosDark-label2 text-right">
              Pts
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ios-label2 dark:text-iosDark-label2 text-right">
              Dif
            </div>
          </div>

          {/* Filas */}
          {(showPodiumHero ? tableRows : displayed).map((row, idx, arr) => {
            const isMine = hk && row.clientName.trim().toLowerCase() === hk;
            const isLeader = row.rank === 1;
            const diff = isLeader ? 0 : leader.totalPoints - row.totalPoints;
            const rankColor = row.rank === 1
              ? 'bg-amber-500 text-white'
              : row.rank === 2
              ? 'bg-slate-400 text-white'
              : row.rank === 3
              ? 'bg-orange-500 text-white'
              : 'bg-ios-grouped dark:bg-iosDark-grouped text-ios-label2 dark:text-iosDark-label2';

            return (
              <React.Fragment key={`${row.clientName}-${idx}`}>
                <div
                  className={[
                    'grid grid-cols-[2.5rem_1fr_3.5rem_3rem] gap-2 items-center',
                    sz.row,
                    isMine ? 'bg-amber-50 dark:bg-amber-500/10' : '',
                  ].join(' ')}
                >
                  {/* Pos */}
                  <div className="flex justify-center">
                    <div className={`${sz.rank} rounded-full flex items-center justify-center font-bold tabular-nums ${rankColor}`}>
                      {row.rank}
                    </div>
                  </div>
                  {/* Cliente */}
                  <div className="min-w-0">
                    <div className={`${sz.name} text-ios-label dark:text-iosDark-label truncate font-medium flex items-center gap-1.5`}>
                      <span className="truncate">{row.clientName}</span>
                      {row.clientCode && (
                        <span className="text-[10px] text-amber-600 tabular-nums shrink-0">
                          #{row.clientCode}
                        </span>
                      )}
                    </div>
                    <div className={`${sz.sub} text-ios-label2 dark:text-iosDark-label2`}>
                      {row.visits} visita{row.visits !== 1 ? 's' : ''}
                      {row.extraDiceBought > 0 && ` · ${row.extraDiceBought} dados extra`}
                    </div>
                  </div>
                  {/* Pts */}
                  <div className="text-right">
                    <div className={`font-display ${sz.pts} text-ios-accent leading-none tabular-nums`}>
                      {row.totalPoints}
                    </div>
                  </div>
                  {/* Dif */}
                  <div className="text-right">
                    {isLeader ? (
                      <span className={`${sz.dif} text-ios-label3 dark:text-iosDark-label3`}>—</span>
                    ) : (
                      <span className={`${sz.dif} font-semibold tabular-nums text-ios-red`}>
                        -{diff}
                      </span>
                    )}
                  </div>
                </div>
                {idx < arr.length - 1 && (
                  <div className="ml-12 h-px bg-ios-divider dark:bg-iosDark-divider" />
                )}
              </React.Fragment>
            );
          })}
        </GlassCard>
      )}

      {/* Pie con info de premios */}
      {showPodiumHero && podium.length > 0 && (
        <p className="text-[11px] text-center text-ios-label2 dark:text-iosDark-label2">
          Top 3 ganan {prizeLabel} al cierre del mes
        </p>
      )}
    </div>
  );
};

export default Leaderboard;
