import React from 'react';
import { X, FileSpreadsheet, CheckCircle2, Info } from 'lucide-react';
import { ParseResult } from '../types/excel';
import { formatCurrency } from '../utils/exportHelpers';

interface RawInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  parseResult: ParseResult;
}

export const RawInspectorModal: React.FC<RawInspectorModalProps> = ({
  isOpen,
  onClose,
  parseResult
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Ayrıştırma Raporu & Ham Veri İnceleme
              </h3>
              <p className="text-xs text-slate-500">
                {parseResult.fileName} ({parseResult.sheetName})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500">Taranan Toplam Satır</span>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                {parseResult.totalRowsScanned} Satır
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500">Elenen Üst Başlıklar</span>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                {parseResult.skippedHeaderRows} Başlık
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500">Ayıklanan Ürün Kalemi</span>
              <div className="text-base font-bold text-emerald-700 font-mono mt-0.5">
                {parseResult.items.length} Kalem
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500">Bulunan Sipariş Sayısı</span>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                {parseResult.orderCount} Sipariş
              </div>
            </div>
          </div>

          {/* D Column Total Reconciliation Details */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-emerald-950">
                D Sütunu Dip Toplam Doğrulama Durumu
              </div>
              <p className="mt-1 leading-relaxed text-emerald-800">
                Excel'in en altındaki D sütunu / dip toplam hücresinden okunan tutar:{' '}
                <strong className="font-mono font-bold">{formatCurrency(parseResult.reconciliation.excelGrandTotal)}</strong>.
                Ayıklanan {parseResult.items.length} kalem ürünün toplamı:{' '}
                <strong className="font-mono font-bold">{formatCurrency(parseResult.reconciliation.calculatedGrandTotal)}</strong>.
                Kuruş farkı: <strong className="font-mono font-bold">{formatCurrency(parseResult.reconciliation.difference)}</strong>.
              </p>
            </div>
          </div>

          {/* Raw Excel Row Sample */}
          {parseResult.rawPreview && parseResult.rawPreview.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-800">
                <Info className="w-4 h-4 text-slate-400" />
                <span>İlk 15 Ham Excel Satırı (Algılama Önizlemesi)</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60 text-[11px] font-mono">
                <table className="w-full text-left divide-y divide-slate-200">
                  <tbody className="divide-y divide-slate-100">
                    {parseResult.rawPreview.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        <td className="py-1 px-2.5 bg-slate-100 font-bold text-slate-500 text-center w-10">
                          {rIdx + 1}
                        </td>
                        <td className="py-1 px-3 text-slate-700 whitespace-nowrap">
                          {row.filter(c => Boolean(c)).slice(0, 8).join(' | ') || '(Boş satır)'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
