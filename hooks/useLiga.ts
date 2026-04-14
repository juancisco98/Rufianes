/**
 * useLiga — hook para "La Liga del Corte"
 *
 * Centraliza:
 *  - Registrar entradas (al guardar un corte con la Liga activa)
 *  - Editar configuración de premios y comisiones por barbería
 *  - Calcular leaderboard mensual (agrupado por cliente, normalizado)
 *  - Cerrar el mes (snapshot del podio + notificación al admin)
 *  - Métricas/summary para el dashboard admin
 */

import { useCallback, useMemo } from 'react';
import { useDataContext } from '../context/DataContext';
import {
  LigaEntry,
  LigaConfig,
  LigaLeaderboardRow,
  LigaSummary,
  LigaMonthlyClosing,
  LigaPodiumEntry,
  AppNotification,
} from '../types';
import {
  ligaEntryToDb,
  ligaConfigToDb,
  ligaMonthlyClosingToDb,
  notificationToDb,
} from '../utils/mappers';
import { supabaseUpsert, supabaseInsert } from '../utils/supabaseHelpers';
import { generateUUID } from '../utils/uuid';
import { ALLOWED_EMAILS, LIGA_DEFAULT_CONFIG } from '../constants';
import { computeLeaderboard, currentMonth } from '../utils/ligaLeaderboard';
import {
  computeClientBreakdown,
  computeBarberBreakdown,
  ClientBreakdownRow,
  BarberBreakdownRow,
} from '../utils/ligaBreakdown';

/** Re-export para compatibilidad con consumidores existentes */
export { currentMonth };

/** Normaliza nombre del cliente para agrupar (case-insensitive, trim) */
const normalizeClientKey = (name: string): string => name.trim().toLowerCase();

