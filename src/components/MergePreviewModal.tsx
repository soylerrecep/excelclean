import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { ExtractedProductItem } from '../types/excel';
import { getMergePreviewGroups, MergeGroupPreview } from '../utils/productUtils';
import { formatCurrency, formatNumber } from '../utils/exportHelpers';

interface MergePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmMerge: () => void;
  items: ExtractedProductItem[];
}

export const MergePreviewModal: React.FC<MergePreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirmMerge,
  items
}) => {
  const [filterMode, setFilterMode] = useState<'duplicatesOnly' | 'all'>('duplicatesOnly');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    return getMergePreviewGroups(items);
  }, [items]);

  const duplicateGroups = useMemo(() => {
    return groups.filter(g => g.isDuplicate);
  }, [groups]);

  const displayedGroups = filterMode === 'duplicatesOnly' ? duplicateGroups : groups;

  // Total lines merged
  const totalDuplicateLines = useMemo(() => {
    return duplicateGroups.reduce((sum, g) => sum + g.count, 0);
  }, [duplicateGroups]);

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedKeys(new Set(displayedGroups.map(g => g.key)));
  };

  const collapseAll = () => {
    setExpandedKeys(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Aynı Ürünleri Birleştirme Önizlemesi
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold">
                  Önizleme & Onay
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Birleştirme öncesi mükerrer ürünleri ve hesaplanacak toplamları inceleyiniz.
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

        {/* Highlight Summary Banner */}
        <div className="p-4 bg-blue-50/80 border-b border-blue-200/60 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-start sm:items-center gap-2.5 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              Toplam <strong className="font-bold text-blue-950">{duplicateGroups.length} farklı ürün</strong> için birden fazla sipariş satırı ({totalDuplicateLines} satır) tespit edildi.
              Birleştirme sonrası liste <strong className="font-bold text-blue-950">{items.length} satırdan {groups.length} tekil ürüne</strong> düşecek.
            </span>
          </div>

          {/* Toggle between duplicates and all */}
          <div className="flex items-center gap-1 bg-white/90 p-1 rounded-lg border border-blue-200 self-start sm:self-center shrink-0 text-xs">
            <button
              onClick={() => setFilterMode('duplicatesOnly')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                filterMode === 'duplicatesOnly'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mükerrer Ürünler ({duplicateGroups.length})
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tüm Ürünler ({groups.length})
            </button>
          </div>
        </div>

        {/* Toolbar to Expand/Collapse details */}
        <div className="px-6 py-2 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            {displayedGroups.length} ürün grubu gösteriliyor
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={expandAll}
              className="hover:text-slate-800 underline cursor-pointer text-[11px]"
            >
              Tüm Detayları Aç
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={collapseAll}
              className="hover:text-slate-800 underline cursor-pointer text-[11px]"
            >
              Tümünü Kapat
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {displayedGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Mükerrer isimli ürün bulunamadı. Tüm ürünler zaten tekildir.
            </div>
          ) : (
            displayedGroups.map((group) => {
              const isExpanded = expandedKeys.has(group.key);

              return (
                <div
                  key={group.key}
                  className={`rounded-xl border transition-all ${
                    group.isDuplicate
                      ? 'bg-white border-blue-200 shadow-2xs'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  {/* Group Header Card */}
                  <div
                    onClick={() => toggleExpand(group.key)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                        group.isDuplicate
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {group.count}x
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {group.stokAdi}
                          </h4>
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {group.birim}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {group.count > 1 ? (
                            <span className="text-blue-700 font-medium">
                              {group.count} farklı sipariş satırında yer alıyor
                            </span>
                          ) : (
                            <span>Tek satır</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Merged Outcome Summary */}
                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Birleştirilmiş Miktar:</div>
                        <div className="text-sm font-bold font-mono text-slate-900">
                          {formatNumber(group.combinedItem.miktar)} {group.birim}
                        </div>
                      </div>

                      <div className="text-right pl-4 border-l border-slate-200">
                        <div className="text-xs text-slate-500">Toplam Tutar:</div>
                        <div className="text-sm font-bold font-mono text-emerald-700">
                          {formatCurrency(group.combinedItem.toplamTutar)}
                        </div>
                      </div>

                      <div className="text-slate-400 pl-2">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Breakdown Table of Individual Lines */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Birleştirilecek Satırların Detayı:
                      </div>

                      <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-x-auto text-xs">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                              <th className="py-2 px-3">Sipariş No</th>
                              <th className="py-2 px-3 text-right">Miktar</th>
                              <th className="py-2 px-3 text-center">Birim</th>
                              <th className="py-2 px-3 text-right">KDV Hariç Fiyat</th>
                              <th className="py-2 px-3 text-center">KDV %</th>
                              <th className="py-2 px-3 text-right">KDV Hariç Tutar</th>
                              <th className="py-2 px-3 text-right">Toplam Tutar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 font-mono">
                            {group.sourceItems.map((item, sIdx) => (
                              <tr key={item.id} className="hover:bg-white/80">
                                <td className="py-2 px-3 font-semibold text-slate-700">
                                  {item.siparisNo || `Satır ${item.rawRowNumber || sIdx + 1}`}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900">
                                  {formatNumber(item.miktar)}
                                </td>
                                <td className="py-2 px-3 text-center text-slate-600">
                                  {item.birim}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-700">
                                  {formatNumber(item.kdvHaricFiyat)} ₺
                                </td>
                                <td className="py-2 px-3 text-center text-slate-600">
                                  %{item.kdvOrani}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-800">
                                  {formatNumber(item.kdvHaricTutar)} ₺
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900">
                                  {formatNumber(item.toplamTutar)} ₺
                                </td>
                              </tr>
                            ))}

                            {/* Aggregated Total Row for this group */}
                            <tr className="bg-blue-50/70 font-bold border-t border-blue-200 text-blue-950">
                              <td className="py-2 px-3 flex items-center gap-1.5 font-sans">
                                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                <span>BİRLEŞMİŞ SONUÇ:</span>
                              </td>
                              <td className="py-2 px-3 text-right text-blue-950">
                                {formatNumber(group.combinedItem.miktar)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {group.birim}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600">
                                Ort. {formatNumber(group.combinedItem.kdvHaricFiyat)} ₺
                              </td>
                              <td className="py-2 px-3 text-center">
                                %{group.kdvOrani}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {formatNumber(group.combinedItem.kdvHaricTutar)} ₺
                              </td>
                              <td className="py-2 px-3 text-right text-emerald-800">
                                {formatNumber(group.combinedItem.toplamTutar)} ₺
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Birleştirme sonrasında istediğiniz zaman tekrar tek tek satırlara dönebilirsiniz.
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
                onConfirmMerge();
                onClose();
              }}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Birleştirmeyi Onayla ve Uygula ({groups.length} Tekil Ürün)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
