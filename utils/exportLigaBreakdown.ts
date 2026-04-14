import * as XLSX from 'xlsx';
import { ClientBreakdownRow, BarberBreakdownRow, TimelineRow } from './ligaBreakdown';
import { LigaClient, LigaEntry } from '../types';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-AR');
const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-AR')} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
};

const writeSheet = (rows: Record<string, unknown>[], sheetName: string, filename: string, widths: number[]) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = widths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportLigaClients = (
  rows: ClientBreakdownRow[],
  filename = 'liga-clientes'
) => {
  const sheet = rows.map((r, idx) => ({
    '#': idx + 1,
    'Cliente': r.clientName,
    'Teléfono': r.clientPhone ?? '',
    'Visitas': r.visits,
    'Puntos': r.totalPoints,
    'Dados extra': r.extraDiceBought,
    '$ generado en dados': r.extraDiceRevenue,
    'Barbero habitual': r.habitualBarberName,
    'Primera visita': fmtDate(r.firstVisit),
    'Última visita': fmtDate(r.lastVisit),
  }));
  writeSheet(sheet, 'Clientes', filename, [4, 22, 16, 8, 8, 10, 16, 18, 14, 14]);
};

export const exportLigaBarbers = (
  rows: BarberBreakdownRow[],
  filename = 'liga-barberos'
) => {
  const sheet = rows.map((r) => ({
    'Barbero': r.barberName,
    'Tiradas': r.entries,
    'Clientes únicos': r.uniqueClients,
    'Puntos emitidos': r.totalPointsEmitted,
    'Dados extra vendidos': r.extraDiceSold,
    '$ ingreso dados': r.extraDiceRevenue,
    '$ comisión barbero': r.extraDiceCommission,
    'Promedio pts/tirada': Number(r.avgPointsPerEntry.toFixed(1)),
  }));
  writeSheet(sheet, 'Barberos', filename, [22, 10, 14, 14, 18, 16, 18, 16]);
};

/** Export de TODAS las fichas de clientes de la sucursal (no solo las del mes) */
export const exportLigaFichas = (
  clients: LigaClient[],
  entries: LigaEntry[],
  month: string,
  filename = 'liga-fichas'
) => {
  const sheet = clients
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((c) => {
      const my = entries.filter((e) => e.ligaClientId === c.id);
      const myMonth = my.filter((e) => e.month === month);
      return {
        'Código': c.code,
        'Nombre': c.name,
        'Teléfono': c.phone ?? '',
        'Notas': c.notes ?? '',
        'Alta': c.createdAt ? fmtDate(c.createdAt) : '',
        'Tiradas histórico': my.length,
        'Puntos histórico': my.reduce((s, e) => s + e.totalPoints, 0),
        'Tiradas mes': myMonth.length,
        'Puntos mes': myMonth.reduce((s, e) => s + e.totalPoints, 0),
        'Dados extra mes': myMonth.reduce((s, e) => s + e.extraDiceCount, 0),
        '$ generado mes': myMonth.reduce((s, e) => s + e.extraDiceRevenue, 0),
      };
    });
  writeSheet(sheet, 'Fichas', filename, [8, 24, 16, 20, 12, 12, 14, 12, 12, 14, 14]);
};

export const exportLigaTimeline = (
  rows: TimelineRow[],
  filename = 'liga-timeline'
) => {
  const sheet = rows.map((r) => ({
    'Fecha y hora': fmtDateTime(r.createdAt),
    'Barbero': r.barberName,
    'Cliente': r.clientName,
    'Tipo': r.isService ? 'CORTE' : 'NO CORTE',
    'Suma dados': r.diceSum,
    'Puntos servicio': r.servicePoints,
    'Dados extra': r.extraDiceCount,
    'Puntos extra': r.extraDicePoints,
    '$ dados extra': r.extraDiceRevenue,
    '$ comisión': r.extraDiceCommission,
    'Puntos total': r.totalPoints,
  }));
  writeSheet(sheet, 'Timeline', filename, [20, 18, 20, 10, 11, 14, 11, 12, 14, 14, 13]);
};
