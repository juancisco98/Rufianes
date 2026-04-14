import React from 'react';
import { X, Download, Scissors, DollarSign, TrendingUp, Banknote, CreditCard, ArrowLeftRight, Receipt, Clock, ShieldCheck, Calculator } from 'lucide-react';
import { ShiftClosingMetadata } from '../types';
import { exportShiftClosingToXlsx } from '../utils/exportShiftClosing';
import { toast } from 'sonner';
import { ARS_DENOMINATIONS } from './CashAuditSection';

interface ShiftClosingDetailModalProps {
  metadata: ShiftClosingMetadata;
  onClose: () => void;
}

const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`;

const ShiftClosingDetailModal: React.FC<ShiftClosingDetailModalProps> = ({ metadata, onClose }) => {
  const handleDownload = () => {
    try {
      exportShiftClosingToXlsx(metadata);
      toast.success('Excel descargado');
    } catch {
      toast.error('Error al descargar el archivo');
    }
  };

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-iosDark-bg2 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-ios-divider dark:border-iosDark-divider shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">Turno cerrado</span>
              {metadata.isManager && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Encargado
                </span>
              )}
            </div>
            <h2 className="font-black text-lg text-gray-900 dark:text-white">{metadata.barberName}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">{metadata.barbershopName} · {metadata.shiftDate}</p>
            {(metadata.startedAt || metadata.closedAt) && (
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500 dark:text-slate-400">
                <Clock className="w-3 h-3" />
                <span>
                  {metadata.startedAt && new Date(metadata.startedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  {metadata.startedAt && metadata.closedAt && ' → '}
                  {metadata.closedAt && new Date(metadata.closedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-ios-grouped dark:hover:bg-iosDark-grouped rounded-full text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4">

          {/* Stats principales */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4">
              <Scissors className="w-4 h-4 text-amber-500 mb-1.5" />
              <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{metadata.totalCuts}</p>
              <p className="text-xs text-amber-600 font-semibold mt-0.5">Cortes</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-4">
              <DollarSign className="w-4 h-4 text-emerald-500 mb-1.5" />
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{fmt(metadata.totalRevenue)}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">Revenue total</p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl p-4">
              <TrendingUp className="w-4 h-4 text-indigo-500 mb-1.5" />
              <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{fmt(metadata.totalCommission)}</p>
              <p className="text-xs text-indigo-600 font-semibold mt-0.5">Comisión</p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4">
              <Banknote className="w-4 h-4 text-slate-500 mb-1.5" />
              <p className="text-2xl font-black text-slate-700 dark:text-slate-300">{fmt(metadata.netCashToHand)}</p>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Efectivo a entregar</p>
            </div>
          </div>

          {/* Desglose por método de pago */}
          <div className="bg-ios-grouped dark:bg-iosDark-grouped/50 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Método de pago</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Efectivo</span>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(metadata.totalCash)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Tarjeta</span>
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{fmt(metadata.totalCard)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Transferencia</span>
                </div>
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{fmt(metadata.totalTransfer)}</span>
              </div>
            </div>
          </div>

          {/* Gastos */}
          {metadata.expensesDetail.length > 0 && (
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="w-4 h-4 text-red-500" />
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider">Gastos ({fmt(metadata.expensesCash)})</h3>
              </div>
              <div className="space-y-1.5">
                {metadata.expensesDetail.map((exp, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-slate-300">{exp.description}</span>
                    <span className="font-bold text-red-600 dark:text-red-400">-{fmt(exp.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auditoría de caja (encargado) */}
          {metadata.cashAudit && (
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 border-2 border-amber-200 dark:border-amber-500/30">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Auditoría de caja
                </h3>
              </div>
              {/* Denominaciones contadas */}
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {ARS_DENOMINATIONS.filter(d => (metadata.cashAudit!.denominations[String(d)] ?? 0) > 0).map(d => {
                  const count = metadata.cashAudit!.denominations[String(d)] ?? 0;
                  return (
                    <div key={d} className="flex items-center justify-between text-[12px] px-2 py-1 rounded-lg bg-white/60 dark:bg-iosDark-bg2/60">
                      <span className="text-gray-600 dark:text-slate-300 tabular-nums">
                        ${d.toLocaleString('es-AR')} × {count}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                        {fmt(count * d)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Comparación */}
              <div className="space-y-1 text-[13px] border-t border-amber-200 dark:border-amber-500/20 pt-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Esperado</span>
                  <span className="font-semibold tabular-nums">{fmt(metadata.cashAudit.expectedTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400 flex items-center gap-1">
                    <Calculator className="w-3 h-3" /> Contado
                  </span>
                  <span className="font-semibold tabular-nums">{fmt(metadata.cashAudit.countedTotal)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-amber-200/60 dark:border-amber-500/20">
                  <span className="font-bold text-gray-900 dark:text-white">Diferencia</span>
                  <span
                    className={`font-black text-base tabular-nums ${
                      metadata.cashAudit.difference === 0
                        ? 'text-emerald-600'
                        : metadata.cashAudit.difference > 0
                        ? 'text-blue-600'
                        : 'text-ios-red'
                    }`}
                  >
                    {metadata.cashAudit.difference >= 0 ? '+' : ''}
                    {fmt(metadata.cashAudit.difference)}
                  </span>
                </div>
              </div>
              {metadata.cashAudit.notes && (
                <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-2 italic">
                  "{metadata.cashAudit.notes}"
                </p>
              )}
            </div>
          )}

          {/* Resumen final */}
          <div className="border-t border-ios-divider dark:border-iosDark-divider pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">Revenue total</span>
              <span className="font-bold text-gray-900 dark:text-white">{fmt(metadata.totalRevenue)}</span>
            </div>
            {metadata.expensesCash > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-slate-400">Gastos efectivo</span>
                <span className="font-bold text-red-500">-{fmt(metadata.expensesCash)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black">
              <span className="text-gray-900 dark:text-white">Efectivo a entregar</span>
              <span className="text-amber-500">{fmt(metadata.netCashToHand)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-ios-divider dark:border-iosDark-divider shrink-0 flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-semibold text-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Descargar Excel
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShiftClosingDetailModal;
