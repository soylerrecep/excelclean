import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Layers,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Eye,
  RotateCcw,
  Settings
} from 'lucide-react';
import { ExtractedProductItem } from '../types/excel';
import { formatNumber } from '../utils/exportHelpers';
import { recalculateItem } from '../utils/productUtils';
import { KdvRule, checkItemKdvRule } from '../utils/kdvRules';
import { TevkifatRule, checkItemTevkifat } from '../utils/tevkifatRules';
import { MergePreviewModal } from './MergePreviewModal';

interface ProductTableProps {
  items: ExtractedProductItem[];
  rawItems?: ExtractedProductItem[];
  onUpdateItem: (updated: ExtractedProductItem) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (item: ExtractedProductItem) => void;
  isGrouped: boolean;
  onToggleGrouped: () => void;
  onConfirmMerge?: () => void;
  kdvRules?: KdvRule[];
  onOpenKdvSettings?: () => void;
  kdvMismatchCount?: number;
  onFixSingleItemKdv?: (itemId: string, targetKdv: number) => void;
  tevkifatRules?: TevkifatRule[];
  onOpenTevkifat?: () => void;
  tevkifatCount?: number;
  onFilteredItemsChange?: (filtered: ExtractedProductItem[]) => void;
}

type SortField = 'index' | 'stokAdi' | 'miktar' | 'birim' | 'kdvHaricFiyat' | 'toplamTutar';
type SortDirection = 'asc' | 'desc';

