import React, { useState } from 'react';
import { Download, FileText, Copy, Check, Eye } from 'lucide-react';
import { ExtractedProductItem } from '../types/excel';
import { exportToCleanExcel, exportToCSV, copyToClipboardAsTSV } from '../utils/exportHelpers';

interface ExportBarProps {
  items: ExtractedProductItem[];
  fileName: string;
  onOpenRawInspector: () => void;
  isGrouped?: boolean;
}

export const ExportBar: React.FC<ExportBarProps> = ({
  items,
  fileName,
  onOpenRawInspector,
  isGrouped = false
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const getEffectiveFileName = () => {
    const prefix = isGrouped ? '_birlestirilmis_ozet' : '_temiz_liste';
    return fileName.replace(/\.[^/.]+$/, '') + prefix;
  };

  const handleExcelExport = () => {
    exportToCleanExcel(items, getEffectiveFileName());
    setDownloadSuccess('Excel (.xlsx) dosyası indirildi!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleCsvExport = () => {
    exportToCSV(items, getEffectiveFileName());
    setDownloadSuccess('CSV dosyası indirildi!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleCopyClipboard = async () => {
    const success = await copyToClipboardAsTSV(items);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>{isGrouped ? 'Birleştirilmiş Özet Listeyi Dışa Aktar' : 'Temiz Ürün Listesini Dışa Aktar'}</span>
          {downloadSuccess && (
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 animate-fade-in">
              {downloadSuccess}
            </span>
          )}
          {copied && (
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 animate-fade-in">
              Panoya kopyalandı! Excel'e Ctrl+V ile yapıştırabilirsiniz.
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {items.length} adet {isGrouped ? 'tekilleştirilmiş ürün grubu' : 'ürün satırı'} stok adı, miktarı, birimi, fiyatı ve KDV oranlarıyla hazır.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
        {/* Raw inspector button */}
        <button
          onClick={onOpenRawInspector}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          title="Excel'deki ham satırları incele"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Ham Satırları Gör</span>
        </button>

        {/* Copy to clipboard */}
        <button
          onClick={handleCopyClipboard}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Copy className="w-4 h-4 text-slate-500" />
          )}
          <span>{copied ? 'Kopyalandı' : 'Panoya Kopyala'}</span>
        </button>

        {/* CSV Download */}
        <button
          onClick={handleCsvExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
        >
          <FileText className="w-4 h-4 text-slate-500" />
          <span>CSV İndir</span>
        </button>

        {/* Primary Action: Excel Download */}
        <button
          onClick={handleExcelExport}
          className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Temiz Excel (XLSX) İndir</span>
        </button>
      </div>
    </div>
  );
};
