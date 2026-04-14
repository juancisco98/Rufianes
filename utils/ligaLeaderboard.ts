/**
 * Leaderboard puro — sin dependencias de React/Context.
 * Usado por useLiga (admin/barbero) y por LigaPublicDashboard (clientes sin login).
 */

import { LigaEntry, LigaClient, LigaLeaderboardRow } from '../types';

export const normalizeClientKey = (name: string): string => name.trim().toLowerCase();

/** Clave canónica de agrupación: prioriza ligaClientId sobre el nombre normalizado. */
export const clientGroupKey = (e: { ligaClientId?: string; clientName: string }): string =>
  e.ligaClientId ? `id:${e.ligaClientId}` : `name:${normalizeClientKey(e.clientName)}`;

/**
 * Construye el leaderboard mensual a partir de las entries.
 * Agrupa por nombre normalizado, suma puntos, ordena desc.
 * Desempate: quien alcanzó primero el puntaje (timestamp de la primera entry).
 */
export function computeLeaderboard(
  entries: LigaEntry[],
  barbershopId: string,
  month: string,
  clients: LigaClient[] = []
): LigaLeaderboardRow[] {
  const filtered = entries.filter(
    (e) => e.barbershopId === barbershopId && e.month === month
  );

  const groups = new Map<
    string,
    {
      ligaClientId?: string;
      displayName: string;
      phone?: string;
      totalPoints: number;
      visits: number;
      extraDiceBought: number;
      lastVisit: string;
      firstReachedAt: string;
    }
  >();

  // Procesar en orden cronológico
  const chronological = [...filtered].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );

  for (const e of chronological) {
    const key = clientGroupKey(e);
    const g = groups.get(key);
    if (g) {
      g.totalPoints += e.totalPoints;
      g.visits += 1;
      g.extraDiceBought += e.extraDiceCount;
      g.lastVisit = e.createdAt;
    } else {
      groups.set(key, {
        ligaClientId: e.ligaClientId,
        displayName: e.clientName.trim(),
        phone: e.clientPhone,
        totalPoints: e.totalPoints,
        visits: 1,
        extraDiceBought: e.extraDiceCount,
        lastVisit: e.createdAt,
        firstReachedAt: e.createdAt,
      });
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.firstReachedAt.localeCompare(b.firstReachedAt);
    })
    .map<LigaLeaderboardRow>((g, idx) => {
      const client = g.ligaClientId ? clients.find((c) => c.id === g.ligaClientId) : undefined;
      return ({
      rank: idx + 1,
      ligaClientId: g.ligaClientId,
      clientCode: client?.code,
      clientName: client?.name ?? g.displayName,
      clientPhone: client?.phone ?? g.phone,
      totalPoints: g.totalPoints,
      visits: g.visits,
      extraDiceBought: g.extraDiceBought,
      lastVisit: g.lastVisit,
      reachedTopAt: g.firstReachedAt,
    });
  });
}

/** Mes actual en formato YYYY-MM */
export const currentMonth = (): string => new Date().toISOString().slice(0, 7);