export const useLiga = () => {
  const {
    ligaEntries,
    setLigaEntries,
    ligaConfigs,
    setLigaConfigs,
    ligaMonthlyClosings,
    setLigaMonthlyClosings,
    ligaClients,
    barbershops,
    barbers,
  } = useDataContext();

  // ── Config helpers ─────────────────────────────────────────────────────────

  const getConfig = useCallback(
    (barbershopId: string): LigaConfig => {
      const existing = ligaConfigs.find((c) => c.barbershopId === barbershopId);
      if (existing) return existing;
      // Default fallback (no se persiste hasta que admin edite)
      return {
        barbershopId,
        ...LIGA_DEFAULT_CONFIG,
        isActive: true,
      };
    },
    [ligaConfigs]
  );

  const saveConfig = useCallback(
    async (cfg: LigaConfig) => {
      await supabaseUpsert('liga_config', { ...ligaConfigToDb(cfg) }, 'liga_config');
      setLigaConfigs((prev) => {
        const exists = prev.some((c) => c.barbershopId === cfg.barbershopId);
        return exists
          ? prev.map((c) => (c.barbershopId === cfg.barbershopId ? cfg : c))
          : [...prev, cfg];
      });
    },
    [setLigaConfigs]
  );

  // ── Entries ────────────────────────────────────────────────────────────────

  const registerLigaEntry = useCallback(
    async (entry: LigaEntry) => {
      await supabaseUpsert('liga_entries', ligaEntryToDb(entry), 'liga_entry');
      setLigaEntries((prev) => {
        if (prev.some((e) => e.id === entry.id)) return prev;
        return [entry, ...prev];
      });
    },
    [setLigaEntries]
  );

  /**
   * Construye un LigaEntry a partir de los datos del modal de corte.
   * NO persiste — solo arma el objeto. Usar con `registerLigaEntry`.
   */
  const buildLigaEntry = useCallback(
    (params: {
      sessionId: string;
      barbershopId: string;
      barberId: string;
      clientName: string;
      clientPhone?: string;
      ligaClientId: string;      // FK a liga_clients — ahora obligatorio
      diceSum: number;           // suma total de los 3 dados (3–18)
      isService: boolean;        // true = CORTE (×multiplier), false = NO CORTE (×1)
      extraDiceCount: number;    // cuántos dados extra compró
      extraDiceSum: number;      // suma total de los dados extra
    }): LigaEntry => {
      const cfg = getConfig(params.barbershopId);
      const multiplier = params.isService ? cfg.serviceMultiplier : 1;
      const servicePoints = params.diceSum * multiplier;
      const extraDicePoints = params.extraDiceSum;
      return {
        id: generateUUID(),
        sessionId: params.sessionId,
        barbershopId: params.barbershopId,
        barberId: params.barberId,
        clientName: params.clientName.trim(),
        clientPhone: params.clientPhone?.trim() || undefined,
        ligaClientId: params.ligaClientId,
        month: currentMonth(),
        diceSum: params.diceSum,
        isService: params.isService,
        servicePoints,
        extraDiceCount: params.extraDiceCount,
        extraDicePoints,
        extraDiceRevenue: params.extraDiceCount * cfg.extraDieCost,
        extraDiceCommission: params.extraDiceCount * cfg.extraDieCommission,
        totalPoints: servicePoints + extraDicePoints,
        createdAt: new Date().toISOString(),
      };
    },
    [getConfig]
  );

  // ── Leaderboard ────────────────────────────────────────────────────────────

  const getLeaderboard = useCallback(
    (barbershopId: string, month: string): LigaLeaderboardRow[] =>
      computeLeaderboard(ligaEntries, barbershopId, month, ligaClients),
    [ligaEntries, ligaClients]
  );

  const getCurrentLeaderboard = useCallback(
    (barbershopId: string) => getLeaderboard(barbershopId, currentMonth()),
    [getLeaderboard]
  );

  // ── Summary ────────────────────────────────────────────────────────────────

  const getSummary = useCallback(
    (barbershopId: string, month: string): LigaSummary => {
      const filtered = ligaEntries.filter(
        (e) => e.barbershopId === barbershopId && e.month === month
      );
      const uniqueClients = new Set(filtered.map((e) => normalizeClientKey(e.clientName))).size;
      return {
        barbershopId,
        month,
        totalEntries: filtered.length,
        totalPoints: filtered.reduce((sum, e) => sum + e.totalPoints, 0),
        totalExtraDiceSold: filtered.reduce((sum, e) => sum + e.extraDiceCount, 0),
        totalRevenue: filtered.reduce((sum, e) => sum + e.extraDiceRevenue, 0),
        totalCommission: filtered.reduce((sum, e) => sum + e.extraDiceCommission, 0),
        uniqueClients,
      };
    },
    [ligaEntries]
  );

  // ── Cierre de mes ──────────────────────────────────────────────────────────

  const closeMonth = useCallback(
    async (barbershopId: string, month: string) => {
      const cfg = getConfig(barbershopId);
      const leaderboard = getLeaderboard(barbershopId, month);
      const summary = getSummary(barbershopId, month);

      const podium: LigaPodiumEntry[] = leaderboard.slice(0, 3).map((row) => ({
        rank: row.rank,
        clientName: row.clientName,
        points: row.totalPoints,
        prize: row.rank === 1 ? cfg.prize1 : row.rank === 2 ? cfg.prize2 : cfg.prize3,
      }));

      const totalPrizes = podium.reduce((sum, p) => sum + p.prize, 0);
      const closing: LigaMonthlyClosing = {
        id: generateUUID(),
        barbershopId,
        month,
        podium,
        totalRevenue: summary.totalRevenue,
        totalCommission: summary.totalCommission,
        totalPrizes,
        net: summary.totalRevenue - summary.totalCommission - totalPrizes,
        closedAt: new Date().toISOString(),
        closedBy: ALLOWED_EMAILS[0],
      };

      await supabaseUpsert('liga_monthly_closings', ligaMonthlyClosingToDb(closing), 'liga_closing');
      setLigaMonthlyClosings((prev) => [closing, ...prev.filter((c) => !(c.barbershopId === barbershopId && c.month === month))]);

      // Notificar al admin
      const shop = barbershops.find((b) => b.id === barbershopId);
      const notif: AppNotification = {
        id: generateUUID(),
        recipientEmail: ALLOWED_EMAILS[0] ?? 'admin',
        title: `🏆 Liga cerrada — ${shop?.name ?? 'Barbería'}`,
        message: `${month} · Top: ${podium[0]?.clientName ?? '—'} (${podium[0]?.points ?? 0} pts) · Neto: $${closing.net.toLocaleString('es-AR')}`,
        type: 'GENERAL',
        relatedId: closing.id,
        read: false,
        createdAt: new Date().toISOString(),
      };
      try {
        await supabaseInsert('notifications', notificationToDb(notif), 'liga_closing_notification');
      } catch (err) {
        console.error('[Liga.closeMonth] No se pudo crear notificación:', err);
      }

      return closing;
    },
    [getConfig, getLeaderboard, getSummary, barbershops, setLigaMonthlyClosings]
  );

  // ── Helpers de UI ──────────────────────────────────────────────────────────

  /** Métricas Liga acumuladas del mes para un barbero específico */
  const getBarberMonthMetrics = useCallback(
    (barberId: string, month: string) => {
      const filtered = ligaEntries.filter(
        (e) => e.barberId === barberId && e.month === month
      );
      const uniqueClients = new Set(
        filtered.map((e) => normalizeClientKey(e.clientName))
      ).size;
      return {
        entries: filtered.length,
        uniqueClients,
        totalPointsEmitted: filtered.reduce((s, e) => s + e.totalPoints, 0),
        extraDiceSold: filtered.reduce((s, e) => s + e.extraDiceCount, 0),
        extraDiceRevenue: filtered.reduce((s, e) => s + e.extraDiceRevenue, 0),
        extraDiceCommission: filtered.reduce((s, e) => s + e.extraDiceCommission, 0),
      };
    },
    [ligaEntries]
  );

  /** Ranking de barberos dentro de una sucursal — para "mi posición" */
  const getBarberRankingInShop = useCallback(
    (barbershopId: string, month: string): BarberBreakdownRow[] =>
      computeBarberBreakdown(ligaEntries, barbers, barbershopId, month),
    [ligaEntries, barbers]
  );

  /** Clientes atendidos por un barbero específico este mes */
  const getBarberClientsThisMonth = useCallback(
    (barberId: string, barbershopId: string, month: string): ClientBreakdownRow[] => {
      const myEntries = ligaEntries.filter((e) => e.barberId === barberId);
      return computeClientBreakdown(myEntries, barbers, barbershopId, month, ligaClients);
    },
    [ligaEntries, barbers, ligaClients]
  );

  /** Métricas Liga del barbero para el día actual (motivacional) */
  const getBarberLigaTodayMetrics = useCallback(
    (barberId: string) => {
      const today = new Date().toISOString().slice(0, 10);
      const todayEntries = ligaEntries.filter(
        (e) => e.barberId === barberId && e.createdAt.slice(0, 10) === today
      );
      return {
        entries: todayEntries.length,
        totalPoints: todayEntries.reduce((sum, e) => sum + e.totalPoints, 0),
        extraDiceSold: todayEntries.reduce((sum, e) => sum + e.extraDiceCount, 0),
        commission: todayEntries.reduce((sum, e) => sum + e.extraDiceCommission, 0),
      };
    },
    [ligaEntries]
  );

  /** Comisión Liga del barbero en el rango de un cierre de turno (un día) */
  const getBarberLigaCommissionForDate = useCallback(
    (barberId: string, date: string): number => {
      return ligaEntries
        .filter((e) => e.barberId === barberId && e.createdAt.slice(0, 10) === date)
        .reduce((sum, e) => sum + e.extraDiceCommission, 0);
    },
    [ligaEntries]
  );

  /** Ingreso bruto de dados extra (cobrado al cliente) del barbero en ese día.
   *  Es efectivo físico en manos del barbero al cierre (nunca tarjeta/transferencia).
   */
  const getBarberLigaRevenueForDate = useCallback(
    (barberId: string, date: string): number => {
      return ligaEntries
        .filter((e) => e.barberId === barberId && e.createdAt.slice(0, 10) === date)
        .reduce((sum, e) => sum + e.extraDiceRevenue, 0);
    },
    [ligaEntries]
  );

  /** Cantidad de dados extra vendidos por el barbero en esa fecha */
  const getBarberLigaDiceCountForDate = useCallback(
    (barberId: string, date: string): number => {
      return ligaEntries
        .filter((e) => e.barberId === barberId && e.createdAt.slice(0, 10) === date)
        .reduce((sum, e) => sum + e.extraDiceCount, 0);
    },
    [ligaEntries]
  );

  /** Lista de barberías con liga habilitada (para mostrar en sidebar admin) */
  const ligaEnabledShops = useMemo(
    () => barbershops.filter((s) => s.ligaEnabled === true),
    [barbershops]
  );

  return {
    // estado
    ligaEntries,
    ligaConfigs,
    ligaMonthlyClosings,
    ligaEnabledShops,
    // entries
    registerLigaEntry,
    buildLigaEntry,
    // config
    getConfig,
    saveConfig,
    // métricas
    getLeaderboard,
    getCurrentLeaderboard,
    getSummary,
    getBarberLigaTodayMetrics,
    getBarberLigaCommissionForDate,
    getBarberLigaRevenueForDate,
    getBarberLigaDiceCountForDate,
    getBarberMonthMetrics,
    getBarberRankingInShop,
    getBarberClientsThisMonth,
    // cierre
    closeMonth,
    // util
    currentMonth,
  };
};