export const ProductTable: React.FC<ProductTableProps> = ({
  items,
  rawItems,
  onUpdateItem,
  onDeleteItem,
  isGrouped,
  onToggleGrouped,
  onConfirmMerge,
  kdvRules = [],
  onOpenKdvSettings,
  kdvMismatchCount = 0,
  onFixSingleItemKdv,
  tevkifatRules = [],
  onOpenTevkifat,
  tevkifatCount = 0,
  onFilteredItemsChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKdv, setSelectedKdv] = useState<number | 'all'>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('index');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [isMergePreviewOpen, setIsMergePreviewOpen] = useState(false);

  // Directly use the active items provided by parent (raw or grouped)
  const baseItems = items;

  // Unique units for filtering
  const units = useMemo(() => {
    const set = new Set<string>();
    baseItems.forEach(it => {
      if (it.birim) set.add(it.birim);
    });
    return Array.from(set).sort();
  }, [baseItems]);

  // Unique KDV rates
  const kdvRates = useMemo(() => {
    const set = new Set<number>();
    baseItems.forEach(it => {
      if (it.kdvOrani !== undefined) set.add(it.kdvOrani);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [baseItems]);

  // Filter and Sort
  const filteredItems = useMemo(() => {
    let result = [...baseItems];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(it => it.stokAdi.toLowerCase().includes(q));
    }

    if (selectedKdv !== 'all') {
      result = result.filter(it => it.kdvOrani === selectedKdv);
    }

    if (selectedUnit !== 'all') {
      result = result.filter(it => it.birim === selectedUnit);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'index') {
        comparison = (a.rawRowNumber || 0) - (b.rawRowNumber || 0);
      } else if (sortField === 'stokAdi') {
        comparison = a.stokAdi.localeCompare(b.stokAdi, 'tr');
      } else if (sortField === 'miktar') {
        comparison = a.miktar - b.miktar;
      } else if (sortField === 'birim') {
        comparison = a.birim.localeCompare(b.birim, 'tr');
      } else if (sortField === 'kdvHaricFiyat') {
        comparison = a.kdvHaricFiyat - b.kdvHaricFiyat;
      } else if (sortField === 'toplamTutar') {
        comparison = a.toplamTutar - b.toplamTutar;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [baseItems, searchQuery, selectedKdv, selectedUnit, sortField, sortDirection]);

  // Notify parent of current sorted/filtered view order
  React.useEffect(() => {
    if (onFilteredItemsChange) {
      onFilteredItemsChange(filteredItems);
    }
  }, [filteredItems, onFilteredItemsChange]);

  // Totals for currently filtered items
  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, it) => ({
        miktar: acc.miktar + it.miktar,
        kdvHaric: acc.kdvHaric + it.kdvHaricTutar,
        kdvTutar: acc.kdvTutar + it.kdvTutari,
        toplam: acc.toplam + it.toplamTutar
      }),
      { miktar: 0, kdvHaric: 0, kdvTutar: 0, toplam: 0 }
    );
  }, [filteredItems]);

  // Direct cell editing handler - recalculates line and bubbles up to parent (works in both raw and grouped modes)
  const handleDirectCellChange = (
    item: ExtractedProductItem,
    field: 'stokAdi' | 'miktar' | 'birim' | 'kdvHaricFiyat' | 'kdvOrani',
    value: any
  ) => {
    const updated = recalculateItem(item, { [field]: value });
    onUpdateItem(updated);
  };

  // Toggle quick A-Z sort for Stok Adı
  const toggleAZSort = () => {
    if (sortField !== 'stokAdi') {
      setSortField('stokAdi');
      setSortDirection('asc');
    } else {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    }
  };

  // Toggle quick Birim sort
  const toggleBirimSort = () => {
    if (sortField !== 'birim') {
      setSortField('birim');
      setSortDirection('asc');
    } else {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const copyRow = async (item: ExtractedProductItem) => {
    const rowText = `${item.stokAdi}\t${item.miktar}\t${item.birim}\t${item.kdvHaricFiyat}\t${item.kdvOrani}\t${item.kdvHaricTutar}\t${item.kdvTutari}\t${item.toplamTutar}`;
    try {
      await navigator.clipboard.writeText(rowText);
      setCopiedItemId(item.id);
      setTimeout(() => setCopiedItemId(null), 1800);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4">
        {/* Top Row: Search + Sort Buttons + KDV Audit + Grouping Toggle */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ürün adı ile canlı ara..."
              className="w-full pl-9.5 pr-4 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-emerald-600 focus:border-emerald-600 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Temizle
              </button>
            )}
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tevkifat Kontrolü Button */}
            {onOpenTevkifat && (
              <button
                onClick={onOpenTevkifat}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  tevkifatCount > 0
                    ? 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                title="KDV tevkifatına tabi ürün ve hizmetleri denetleyin"
              >
                <span className="font-bold text-purple-700">Tevkifat</span>
                {tevkifatCount > 0 ? (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-purple-600 text-white animate-pulse">
                    {tevkifatCount} Ürün
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                    Yok
                  </span>
                )}
              </button>
            )}

            {/* A to Z Quick Sort */}
            <button
              onClick={toggleAZSort}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                sortField === 'stokAdi'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title="Ürün adını alfabetik (A'dan Z'ye) sırala"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>
                {sortField === 'stokAdi'
                  ? sortDirection === 'asc'
                    ? 'İsim: A → Z'
                    : 'İsim: Z → A'
                  : 'A → Z Sırala'}
              </span>
            </button>

            {/* Birim Quick Sort */}
            <button
              onClick={toggleBirimSort}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                sortField === 'birim'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title="Ürün birimlerine göre sırala (ADET, METRE, TORBA vb.)"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>
                {sortField === 'birim'
                  ? sortDirection === 'asc'
                    ? 'Birim: A → Z'
                    : 'Birim: Z → A'
                  : 'Birime Göre Sırala'}
              </span>
            </button>

            {/* Same Name Grouping Flow */}
            {!isGrouped ? (
              <button
                onClick={() => setIsMergePreviewOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
                title="Aynı isimdeki mükerrer ürünleri önce inceleyip ardından birleştirmenizi sağlar"
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Aynı Ürünleri Birleştir</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsMergePreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-blue-300 bg-white text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                  title="Birleştirilmiş ürünlerin detay önizlemesini göster"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Önizlemeyi Gör</span>
                </button>
                <button
                  onClick={onToggleGrouped}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Tek tek sipariş satırlarına geri dön"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Orijinal Satırlara Dön</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* KDV Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <span className="px-2 text-slate-500 font-semibold text-[11px] flex items-center gap-1">
                <Filter className="w-3 h-3" /> KDV:
              </span>
              <button
                onClick={() => setSelectedKdv('all')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  selectedKdv === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tümü
              </button>
              {kdvRates.map(rate => (
                <button
                  key={rate}
                  onClick={() => setSelectedKdv(rate)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    selectedKdv === rate
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  %{rate}
                </button>
              ))}
            </div>

            {/* Unit Filter */}
            {units.length > 1 && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <span className="px-2 text-slate-500 font-semibold text-[11px]">Birim:</span>
                <button
                  onClick={() => setSelectedUnit('all')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    selectedUnit === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tümü
                </button>
                {units.map(unit => (
                  <button
                    key={unit}
                    onClick={() => setSelectedUnit(unit)}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                      selectedUnit === unit
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium text-slate-700">
              Hücrelere doğrudan tıklayarak ürün adı, miktar, birim, fiyat ve KDV oranını hemen değiştirebilirsiniz.
            </span>
          </div>
        </div>
      </div>

      {/* Information Header Bar */}
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>
          Listelenen:{' '}
          <strong className="text-slate-900">{filteredItems.length}</strong>{' '}
          {isGrouped ? 'Tekilleştirilmiş Ürün Grubu' : 'Satır'}
        </div>
        <div className="text-[11px] text-slate-400 hidden sm:block">
          Sütun başlıklarındaki oklara tıklayarak İsim, Miktar, Birim, Fiyat ve Tutara göre sıralayabilirsiniz
        </div>
      </div>

      {/* High-Density Directly Editable Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 w-12 text-center">
                <button
                  onClick={() => handleSort('index')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                >
                  No
                  {sortField === 'index' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </button>
              </th>
              <th className="py-3 px-4 min-w-[300px]">
                <button
                  onClick={() => handleSort('stokAdi')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                >
                  Stok Adı
                  {sortField === 'stokAdi' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </button>
              </th>
              <th className="py-3 px-3 w-32 text-right">
                <button
                  onClick={() => handleSort('miktar')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 ml-auto cursor-pointer"
                >
                  Miktar
                  {sortField === 'miktar' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </button>
              </th>
              {/* Birim Column with Clickable Sort */}
              <th className="py-3 px-3 w-28 text-center">
                <button
                  onClick={() => handleSort('birim')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 mx-auto cursor-pointer"
                  title="Birime göre alfabetik sırala"
                >
                  Birim
                  {sortField === 'birim' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </button>
              </th>
              <th className="py-3 px-3 w-36 text-right">
                <button
                  onClick={() => handleSort('kdvHaricFiyat')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 ml-auto cursor-pointer"
                >
                  KDV Hariç Fiyat
                  {sortField === 'kdvHaricFiyat' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </button>
              </th>
              <th className="py-3 px-3 w-24 text-center">KDV %</th>
              <th className="py-3 px-3 w-36 text-right">KDV Hariç Tutar</th>
              <th className="py-3 px-3 w-32 text-right">KDV Tutarı</th>
              <th className="py-3 px-4 w-40 text-right">
                <button
                  onClick={() => handleSort('toplamTutar')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 ml-auto cursor-pointer"
                >
                  Toplam Tutar
                  {sortField === 'toplamTutar' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </button>
              </th>
              <th className="py-3 px-3 w-14 text-center"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500">
                  Arama kriterlerinize uygun ürün bulunamadı.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => {
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/90 transition-colors group ${
                      item.isAdjustment ? 'bg-amber-50/40 font-medium' : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Direct Editable Stok Adı (Available in both raw and grouped modes) */}
                    <td className="py-1 px-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.stokAdi}
                          onChange={(e) =>
                            handleDirectCellChange(item, 'stokAdi', e.target.value)
                          }
                          className="w-full px-2.5 py-1 text-xs font-semibold text-slate-900 bg-transparent hover:bg-white hover:border-slate-300 focus:bg-white border border-transparent rounded-lg focus:outline-emerald-600 focus:border-emerald-500 transition-all"
                          title="Ürün adını doğrudan düzenlemek için tıklayın"
                        />

                        {item.combinedCount && item.combinedCount > 1 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 shrink-0 whitespace-nowrap">
                            {item.combinedCount} Sipariş
                          </span>
                        )}
                        {item.isAdjustment && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0 whitespace-nowrap">
                            Dengeleme
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Direct Editable Miktar */}
                    <td className="py-1 px-2 text-right">
                      <input
                        type="number"
                        step="any"
                        value={item.miktar}
                        onChange={(e) =>
                          handleDirectCellChange(
                            item,
                            'miktar',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-24 text-right px-2 py-1 text-xs font-mono font-bold text-slate-900 bg-transparent hover:bg-white hover:border-slate-300 focus:bg-white border border-transparent rounded-lg focus:outline-emerald-600 focus:border-emerald-500 transition-all ml-auto block"
                        title="Miktarı değiştirmek için tıklayın"
                      />
                    </td>

                    {/* Direct Editable Birim */}
                    <td className="py-1 px-2 text-center">
                      <input
                        type="text"
                        value={item.birim}
                        onChange={(e) =>
                          handleDirectCellChange(
                            item,
                            'birim',
                            e.target.value.toUpperCase()
                          )
                        }
                        className="w-20 text-center px-1.5 py-1 text-xs font-medium text-slate-700 bg-transparent hover:bg-white hover:border-slate-300 focus:bg-white border border-transparent rounded-lg focus:outline-emerald-600 focus:border-emerald-500 transition-all uppercase mx-auto block"
                        title="Birimi değiştirmek için tıklayın (ADET, METRE, TORBA vb.)"
                      />
                    </td>

                    {/* Direct Editable KDV Hariç Fiyat */}
                    <td className="py-1 px-2 text-right">
                      <div className="relative inline-flex items-center ml-auto">
                        <input
                          type="number"
                          step="0.01"
                          value={item.kdvHaricFiyat}
                          onChange={(e) =>
                            handleDirectCellChange(
                              item,
                              'kdvHaricFiyat',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-28 text-right pr-5 pl-2 py-1 text-xs font-mono font-bold text-slate-900 bg-transparent hover:bg-white hover:border-slate-300 focus:bg-white border border-transparent rounded-lg focus:outline-emerald-600 focus:border-emerald-500 transition-all"
                          title="Birim fiyatı değiştirmek için tıklayın (Tutarlar otomatik yeniden hesaplanır)"
                        />
                        <span className="absolute right-1.5 text-slate-400 font-mono text-[11px] pointer-events-none">
                          ₺
                        </span>
                      </div>
                    </td>

                    {/* Direct Editable KDV Oranı with Legislation Check */}
                    <td className="py-1 px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <select
                          value={item.kdvOrani}
                          onChange={(e) =>
                            handleDirectCellChange(
                              item,
                              'kdvOrani',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="px-2 py-1 text-xs font-mono font-bold text-slate-800 bg-transparent hover:bg-white hover:border-slate-300 focus:bg-white border border-transparent rounded-lg focus:outline-emerald-600 focus:border-emerald-500 cursor-pointer transition-all"
                          title="KDV oranını değiştirmek için tıklayın (%20, %10, %1, %0)"
                        >
                          <option value="20">%20</option>
                          <option value="10">%10</option>
                          <option value="1">%1</option>
                          <option value="0">%0</option>
                        </select>

                        {/* Highlight if item is subject to Tevkifat */}
                        {(() => {
                          if (!tevkifatRules || tevkifatRules.length === 0) return null;
                          const tevCheck = checkItemTevkifat(item, tevkifatRules);
                          if (tevCheck) {
                            return (
                              <span
                                onClick={onOpenTevkifat}
                                className="text-[10px] font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 border border-purple-300 px-1.5 py-0.2 rounded transition-colors cursor-pointer whitespace-nowrap shadow-2xs block mt-0.5"
                                title={`Tevkifat Uygundur: ${tevCheck.rule.aciklama} (${tevCheck.rule.tevkifatOrani}). Kesinti: ${tevCheck.tevkifatTutar} ₺`}
                              >
                                📋 Tevkifat ({tevCheck.rule.tevkifatOrani})
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>

                    {/* Automatically Calculated KDV Hariç Tutar */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {formatNumber(item.kdvHaricTutar)} ₺
                    </td>

                    {/* Automatically Calculated KDV Tutarı */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatNumber(item.kdvTutari)} ₺
                    </td>

                    {/* Automatically Calculated Toplam Tutar */}
                    <td className="py-2.5 px-4 text-right font-mono font-extrabold text-slate-900">
                      {formatNumber(item.toplamTutar)} ₺
                    </td>

                    {/* Actions: Copy & Delete (Active in both modes) */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyRow(item)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                          title="Satırı Kopyala"
                        >
                          {copiedItemId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Satırı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Sticky Total Footer */}
          {filteredItems.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                <td className="py-3 px-3 text-center text-xs">TOPLAM</td>
                <td className="py-3 px-4 text-slate-700">
                  {filteredItems.length} Kalem {isGrouped ? '(Birleştirilmiş Özet)' : 'Genel Toplamı'}
                </td>
                <td className="py-3 px-3 text-right font-mono text-xs">
                  {formatNumber(totals.miktar)}
                </td>
                <td className="py-3 px-3 text-center text-slate-400">-</td>
                <td className="py-3 px-3 text-right text-slate-400">-</td>
                <td className="py-3 px-3 text-center text-slate-400">-</td>
                <td className="py-3 px-3 text-right font-mono text-xs">
                  {formatNumber(totals.kdvHaric)} ₺
                </td>
                <td className="py-3 px-3 text-right font-mono text-xs">
                  {formatNumber(totals.kdvTutar)} ₺
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm text-emerald-700">
                  {formatNumber(totals.toplam)} ₺
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Merge Preview and Confirmation Modal */}
      <MergePreviewModal
        isOpen={isMergePreviewOpen}
        onClose={() => setIsMergePreviewOpen(false)}
        onConfirmMerge={() => {
          if (onConfirmMerge) {
            onConfirmMerge();
          } else if (!isGrouped) {
            onToggleGrouped();
          }
        }}
        items={rawItems || items}
      />
    </div>
  );
};
