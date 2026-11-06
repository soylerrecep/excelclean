import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Sparkles, ArrowRight, ShieldCheck, Check } from 'lucide-react';

interface FileUploadProps {
  onFileLoaded: (buffer: ArrayBuffer, fileName: string) => void;
  onLoadSample: () => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileLoaded,
  onLoadSample,
  isLoading
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        onFileLoaded(buffer, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Hero Welcome */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Hiyerarşik ERP Raporları İçin Otomatik Ayrıştırma & Sağlama</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Excel Ürün ve Fiyat Ayrıştırıcı
        </h1>
        <p className="mt-3 text-base text-slate-600 max-w-2xl mx-auto">
          ERP raporlarındaki karmaşık sipariş bloklarından ürünlerin <strong className="text-slate-900 font-semibold">Stok Adı</strong>, <strong className="text-slate-900 font-semibold">Miktarı</strong>, <strong className="text-slate-900 font-semibold">Birimi</strong>, <strong className="text-slate-900 font-semibold">KDV Hariç Fiyatı</strong> ve <strong className="text-slate-900 font-semibold">KDV Oranını</strong> otomatik ayıklar; dosyadaki <strong className="text-slate-900 font-semibold">D sütunu dip toplamı</strong> ile birebir mutabakat sağlar.
        </p>
      </div>

      {/* Upload Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer bg-white ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/50 shadow-md scale-[1.01]'
            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/50 shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">
          Excel Dosyanızı Buraya Sürükleyin veya Seçin
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          .xlsx veya .xls formatındaki Logo, Netsis, Mikro vb. sipariş / fatura raporları
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors pointer-events-none"
          >
            {isLoading ? 'Ayrıştırılıyor...' : 'Dosya Seç'}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" /> Tarayıcıda güvenli yerel işleme (sunucuya yüklenmez)
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" /> D sütunu dip toplam kontrolü
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" /> Temiz XLSX & CSV çıktısı
          </span>
        </div>
      </div>

      {/* Or Load Sample Data Button */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 text-white shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-sm text-white">
              Ekran Görüntüsündeki Gerçek Excel Verisiyle Hemen Deneyin
            </div>
            <div className="text-xs text-slate-400">
              12 Sipariş, 44 Ürün Kalemi, D Sütunu Dip Toplam: 148.005,00 ₺
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLoadSample();
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <span>Örnek Veriyi Yükle</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Feature Explanations */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="text-xs font-bold text-emerald-700 tracking-wider uppercase mb-1">01. Akıllı Filtreleme</div>
          <h4 className="font-bold text-slate-900 text-sm mb-1.5">Gereksiz Başlıkları Eler</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tekrarlayan sipariş üst başlıkları, boş satırlar ve ara toplamları temizler. Yalnızca gerçek ürün satırlarını ayıklar.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="text-xs font-bold text-emerald-700 tracking-wider uppercase mb-1">02. Mutabakat & Sağlama</div>
          <h4 className="font-bold text-slate-900 text-sm mb-1.5">D Sütunu Dip Toplam Kontrolü</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Excel'in D sütunundaki dip toplamı otomatik bulur ve çıkarılan ürünlerin toplamıyla karşılaştırarak 0,00 ₺ fark kontrolü yapar.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="text-xs font-bold text-emerald-700 tracking-wider uppercase mb-1">03. Temiz Dışa Aktarma</div>
          <h4 className="font-bold text-slate-900 text-sm mb-1.5">Hazır XLSX & CSV İndirme</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Stok Adı, Miktar, Birim, Fiyat ve KDV kolonlarından oluşan temiz listeyi tek tıkla Excel, CSV veya panoya kopyalama olarak verir.
          </p>
        </div>
      </div>
    </div>
  );
};
