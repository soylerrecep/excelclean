import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Scale,
  Edit3,
  Check,
  RotateCcw,
  Wand2,
  ChevronDown,
  Settings
} from 'lucide-react';
import { ReconciliationResult } from '../types/excel';
import { formatCurrency } from '../utils/exportHelpers';

interface ReconciliationCardProps {
  reconciliation: ReconciliationResult;
  onUpdateTargetTotal: (newTarget: number, mode: 'kdvDahil' | 'kdvHaric') => void;
  onBalanceAcrossAllItems: () => void;
  onOpenBalancePreview?: () => void;
  onBalanceWithAdjustmentRow: () => void;
  onBalanceOnLastItem: () => void;
  itemCount: number;
  orderCount: number;
  kdvMismatchCount?: number;
  onOpenKdvSettings?: () => void;
}

export const ReconciliationCard: React.FC<ReconciliationCardProps> = ({
  reconciliation,
  onUpdateTargetTotal,
  onBalanceAcrossAllItems,
  onOpenBalancePreview,
  onBalanceWithAdjustmentRow,
  onBalanceOnLastItem,
  itemCount,
  orderCount,
  kdvMismatchCount = 0,
  onOpenKdvSettings
}) => {
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [manualInputValue, setManualInputValue] = useState(reconciliation.excelGrandTotal.toString());
  const [showBalanceOptions, setShowBalanceOptions] = useState(false);

  const currentCalculatedTarget =
    reconciliation.targetMode === 'kdvDahil'
      ? reconciliation.calculatedGrandTotal
      : reconciliation.calculatedSubtotal;

  const currentDiff = Math.abs(reconciliation.excelGrandTotal - currentCalculatedTarget);
  const isCurrentlyReconciled = currentDiff < 0.05;

  const handleSaveManualTarget = () => {
    const parsed = parseFloat(manualInputValue.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateTargetTotal(parsed, reconciliation.targetMode);
      setIsEditingTarget(false);
    }
  };

  const handleResetToAuto = () => {
    onUpdateTargetTotal(reconciliation.calculatedGrandTotal, 'kdvDahil');
    setManualInputValue(reconciliation.calculatedGrandTotal.toString());
    setIsEditingTarget(false);
  };

  return (
    <div className={`rounded-2xl border p-6 transition-all ${
      isCurrentlyReconciled
        ? 'bg-emerald-50/70 border-emerald-200'
        : 'bg-amber-50/70 border-amber-200'
    }`}>
      {/* Top Header Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            isCurrentlyReconciled
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-amber-500 text-white shadow-xs'
          }`}>
            {isCurrentlyReconciled ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {isCurrentlyReconciled
                  ? 'Birebir Mutabakat Sağlandı'
                  : 'Mutabakat Farkı Tespit Edildi'}
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isCurrentlyReconciled
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {isCurrentlyReconciled ? '0,00 ₺ Fark' : `${formatCurrency(currentDiff)} Fark`}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {isCurrentlyReconciled
                ? 'Excel dosyasının D sütunundaki dip genel toplam ile çıkarılan ürünlerin toplamı kuruşu kuruşuna eşleşmektedir.'
                : 'Excel dosyasındaki dip toplam ile ürünlerin toplamı arasında kuruş farkı var. "Excel Dip Toplamına Eşitle" butonuna tıklayarak satırları dip toplama anında eşitleyebilirsiniz.'}
            </p>
          </div>
        </div>

        {/* Right Actions: Comparison Mode + Equalize to Excel Dip Total Button */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Target Comparison Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-white/80 rounded-lg border border-slate-200 shrink-0">
            <button
              onClick={() => onUpdateTargetTotal(reconciliation.excelGrandTotal, 'kdvDahil')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                reconciliation.targetMode === 'kdvDahil'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              KDV Dahil Toplam
            </button>
            <button
              onClick={() => onUpdateTargetTotal(reconciliation.excelGrandTotal, 'kdvHaric')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                reconciliation.targetMode === 'kdvHaric'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              KDV Hariç Matrah
            </button>
          </div>

          {/* Equalize to Excel Dip Total Split Button */}
          <div className="relative inline-flex rounded-lg shadow-xs">
            <button
              onClick={() => (onOpenBalancePreview ? onOpenBalancePreview() : onBalanceAcrossAllItems())}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-l-lg transition-colors cursor-pointer ${
                isCurrentlyReconciled
                  ? 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title={`Farkı tüm ürünlerin fiyatlarına eşit paylaştırarak Excel dip toplamına (${formatCurrency(reconciliation.excelGrandTotal)}) eşitler`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Excel Dip Toplamına Eşitle</span>
            </button>

            <button
              onClick={() => setShowBalanceOptions(prev => !prev)}
              className={`px-2 py-1.5 text-xs font-bold rounded-r-lg border-l transition-colors cursor-pointer ${
                isCurrentlyReconciled
                  ? 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 border-l-slate-200'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white border-l-emerald-800'
              }`}
              title="Eşitleme yöntemini seçin"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Options */}
            {showBalanceOptions && (
              <div className="absolute right-0 top-full mt-2 w-88 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-30 space-y-1 text-left animate-fade-in">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Excel Dip Toplamına Eşitleme Yöntemi:
                </div>

                {/* Primary Option: Equal distribution across all products */}
                <button
                  onClick={() => {
                    if (onOpenBalancePreview) onOpenBalancePreview();
                    else onBalanceAcrossAllItems();
                    setShowBalanceOptions(false);
                  }}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-900 text-xs text-slate-700 transition-colors flex items-start gap-2.5 cursor-pointer bg-emerald-50/40 border border-emerald-200/60"
                >
                  <div className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px]">
                    1
                  </div>
                  <div>
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>Bütün Ürünlere Eşit Paylaştır</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900">Önerilen</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Farkı (±{formatCurrency(currentDiff)}) tüm {itemCount} adet ürünün fiyatlarına eşit olarak dağıtarak toplamı Excel dip toplamına ({formatCurrency(reconciliation.excelGrandTotal)}) kuruşu kuruşuna eşitler.
                    </div>
                  </div>
                </button>

                {/* Option 2: Add adjustment line */}
                <button
                  onClick={() => {
                    onBalanceWithAdjustmentRow();
                    setShowBalanceOptions(false);
                  }}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 hover:text-slate-900 text-xs text-slate-700 transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px]">
                    2
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Kuruş Dengeleme Satırı Ekle</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Listeye fark tutarında (±{formatCurrency(currentDiff)}) ayrı bir yuvarlama satırı ekler.
                    </div>
                  </div>
                </button>

                {/* Option 3: Adjust last item */}
                <button
                  onClick={() => {
                    onBalanceOnLastItem();
                    setShowBalanceOptions(false);
                  }}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 hover:text-slate-900 text-xs text-slate-700 transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px]">
                    3
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Yalnızca Son Ürüne Yansıt</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Farkı sadece son ürünün tutarına yansıtarak eşitler.
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Numbers Comparison Grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Excel Target Total */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span className="font-semibold text-slate-700">Excel D Sütunu Dip Toplamı (Referans)</span>
            {!isEditingTarget ? (
              <button
                onClick={() => {
                  setManualInputValue(reconciliation.excelGrandTotal.toString());
                  setIsEditingTarget(true);
                }}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                title="Hedef Dip Toplamı Düzenle"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSaveManualTarget}
                  className="text-emerald-600 hover:text-emerald-800 p-1 font-bold text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetToAuto}
                  className="text-slate-400 hover:text-slate-700 p-1"
                  title="Otomatik Tespite Dön"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {!isEditingTarget ? (
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatCurrency(reconciliation.excelGrandTotal)}
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                value={manualInputValue}
                onChange={(e) => setManualInputValue(e.target.value)}
                className="w-full text-lg font-mono font-bold px-2 py-1 border border-emerald-400 rounded-md focus:outline-emerald-600 bg-emerald-50/30"
                placeholder="Örn: 148005.00"
              />
              <button
                onClick={handleSaveManualTarget}
                className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 cursor-pointer"
              >
                Kaydet
              </button>
            </div>
          )}

          <div className="text-xs text-slate-400 mt-1 truncate">
            {reconciliation.excelTotalSource}
          </div>
        </div>

        {/* Card 2: Calculated Items Sum */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium mb-1">
            Ayıklanan Ürünler {reconciliation.targetMode === 'kdvDahil' ? 'KDV Dahil Toplamı' : 'KDV Hariç Matrahı'}
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {formatCurrency(currentCalculatedTarget)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {itemCount} kalem ürünün toplamı ({orderCount} sipariş)
          </div>
        </div>

        {/* Card 3: Difference */}
        <div className={`rounded-xl p-4 border shadow-2xs ${
          isCurrentlyReconciled
            ? 'bg-emerald-100/50 border-emerald-300'
            : 'bg-amber-100/50 border-amber-300'
        }`}>
          <div className="text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
            <span>Mutabakat Farkı</span>
            <Scale className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className={`text-2xl font-extrabold font-mono tracking-tight ${
            isCurrentlyReconciled ? 'text-emerald-700' : 'text-amber-700'
          }`}>
            {formatCurrency(currentDiff)}
          </div>
          <div className="text-xs text-slate-600 mt-1 font-medium flex items-center justify-between">
            <span>
              {isCurrentlyReconciled
                ? '✓ Birebir Eşleşme (Hatasız)'
                : '✕ Fark var'}
            </span>
            {!isCurrentlyReconciled && (
              <button
                onClick={() => (onOpenBalancePreview ? onOpenBalancePreview() : onBalanceAcrossAllItems())}
                className="text-xs text-emerald-800 font-bold underline hover:text-emerald-950 cursor-pointer"
                title="Farkı bütün ürünlerin fiyatlarına eşit paylaştırarak dip toplama eşitler"
              >
                Dip Toplama Eşitle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Financial Breakdown Mini-Bar */}
      <div className="mt-4 pt-4 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-slate-500">KDV Hariç Matrah:</span>
          <div className="font-bold text-slate-800 font-mono text-sm">
            {formatCurrency(reconciliation.calculatedSubtotal)}
          </div>
        </div>

        <div>
          <span className="text-slate-500">Toplam KDV Tutarı:</span>
          <div className="font-bold text-slate-800 font-mono text-sm">
            {formatCurrency(reconciliation.calculatedTaxTotal)}
          </div>
        </div>

        <div>
          <span className="text-slate-500">Toplam Kalem Sayısı:</span>
          <div className="font-bold text-slate-800 font-mono text-sm">
            {itemCount} Kalem Ürün
          </div>
        </div>

        <div>
          <span className="text-slate-500">İçerilen Sipariş:</span>
          <div className="font-bold text-slate-800 font-mono text-sm">
            {orderCount} Farklı Sipariş
          </div>
        </div>
      </div>

      {/* KDV Custom Rules Alert Notice Strip */}
      {kdvMismatchCount > 0 && (
        <div className="mt-4 p-3 bg-amber-100/80 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>KDV Kural Uyarısı:</strong> {kdvMismatchCount} üründe belirlediğiniz KDV kurallarına göre uyuşmazlık tespit edildi.
            </span>
          </div>
          {onOpenKdvSettings && (
            <button
              onClick={onOpenKdvSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto shadow-2xs"
            >
              <span>KDV Ayarlarını Aç ({kdvMismatchCount} Ürün)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
