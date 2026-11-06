import React, { useState, useMemo } from 'react';
import {
  X,
  Wand2,
  Check,
  Search,
  Scale,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import { ExtractedProductItem } from '../types/excel';
import { formatCurrency, formatNumber } from '../utils/exportHelpers';

export interface BalanceItemComparison {
  item: ExtractedProductItem;
  oldFiyat: number;
  newFiyat: number;
  deltaFiyat: number;
  oldToplamTutar: number;
  newToplamTutar: number;
  deltaTutar: number;
  isModified: boolean;
}

interface BalancePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  originalItems: ExtractedProductItem[];
  balancedItems: ExtractedProductItem[];
  excelGrandTotal: number;
  currentGrandTotal: number;
  targetMode: 'kdvDahil' | 'kdvHaric';
}

export const BalancePreviewModal: React.FC<BalancePreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  originalItems,
  balancedItems,
  excelGrandTotal,
  currentGrandTotal,
  targetMode
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'modifiedOnly'>('all');

  const difference = Math.round(Math.abs(excelGrandTotal - currentGrandTotal) * 100) / 100;

  // Build comparison rows between original and balanced items
  const comparisons = useMemo<BalanceItemComparison[]>(() => {
    const balancedMap = new Map<string, ExtractedProductItem>();
    balancedItems.forEach(b => balancedMap.set(b.id, b));

    return originalItems.map(orig => {
      const balanced = balancedMap.get(orig.id) || orig;
      const oldFiyat = orig.kdvHaricFiyat;
      const newFiyat = balanced.kdvHaricFiyat;
      const deltaFiyat = Math.round((newFiyat - oldFiyat) * 100) / 100;

      const oldToplamTutar = orig.toplamTutar;
      const newToplamTutar = balanced.toplamTutar;
      const deltaTutar = Math.round((newToplamTutar - oldToplamTutar) * 100) / 100;

      const isModified = Math.abs(deltaFiyat) > 0.0001 || Math.abs(deltaTutar) > 0.0001;

      return {
        item: balanced,
        oldFiyat,
        newFiyat,
        deltaFiyat,
        oldToplamTutar,
        newToplamTutar,
        deltaTutar,
        isModified
      };
    });
  }, [originalItems, balancedItems]);

  const modifiedCount = useMemo(() => {
    return comparisons.filter(c => c.isModified).length;
  }, [comparisons]);

  // Filtered list
  const filteredComparisons = useMemo(() => {
    let list = comparisons;

    if (filterMode === 'modifiedOnly') {
      list = list.filter(c => c.isModified);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => c.item.stokAdi.toLowerCase().includes(q));
    }

    return list;
  }, [comparisons, filterMode, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Excel Dip Toplamına Eşitleme Önizlemesi
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                  Eski vs Yeni Fiyat Karşılaştırması
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kuruş farkı ürünlere eşit paylaştırıldığında oluşacak eski ve yeni birim fiyatları inceleyiniz.
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

        {/* Highlight KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 bg-emerald-50/50 border-b border-emerald-100 shrink-0">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Excel D Sütunu Dip Toplamı (Hedef)</span>
            <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
              {formatCurrency(excelGrandTotal)}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold">
              Eşitleme sonrası yeni genel toplam
            </span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Mevcut Toplam Tutar</span>
            <div className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">
              {formatCurrency(currentGrandTotal)}
            </div>
            <span className="text-[11px] text-slate-500">
              {targetMode === 'kdvDahil' ? 'KDV Dahil Toplam' : 'KDV Hariç Matrah'}
            </span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-emerald-200 bg-emerald-50/70 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
              <span>Paylaştırılan Kuruş Farkı</span>
              <Scale className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-xl font-extrabold text-emerald-700 font-mono mt-0.5">
              {formatCurrency(difference)}
            </div>
            <span className="text-[11px] text-emerald-800 font-medium">
              {originalItems.length} ürünün fiyatına eşit dağıtıldı
            </span>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ürün adı ile ara..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-emerald-600 focus:border-emerald-600 bg-slate-50"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Tüm Ürünler ({comparisons.length})
            </button>
            <button
              onClick={() => setFilterMode('modifiedOnly')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                filterMode === 'modifiedOnly'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Fiyatı Değişenler ({modifiedCount})
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 z-10 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-4 min-w-[260px]">Ürün Stok Adı</th>
                <th className="py-2.5 px-3 w-28 text-right">Miktar & Birim</th>
                <th className="py-2.5 px-3 w-32 text-right">Eski Birim Fiyat</th>
                <th className="py-2.5 px-3 w-36 text-right">Yeni Birim Fiyat</th>
                <th className="py-2.5 px-3 w-24 text-center">Fark (₺)</th>
                <th className="py-2.5 px-3 w-32 text-right">Eski Toplam</th>
                <th className="py-2.5 px-4 w-36 text-right">Yeni Toplam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComparisons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Arama kriterine uygun ürün bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredComparisons.map((c, idx) => {
                  const hasDiff = c.isModified;
                  const isPositive = c.deltaFiyat > 0;

                  return (
                    <tr
                      key={c.item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        hasDiff ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      <td className="py-2 px-4">
                        <div className="font-semibold text-slate-900">
                          {c.item.stokAdi}
                        </div>
                        {c.item.combinedCount && c.item.combinedCount > 1 && (
                          <span className="text-[10px] font-bold text-blue-700">
                            {c.item.combinedCount} Sipariş Birleştirilmiş
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {formatNumber(c.item.miktar)} {c.item.birim}
                      </td>

                      {/* Eski Birim Fiyat */}
                      <td className="py-2 px-3 text-right font-mono text-slate-500 line-through">
                        {formatNumber(c.oldFiyat, 4)} ₺
                      </td>

                      {/* Yeni Birim Fiyat */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                        {formatNumber(c.newFiyat, 4)} ₺
                      </td>

                      {/* Fiyat Farkı */}
                      <td className="py-2 px-3 text-center">
                        {hasDiff ? (
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              isPositive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isPositive ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {isPositive ? '+' : ''}
                            {formatNumber(c.deltaFiyat)} ₺
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">-</span>
                        )}
                      </td>

                      {/* Eski Toplam Tutar */}
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {formatNumber(c.oldToplamTutar)} ₺
                      </td>

                      {/* Yeni Toplam Tutar */}
                      <td className="py-2 px-4 text-right font-mono font-extrabold text-slate-900">
                        {formatNumber(c.newToplamTutar)} ₺
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Onayladığınızda yukarıdaki yeni fiyatlar tabloya yansıtılacak ve dip toplam birebir eşitlenecektir.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Onayla ve Yeni Fiyatları Uygula ({formatCurrency(excelGrandTotal)})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
