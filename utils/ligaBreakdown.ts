/**
 * Agregadores puros para el panel admin "Desglose" de la Liga del Corte.
 * Reciben LigaEntry[] + Barber[] y devuelven filas per-cliente, per-barbero y timeline.
 */

import { LigaEntry, Barber, LigaClient } from '../types';
import { clientGroupKey } from './ligaLeaderboard';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ClientBreakdownRow {
  ligaClientId?: string;         // undefined para filas viejas agrupadas por nombre
  clientCode?: string;            // 4 dígitos si hay ficha asociada
  clientName: string;
  clientPhone?: string;
  visits: number;
  totalPoints: number;
  extraDiceBought: number;
  extraDiceRevenue: number;       // $ que gastó el cliente en dados extra
  firstVisit: string;
  lastVisit: string;
  habitualBarberId: string;
  habitualBarberName: string;
  entryIds: string[];              // ids de las tiradas (para expand detail)
}

export interface BarberBreakdownRow {
  barberId: string;
  barberName: string;
  entries: number;
  uniqueClients: number;
  totalPointsEmitted: number;
  extraDiceSold: number;
  extraDiceRevenue: number;
  extraDiceCommission: number;
  avgPointsPerEntry: number;
}

export interface TimelineRow {
  id: string;
  createdAt: string;
  barberId: string;
  barberName: string;
  clientName: string;
  diceSum: number;
  isService: boolean;
  servicePoints: number;
  extraDiceCount: number;
  extraDicePoints: number;
  extraDiceRevenue: number;
  extraDiceCommission: number;
  totalPoints: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const filterForShopMonth = (entries: LigaEntry[], shopId: string, month: string) =>
  entries.filter((e) => e.barbershopId === shopId && e.month === month);

const barberName = (barbers: Barber[], id: string): string =>
  barbers.find((b) => b.id === id)?.name ?? '—';

// ─── Client breakdown ──────────────────────────────────────────────────────────

export function computeClientBreakdown(
  entries: LigaEntry[],
  barbers: Barber[],
  barbershopId: string,
  month: string,
  clients: LigaClient[] = []
): ClientBreakdownRow[] {
  const filtered = filterForShopMonth(entries, barbershopId, month);

  // Orden cronológico para que firstVisit/lastVisit sean consistentes.
  const chronological = [...filtered].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );

  type Acc = {
    ligaClientId?: string;
    displayName: string;
    phone?: string;
    visits: number;
    totalPoints: number;
    extraDiceBought: number;
    extraDiceRevenue: number;
    firstVisit: string;
    lastVisit: string;
    barberCounts: Map<string, number>;
    entryIds: string[];
  };

  const groups = new Map<string, Acc>();

  for (const e of chronological) {
    const key = clientGroupKey(e);
    let g = groups.get(key);
    if (!g) {
      g = {
        ligaClientId: e.ligaClientId,
        displayName: e.clientName.trim(),
        phone: e.clientPhone,
        visits: 0,
        totalPoints: 0,
        extraDiceBought: 0,
        extraDiceRevenue: 0,
        firstVisit: e.createdAt,
        lastVisit: e.createdAt,
        barberCounts: new Map(),
        entryIds: [],
      };
      groups.set(key, g);
    }
    g.visits += 1;
    g.totalPoints += e.totalPoints;
    g.extraDiceBought += e.extraDiceCount;
    g.extraDiceRevenue += e.extraDiceRevenue;
    g.lastVisit = e.createdAt;
    g.barberCounts.set(e.barberId, (g.barberCounts.get(e.barberId) ?? 0) + 1);
    g.entryIds.push(e.id);
    if (!g.phone && e.clientPhone) g.phone = e.clientPhone;
  }

  return Array.from(groups.values())
    .map<ClientBreakdownRow>((g) => {
      let habitualBarberId = '';
      let maxCount = -1;
      for (const [barberId, count] of g.barberCounts) {
        if (count > maxCount) {
          maxCount = count;
          habitualBarberId = barberId;
        }
      }
      const client = g.ligaClientId ? clients.find((c) => c.id === g.ligaClientId) : undefined;
      return {
        ligaClientId: g.ligaClientId,
        clientCode: client?.code,
        clientName: client?.name ?? g.displayName,
        clientPhone: client?.phone ?? g.phone,
        visits: g.visits,
        totalPoints: g.totalPoints,
        extraDiceBought: g.extraDiceBought,
        extraDiceRevenue: g.extraDiceRevenue,
        firstVisit: g.firstVisit,
        lastVisit: g.lastVisit,
        habitualBarberId,
        habitualBarberName: barberName(barbers, habitualBarberId),
        entryIds: g.entryIds,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

// ─── Barber breakdown ──────────────────────────────────────────────────────────

export function computeBarberBreakdown(
  entries: LigaEntry[],
  barbers: Barber[],
  barbershopId: string,
  month: string
): BarberBreakdownRow[] {
  const filtered = filterForShopMonth(entries, barbershopId, month);

  type Acc = {
    entries: number;
    clients: Set<string>;
    totalPointsEmitted: number;
    extraDiceSold: number;
    extraDiceRevenue: number;
    extraDiceCommission: number;
  };

  const groups = new Map<string, Acc>();
  for (const e of filtered) {
    let g = groups.get(e.barberId);
    if (!g) {
      g = {
        entries: 0,
        clients: new Set(),
        totalPointsEmitted: 0,
        extraDiceSold: 0,
        extraDiceRevenue: 0,
        extraDiceCommission: 0,
      };
      groups.set(e.barberId, g);
    }
    g.entries += 1;
    g.clients.add(clientGroupKey(e));
    g.totalPointsEmitted += e.totalPoints;
    g.extraDiceSold += e.extraDiceCount;
    g.extraDiceRevenue += e.extraDiceRevenue;
    g.extraDiceCommission += e.extraDiceCommission;
  }

  return Array.from(groups.entries())
    .map<BarberBreakdownRow>(([barberId, g]) => ({
      barberId,
      barberName: barberName(barbers, barberId),
      entries: g.entries,
      uniqueClients: g.clients.size,
      totalPointsEmitted: g.totalPointsEmitted,
      extraDiceSold: g.extraDiceSold,
      extraDiceRevenue: g.extraDiceRevenue,
      extraDiceCommission: g.extraDiceCommission,
      avgPointsPerEntry: g.entries > 0 ? g.totalPointsEmitted / g.entries : 0,
    }))
    .sort((a, b) => b.extraDiceCommission - a.extraDiceCommission);
}

// ─── Timeline ──────────────────────────────────────────────────────────────────

export function computeTimeline(
  entries: LigaEntry[],
  barbers: Barber[],
  barbershopId: string,
  month: string
): TimelineRow[] {
  const filtered = filterForShopMonth(entries, barbershopId, month);
  return [...filtered]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map<TimelineRow>((e) => ({
      id: e.id,
      createdAt: e.createdAt,
      barberId: e.barberId,
      barberName: barberName(barbers, e.barberId),
      clientName: e.clientName,
      diceSum: e.diceSum,
      isService: e.isService,
      servicePoints: e.servicePoints,
      extraDiceCount: e.extraDiceCount,
      extraDicePoints: e.extraDicePoints,
      extraDiceRevenue: e.extraDiceRevenue,
      extraDiceCommission: e.extraDiceCommission,
      totalPoints: e.totalPoints,
    }));
}
