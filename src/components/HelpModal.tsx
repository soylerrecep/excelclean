import React from 'react';
import { X, HelpCircle, Check, ShieldCheck, FileSpreadsheet, Download } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Kullanım Kılavuzu & Desteklenen Formatlar
              </h3>
              <p className="text-xs text-slate-500">
                Excel ERP ayrıştırıcı ve D sütunu mutabakat motoru
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 leading-relaxed">
          <section>
            <h4 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              1. Hangi Excel Dosyalarını Yükleyebilirsiniz?
            </h4>
            <p>
              Program; Logo, Netsis, Mikro, Nebim veya benzeri muhasebe/ERP programlarından dışa aktarılan, her siparişte firma ve sipariş başlıkları altında değişken sayıda ürün satırları bulunan çok katmanlı Excel tablolarını doğrudan destekler.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              2. Dosyadan Hangi Alanlar Ayıklanır?
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-medium text-slate-800">
                ✓ Stok Adı
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-medium text-slate-800">
                ✓ Miktarı
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-medium text-slate-800">
                ✓ Birimi (Torba, Metre, Adet vb.)
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-medium text-slate-800">
                ✓ KDV Hariç Fiyatı (TL)
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-medium text-slate-800">
                ✓ KDV Oranı (%20, %10, %1)
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-medium text-slate-800">
                ✓ Stok Kodu & Tutar Hesaplamaları
              </div>
            </div>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              3. D Sütunu Dip Toplam Mutabakatı Nasıl Çalışır?
            </h4>
            <p>
              Excel dosyanızın en altındaki D sütununda veya dip toplam hücresinde yer alan genel tutar otomatik olarak okunur. Ayıklanan tüm ürün kalemlerinin toplam tutarı hesaplanır ve kuruşu kuruşuna karşılaştırılır. Fark 0,00 ₺ olduğunda yeşil mutabakat onayı verilir.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-600" />
              4. Dışa Aktarma Formatları
            </h4>
            <p>
              Ayıklanan temiz verileri tek tıkla <strong>XLSX (Microsoft Excel)</strong>, Türkçe karakter destekli <strong>CSV</strong> veya panoya kopyalayarak doğrudan herhangi bir elektronik tabloya yapıştırabilirsiniz.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
};
