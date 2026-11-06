import React from 'react';
import { FileSpreadsheet, RefreshCw, HelpCircle, CheckCircle2, Settings } from 'lucide-react';

interface NavbarProps {
  hasData: boolean;
  onReset: () => void;
  onOpenHelp: () => void;
  fileName?: string;
  isReconciled?: boolean;
  kdvMismatchCount?: number;
  onOpenKdvSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  hasData,
  onReset,
  onOpenHelp,
  fileName,
  isReconciled,
  kdvMismatchCount = 0,
  onOpenKdvSettings
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900">
                Excel Ürün & Mutabakat
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium border border-slate-200">
                ERP Parser
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Stok adı, miktar, birim, fiyat, KDV ve D sütunu dip toplam kontrolü
            </p>
          </div>
        </div>

        {/* Zone 2: Status & Active File */}
        {hasData && (
          <div className="hidden md:flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg max-w-xs truncate">
              <span className="text-slate-400">Aktif Dosya:</span>
              <span className="font-semibold text-slate-800 truncate">{fileName}</span>
            </div>
            {isReconciled !== undefined && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium ${
                isReconciled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isReconciled ? 'Mutabakat Sağlandı' : 'Fark Var'}</span>
              </div>
            )}
            {kdvMismatchCount > 0 && onOpenKdvSettings && (
              <button
                onClick={onOpenKdvSettings}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                title="KDV kural uyuşmazlıklarını incele"
              >
                <Settings className="w-3.5 h-3.5 text-blue-600" />
                <span>{kdvMismatchCount} KDV Uyarısı</span>
              </button>
            )}
          </div>
        )}

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenHelp}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Kılavuz ve Bilgi"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {hasData && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Yeni Dosya</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
