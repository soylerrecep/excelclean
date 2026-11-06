import React, { useState, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { FileUpload } from './components/FileUpload';
import { ReconciliationCard } from './components/ReconciliationCard';
import { ProductTable } from './components/ProductTable';
import { ExportBar } from './components/ExportBar';
import { RawInspectorModal } from './components/RawInspectorModal';
import { HelpModal } from './components/HelpModal';
import { KdvSettingsModal } from './components/KdvSettingsModal';
import { BalancePreviewModal } from './components/BalancePreviewModal';
import { ExtractedProductItem, ParseResult } from './types/excel';
import { parseExcelBuffer } from './utils/excelParser';
import { SAMPLE_PARSE_RESULT } from './utils/sampleData';
import {
  balanceDifferenceAcrossAllItems,
  balanceDifferenceWithAdjustment,
  balanceDifferenceOnLastItem,
  groupProductsByName,
  recalculateItem
} from './utils/productUtils';
import { KdvRule, loadKdvRules, saveKdvRules, auditItemsWithKdvRules } from './utils/kdvRules';
import { TevkifatRule, loadTevkifatRules, saveTevkifatRules, auditItemsTevkifat } from './utils/tevkifatRules';
import { TevkifatModal } from './components/TevkifatModal';

export default function App() {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRawInspectorOpen, setIsRawInspectorOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isKdvSettingsOpen, setIsKdvSettingsOpen] = useState(false);
  const [isBalancePreviewOpen, setIsBalancePreviewOpen] = useState(false);
  const [isTevkifatOpen, setIsTevkifatOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGrouped, setIsGrouped] = useState(false);
  // Grouped items state so direct cell edits, sort, and balance apply directly to merged view as well
  const [groupedItems, setGroupedItems] = useState<ExtractedProductItem[] | null>(null);

  // User-configurable KDV rules (e.g. "ayakkabı" -> %20)
  const [kdvRules, setKdvRules] = useState<KdvRule[]>(() => loadKdvRules());
  // User-configurable Tevkifat rules
  const [tevkifatRules, setTevkifatRules] = useState<TevkifatRule[]>(() => loadTevkifatRules());

  const [exportSortedItems, setExportSortedItems] = useState<ExtractedProductItem[]>([]);

  // Helper to recompute totals for the entire items list
  const recomputeTotals = (
    items: ExtractedProductItem[],
    currentResult: ParseResult,
    targetModeOverride?: 'kdvDahil' | 'kdvHaric',
    targetTotalOverride?: number
  ): ParseResult => {
    const subtotal = Math.round(items.reduce((sum, it) => sum + it.kdvHaricTutar, 0) * 100) / 100;
    const taxTotal = Math.round(items.reduce((sum, it) => sum + it.kdvTutari, 0) * 100) / 100;
    const grandTotal = Math.round(items.reduce((sum, it) => sum + it.toplamTutar, 0) * 100) / 100;

    const mode = targetModeOverride || currentResult.reconciliation.targetMode;
    const target =
      targetTotalOverride !== undefined
        ? targetTotalOverride
        : currentResult.reconciliation.excelGrandTotal;

    const comparisonBase = mode === 'kdvDahil' ? grandTotal : subtotal;
    const difference = Math.round(Math.abs(target - comparisonBase) * 100) / 100;
    const isReconciled = difference < 0.05;

    return {
      ...currentResult,
      items: isGrouped ? currentResult.items : items,
      reconciliation: {
        ...currentResult.reconciliation,
        excelGrandTotal: target,
        calculatedSubtotal: subtotal,
        calculatedTaxTotal: taxTotal,
        calculatedGrandTotal: grandTotal,
        targetMode: mode,
        difference,
        isReconciled
      }
    };
  };

  // Currently active items (either merged items or raw order lines)
  const currentActiveItems = useMemo(() => {
    if (!parseResult) return [];
    if (isGrouped) {
      return groupedItems ?? groupProductsByName(parseResult.items);
    }
    return parseResult.items;
  }, [parseResult, isGrouped, groupedItems]);

  // Real-time custom KDV rules audit report
  const kdvReport = useMemo(() => {
    return auditItemsWithKdvRules(currentActiveItems, kdvRules);
  }, [currentActiveItems, kdvRules]);

  // Real-time Tevkifat audit report
  const tevkifatReport = useMemo(() => {
    return auditItemsTevkifat(currentActiveItems, tevkifatRules);
  }, [currentActiveItems, tevkifatRules]);

  // Compute balanced items preview for the modal before applying
  const balancedItemsPreview = useMemo(() => {
    if (!parseResult) return [];
    return balanceDifferenceAcrossAllItems(
      currentActiveItems,
      parseResult.reconciliation.excelGrandTotal,
      parseResult.reconciliation.targetMode
    );
  }, [currentActiveItems, parseResult]);

  const handleFileLoaded = (buffer: ArrayBuffer, fileName: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsGrouped(false);
    setGroupedItems(null);
    try {
      const result = parseExcelBuffer(buffer, fileName);
      if (result.items.length === 0) {
        setErrorMessage('Dosyada ürün satırı tespit edilemedi. Lütfen dosya formatını kontrol ediniz.');
      } else {
        setParseResult(result);
      }
    } catch (err: any) {
      console.error('Excel ayrıştırma hatası:', err);
      setErrorMessage(
        'Excel dosyası ayrıştırılırken bir hata oluştu: ' + (err?.message || 'Bilinmeyen hata')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = () => {
    setErrorMessage(null);
    setIsGrouped(false);
    setGroupedItems(null);
    setParseResult(SAMPLE_PARSE_RESULT);
  };

  const handleReset = () => {
    setParseResult(null);
    setErrorMessage(null);
    setIsGrouped(false);
    setGroupedItems(null);
    setIsKdvSettingsOpen(false);
    setIsBalancePreviewOpen(false);
  };

  // Toggle between raw order lines and merged view
  const handleToggleGrouped = () => {
    if (!parseResult) return;
    if (!isGrouped) {
      const newGrouped = groupedItems ?? groupProductsByName(parseResult.items);
      setGroupedItems(newGrouped);
      setIsGrouped(true);
      setParseResult(recomputeTotals(newGrouped, parseResult));
    } else {
      setIsGrouped(false);
      setParseResult(recomputeTotals(parseResult.items, parseResult));
    }
  };

  // Confirm merge from preview modal
  const handleConfirmMerge = () => {
    if (!parseResult) return;
    const newGrouped = groupProductsByName(parseResult.items);
    setGroupedItems(newGrouped);
    setIsGrouped(true);
    setParseResult(recomputeTotals(newGrouped, parseResult));
  };

  // Update target total from reconciliation card input
  const handleUpdateTargetTotal = (newTarget: number, mode: 'kdvDahil' | 'kdvHaric') => {
    if (!parseResult) return;
    setParseResult(recomputeTotals(currentActiveItems, parseResult, mode, newTarget));
  };

  // Update a single item (works in BOTH raw mode and after merging same products)
  const handleUpdateItem = (updatedItem: ExtractedProductItem) => {
    if (!parseResult) return;
    if (isGrouped) {
      const base = groupedItems ?? groupProductsByName(parseResult.items);
      const newGrouped = base.map(it => (it.id === updatedItem.id ? updatedItem : it));
      setGroupedItems(newGrouped);
      setParseResult(recomputeTotals(newGrouped, parseResult));
    } else {
      const newItems = parseResult.items.map(it => (it.id === updatedItem.id ? updatedItem : it));
      setParseResult(recomputeTotals(newItems, parseResult));
    }
  };

  // Delete a row (works in BOTH raw mode and after merging same products)
  const handleDeleteItem = (id: string) => {
    if (!parseResult) return;
    if (isGrouped) {
      const base = groupedItems ?? groupProductsByName(parseResult.items);
      const newGrouped = base.filter(it => it.id !== id);
      setGroupedItems(newGrouped);
      setParseResult(recomputeTotals(newGrouped, parseResult));
    } else {
      const newItems = parseResult.items.filter(it => it.id !== id);
      setParseResult(recomputeTotals(newItems, parseResult));
    }
  };

  // Add an item
  const handleAddItem = (newItem: ExtractedProductItem) => {
    if (!parseResult) return;
    if (isGrouped) {
      const base = groupedItems ?? groupProductsByName(parseResult.items);
      const newGrouped = [...base, newItem];
      setGroupedItems(newGrouped);
      setParseResult(recomputeTotals(newGrouped, parseResult));
    } else {
      const newItems = [...parseResult.items, newItem];
      setParseResult(recomputeTotals(newItems, parseResult));
    }
  };

  // Direct balancing (used if confirmed from BalancePreviewModal or directly)
  const handleConfirmBalancedItems = () => {
    if (!parseResult) return;
    if (isGrouped) {
      setGroupedItems(balancedItemsPreview);
      setParseResult(recomputeTotals(balancedItemsPreview, parseResult));
    } else {
      setParseResult(recomputeTotals(balancedItemsPreview, parseResult));
    }
    setIsBalancePreviewOpen(false);
  };

  // Balance difference with adjustment row
  const handleBalanceWithAdjustmentRow = () => {
    if (!parseResult) return;
    if (isGrouped) {
      const base = groupedItems ?? groupProductsByName(parseResult.items);
      const balanced = balanceDifferenceWithAdjustment(
        base,
        parseResult.reconciliation.excelGrandTotal,
        parseResult.reconciliation.targetMode
      );
      setGroupedItems(balanced);
      setParseResult(recomputeTotals(balanced, parseResult));
    } else {
      const balanced = balanceDifferenceWithAdjustment(
        parseResult.items,
        parseResult.reconciliation.excelGrandTotal,
        parseResult.reconciliation.targetMode
      );
      setParseResult(recomputeTotals(balanced, parseResult));
    }
  };

  // Balance difference onto last item
  const handleBalanceOnLastItem = () => {
    if (!parseResult) return;
    if (isGrouped) {
      const base = groupedItems ?? groupProductsByName(parseResult.items);
      const balanced = balanceDifferenceOnLastItem(
        base,
        parseResult.reconciliation.excelGrandTotal,
        parseResult.reconciliation.targetMode
      );
      setGroupedItems(balanced);
      setParseResult(recomputeTotals(balanced, parseResult));
    } else {
      const balanced = balanceDifferenceOnLastItem(
        parseResult.items,
        parseResult.reconciliation.excelGrandTotal,
        parseResult.reconciliation.targetMode
      );
      setParseResult(recomputeTotals(balanced, parseResult));
    }
  };

  // Add custom KDV rule
  const handleAddKdvRule = (keyword: string, targetKdv: number) => {
    const newRule: KdvRule = {
      id: `rule-${Date.now()}`,
      keyword: keyword.trim(),
      targetKdv
    };
    const nextRules = [...kdvRules, newRule];
    setKdvRules(nextRules);
    saveKdvRules(nextRules);
  };

  // Delete custom KDV rule
  const handleDeleteKdvRule = (id: string) => {
    const nextRules = kdvRules.filter(r => r.id !== id);
    setKdvRules(nextRules);
    saveKdvRules(nextRules);
  };

  // Add custom Tevkifat rule
  const handleAddTevkifatRule = (keyword: string, tevkifatOrani: string, aciklama: string) => {
    const newRule: TevkifatRule = {
      id: `tev-${Date.now()}`,
      keyword: keyword.trim(),
      tevkifatOrani,
      aciklama
    };
    const nextRules = [...tevkifatRules, newRule];
    setTevkifatRules(nextRules);
    saveTevkifatRules(nextRules);
  };

  // Delete custom Tevkifat rule
  const handleDeleteTevkifatRule = (id: string) => {
    const nextRules = tevkifatRules.filter(r => r.id !== id);
    setTevkifatRules(nextRules);
    saveTevkifatRules(nextRules);
  };

  // Fix single item KDV rate to rule rate (e.g. 20)
  const handleFixSingleItemKdv = (itemId: string, targetKdv: number) => {
    if (!parseResult) return;
    if (isGrouped) {
      const base = groupedItems ?? groupProductsByName(parseResult.items);
      const updated = base.map(it =>
        it.id === itemId ? recalculateItem(it, { kdvOrani: targetKdv }) : it
      );
      setGroupedItems(updated);
      setParseResult(recomputeTotals(updated, parseResult));
    } else {
      const updated = parseResult.items.map(it =>
        it.id === itemId ? recalculateItem(it, { kdvOrani: targetKdv }) : it
      );
      setParseResult(recomputeTotals(updated, parseResult));
    }
  };

  // Batch fix all items that violate user KDV rules
  const handleFixAllKdvMismatches = () => {
    if (!parseResult || kdvReport.mismatches.length === 0) return;
    const fixMap = new Map<string, number>();
    kdvReport.mismatches.forEach(m => {
      fixMap.set(m.item.id, m.targetRate);
    });

    if (isGrouped) {
      const base = groupedItems ?? groupProductsByName(parseResult.items);
      const updated = base.map(it => {
        const targetRate = fixMap.get(it.id);
        return targetRate !== undefined
          ? recalculateItem(it, { kdvOrani: targetRate })
          : it;
      });
      setGroupedItems(updated);
      setParseResult(recomputeTotals(updated, parseResult));
    } else {
      const updated = parseResult.items.map(it => {
        const targetRate = fixMap.get(it.id);
        return targetRate !== undefined
          ? recalculateItem(it, { kdvOrani: targetRate })
          : it;
      });
      setParseResult(recomputeTotals(updated, parseResult));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Navigation */}
      <Navbar
        hasData={Boolean(parseResult)}
        onReset={handleReset}
        onOpenHelp={() => setIsHelpOpen(true)}
        fileName={parseResult?.fileName}
        isReconciled={parseResult?.reconciliation.isReconciled}
        kdvMismatchCount={kdvReport.mismatchCount}
        onOpenKdvSettings={() => setIsKdvSettingsOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-600 hover:text-red-900 font-bold ml-4 cursor-pointer"
            >
              Kapat
            </button>
          </div>
        )}

        {!parseResult ? (
          /* Empty / Upload View */
          <FileUpload
            onFileLoaded={handleFileLoaded}
            onLoadSample={handleLoadSample}
            isLoading={isLoading}
          />
        ) : (
          /* Results & Analysis View */
          <div className="space-y-6 animate-fade-in">
            {/* Reconciliation Hero Card with Difference Closing Tools */}
            <ReconciliationCard
              reconciliation={parseResult.reconciliation}
              onUpdateTargetTotal={handleUpdateTargetTotal}
              onBalanceAcrossAllItems={() => setIsBalancePreviewOpen(true)}
              onOpenBalancePreview={() => setIsBalancePreviewOpen(true)}
              onBalanceWithAdjustmentRow={handleBalanceWithAdjustmentRow}
              onBalanceOnLastItem={handleBalanceOnLastItem}
              itemCount={currentActiveItems.length}
              orderCount={parseResult.orderCount}
              kdvMismatchCount={kdvReport.mismatchCount}
              onOpenKdvSettings={() => setIsKdvSettingsOpen(true)}
            />

            {/* Export and Action Bar */}
            <ExportBar
              items={exportSortedItems.length > 0 ? exportSortedItems : currentActiveItems}
              fileName={parseResult.fileName}
              onOpenRawInspector={() => setIsRawInspectorOpen(true)}
              isGrouped={isGrouped}
            />

            {/* Extracted Product Table with In-line Edit, A-Z Sorting, KDV Settings & Grouping */}
            <ProductTable
              items={currentActiveItems}
              rawItems={parseResult.items}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onAddItem={handleAddItem}
              isGrouped={isGrouped}
              onToggleGrouped={handleToggleGrouped}
              onConfirmMerge={handleConfirmMerge}
              kdvRules={kdvRules}
              onOpenKdvSettings={() => setIsKdvSettingsOpen(true)}
              kdvMismatchCount={kdvReport.mismatchCount}
              onFixSingleItemKdv={handleFixSingleItemKdv}
              tevkifatRules={tevkifatRules}
              onOpenTevkifat={() => setIsTevkifatOpen(true)}
              tevkifatCount={tevkifatReport.tevkifatCount}
              onFilteredItemsChange={setExportSortedItems}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {parseResult && (
        <>
          <RawInspectorModal
            isOpen={isRawInspectorOpen}
            onClose={() => setIsRawInspectorOpen(false)}
            parseResult={parseResult}
          />

          {/* Balance Preview Modal: Eski vs Yeni Fiyat Karşılaştırma Penceresi */}
          <BalancePreviewModal
            isOpen={isBalancePreviewOpen}
            onClose={() => setIsBalancePreviewOpen(false)}
            onConfirm={handleConfirmBalancedItems}
            originalItems={currentActiveItems}
            balancedItems={balancedItemsPreview}
            excelGrandTotal={parseResult.reconciliation.excelGrandTotal}
            currentGrandTotal={
              parseResult.reconciliation.targetMode === 'kdvDahil'
                ? parseResult.reconciliation.calculatedGrandTotal
                : parseResult.reconciliation.calculatedSubtotal
            }
            targetMode={parseResult.reconciliation.targetMode}
          />

          {/* KDV Settings & Rules Modal: Kullanıcı Tanımlı KDV Kuralları */}
          <KdvSettingsModal
            isOpen={isKdvSettingsOpen}
            onClose={() => setIsKdvSettingsOpen(false)}
            rules={kdvRules}
            onAddRule={handleAddKdvRule}
            onDeleteRule={handleDeleteKdvRule}
            report={kdvReport}
            onFixSingleItem={handleFixSingleItemKdv}
            onFixAllMismatches={handleFixAllKdvMismatches}
          />

          {/* Tevkifat Modal: KDV Tevkifatı Kontrolü */}
          <TevkifatModal
            isOpen={isTevkifatOpen}
            onClose={() => setIsTevkifatOpen(false)}
            rules={tevkifatRules}
            onAddRule={handleAddTevkifatRule}
            onDeleteRule={handleDeleteTevkifatRule}
            report={tevkifatReport}
          />
        </>
      )}

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Excel Ürün ve Fiyat Ayrıştırıcı & Mutabakat Sistemi
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsHelpOpen(true)}
              className="hover:text-slate-800 underline transition-colors cursor-pointer"
            >
              Kılavuz
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setIsKdvSettingsOpen(true)}
              className="hover:text-slate-800 underline transition-colors cursor-pointer"
            >
              KDV Ayarları
            </button>
            <span className="text-slate-300">|</span>
            <span>Tüm veriler tarayıcıda yerel işlenir</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
