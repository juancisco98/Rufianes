/**
 * useLigaClients — gestión de fichas de clientes de la Liga del Corte.
 * Cada cliente tiene un código numérico de 4 dígitos único por barbería.
 */

import { useCallback } from 'react';
import { useDataContext } from '../context/DataContext';
import { LigaClient } from '../types';
import { ligaClientToDb } from '../utils/mappers';
import { supabaseInsert, supabaseUpdate, supabaseDelete } from '../utils/supabaseHelpers';
import { generateUUID } from '../utils/uuid';

const normalizeName = (s: string) => s.trim().toLowerCase();

/** Devuelve el próximo código libre (4 dígitos) para esa sucursal */
const nextCode = (existing: LigaClient[]): string => {
  const used = new Set(existing.map((c) => c.code));
  for (let i = 1; i <= 9999; i++) {
    const code = String(i).padStart(4, '0');
    if (!used.has(code)) return code;
  }
  throw new Error('Se alcanzó el máximo de clientes (9999) en esta barbería.');
};

export const useLigaClients = () => {
  const { ligaClients, setLigaClients } = useDataContext();

  const getClientsForShop = useCallback(
    (barbershopId: string): LigaClient[] =>
      ligaClients
        .filter((c) => c.barbershopId === barbershopId)
        .sort((a, b) => a.code.localeCompare(b.code)),
    [ligaClients]
  );

  const getClientById = useCallback(
    (id: string): LigaClient | undefined => ligaClients.find((c) => c.id === id),
    [ligaClients]
  );

  const getClientByCode = useCallback(
    (barbershopId: string, code: string): LigaClient | undefined =>
      ligaClients.find((c) => c.barbershopId === barbershopId && c.code === code.padStart(4, '0')),
    [ligaClients]
  );

  /** Búsqueda: por código exacto (si la query es numérica) o por substring de nombre */
  const searchClients = useCallback(
    (barbershopId: string, query: string, limit = 8): LigaClient[] => {
      const q = query.trim().toLowerCase();
      if (!q) return getClientsForShop(barbershopId).slice(0, limit);
      const forShop = getClientsForShop(barbershopId);
      // Código exacto o prefijo numérico
      if (/^\d+$/.test(q)) {
        const padded = q.padStart(4, '0');
        const byCode = forShop.filter((c) => c.code === padded || c.code.startsWith(q));
        if (byCode.length > 0) return byCode.slice(0, limit);
      }
      // Nombre contiene
      return forShop
        .filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q))
        .slice(0, limit);
    },
    [getClientsForShop]
  );

  const createClient = useCallback(
    async (params: {
      barbershopId: string;
      name: string;
      phone?: string;
      notes?: string;
    }): Promise<LigaClient> => {
      const shopClients = ligaClients.filter((c) => c.barbershopId === params.barbershopId);
      // Validar duplicado por nombre (case-insensitive) antes de mandar a DB
      const dup = shopClients.find((c) => normalizeName(c.name) === normalizeName(params.name));
      if (dup) {
        throw Object.assign(new Error(`Ya existe un cliente con ese nombre (#${dup.code}: ${dup.name})`), { code: 'DUP_NAME' });
      }
      const code = nextCode(shopClients);
      const client: LigaClient = {
        id: generateUUID(),
        barbershopId: params.barbershopId,
        code,
        name: params.name.trim(),
        phone: params.phone?.trim() || undefined,
        notes: params.notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      await supabaseInsert('liga_clients', ligaClientToDb(client), 'liga_client');
      // Optimistic update — realtime también lo cargará, pero el dedupe lo maneja
      setLigaClients((prev) => {
        if (prev.some((c) => c.id === client.id)) return prev;
        return [...prev, client];
      });
      return client;
    },
    [ligaClients, setLigaClients]
  );

  const updateClient = useCallback(
    async (client: LigaClient): Promise<void> => {
      await supabaseUpdate('liga_clients', client.id, ligaClientToDb(client), 'liga_client');
      setLigaClients((prev) => prev.map((c) => (c.id === client.id ? client : c)));
    },
    [setLigaClients]
  );

  const deleteClient = useCallback(
    async (id: string): Promise<void> => {
      await supabaseDelete('liga_clients', id, 'liga_client');
      setLigaClients((prev) => prev.filter((c) => c.id !== id));
    },
    [setLigaClients]
  );

  return {
    ligaClients,
    getClientsForShop,
    getClientById,
    getClientByCode,
    searchClients,
    createClient,
    updateClient,
    deleteClient,
  };
};
