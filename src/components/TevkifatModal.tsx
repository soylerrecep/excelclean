import React, { useState } from 'react';
import {
  X,
  FileText,
  Plus,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Info,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { TevkifatRule, TevkifatReport } from '../utils/tevkifatRules';
import { formatCurrency, formatNumber } from '../utils/exportHelpers';

interface TevkifatModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: TevkifatRule[];
  onAddRule: (keyword: string, tevkifatOrani: string, aciklama: string, minTotalThreshold: number) => void;
  onDeleteRule: (id: string) => void;
  report: TevkifatReport;
}

export const TevkifatModal: React.FC<TevkifatModalProps> = ({
  isOpen,
  onClose,
  rules,
  onAddRule,
  onDeleteRule,
  report
}) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [newOran, setNewOran] = useState('5/10');
  const [newThreshold, setNewThreshold] = useState('12000');
  const [newAciklama, setNewAciklama] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const kw = newKeyword.trim();
    if (!kw) return;
    const threshold = parseFloat(newThreshold) || 0;
    onAddRule(
      kw,
      newOran,
      newAciklama.trim() || `${kw} (${threshold > 0 ? `${threshold.toLocaleString('tr-TR')} TL üzeri` : 'Tevkifat'})`,
      threshold
    );
    setNewKeyword('');
    setNewAciklama('');
    setNewThreshold('12000');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  KDV Tevkifatı (Tevkifatlı Ürünler ve Üst Sınır Ayarları)
                </h3>
                {report.tevkifatCount > 0 ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold">
                    {report.tevkifatCount} Ürün Tevkifata Tabi
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                    Tevkifatlı Ürün Yok
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                KDV dahil üst sınır (örn. 12.000 TL) ve anahtar kelime kurallarına göre tevkifat uyarıları.
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

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Summary KPI Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Denetlenen Kalem</span>
              <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                {report.totalChecked} Ürün
              </div>
            </div>

            <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200">
              <span className="text-xs text-purple-800 font-medium">Tevkifata Tabi Ürün</span>
              <div className="text-xl font-bold text-purple-900 font-mono mt-0.5">
                {report.tevkifatCount} Kalem
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Toplam Tevkifat Tutarı</span>
              <div className="text-xl font-bold text-purple-700 font-mono mt-0.5">
                {formatCurrency(report.totalTevkifatTL)}
              </div>
            </div>
          </div>

          {/* Section 1: Detected Tevkifat Items */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              <span>Tevkifat Hesaplayınız / Uyarı Veren Ürünler ({report.tevkifatCount})</span>
            </div>

            {report.tevkifatCount === 0 ? (
              <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-bold text-xs text-slate-800">
                  Sınırları aşan veya kurala uyan tevkifatlı ürün bulunamadı.
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Stok adında çivi, hafriyat, temizlik vb. geçen ve KDV dahil toplamı üst sınırı aşan ürünler burada listelenir.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {report.matches.map((m) => (
                  <div
                    key={m.item.id}
                    className="p-4 bg-purple-50/40 rounded-xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">
                          {m.item.stokAdi}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-900 font-mono">
                          Oran: {m.rule.tevkifatOrani}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          <span>KDV Dahil Toplam Sınırını Aştı ({formatNumber(m.rule.minTotalThreshold || 0)} TL) - Tevkifat Hesaplayınız</span>
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {m.rule.aciklama} • Miktar: {formatNumber(m.item.miktar)} {m.item.birim} • KDV Dahil Toplam: <strong className="font-mono">{formatCurrency(m.item.toplamTutar)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center font-mono text-xs">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">KDV Tutarı</span>
                        <span className="font-bold text-slate-700">{formatCurrency(m.item.kdvTutari)}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                      <div className="text-right">
                        <span className="text-[10px] text-purple-700 font-bold block">Tevkifat Kesintisi</span>
                        <span className="font-bold text-purple-900">{formatCurrency(m.tevkifatTutar)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Add New Tevkifat Rule */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-purple-600" />
              <span>Yeni Tevkifat Kuralı ve KDV Dahil Üst Sınır Ekle</span>
            </div>

            <form
              onSubmit={handleAddSubmit}
              className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
            >
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Stok Kelimesi
                </label>
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Örn: çivi, hafriyat..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-purple-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Tevkifat Oranı
                </label>
                <select
                  value={newOran}
                  onChange={(e) => setNewOran(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg focus:outline-purple-600 bg-white cursor-pointer"
                >
                  <option value="9/10">9/10 Tevkifat</option>
                  <option value="7/10">7/10 Tevkifat</option>
                  <option value="5/10">5/10 Tevkifat</option>
                  <option value="4/10">4/10 Tevkifat</option>
                  <option value="3/10">3/10 Tevkifat</option>
                  <option value="2/10">2/10 Tevkifat</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  KDV Dahil Sınır (TL)
                </label>
                <input
                  type="number"
                  step="1"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                  placeholder="Örn: 12000"
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-purple-600 bg-white"
                  title="Bu tutarı aşarsa tevkifat uyarısı verir (0 = sınırsız)"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Açıklama
                </label>
                <input
                  type="text"
                  value={newAciklama}
                  onChange={(e) => setNewAciklama(e.target.value)}
                  placeholder="Örn: Çivi ve bağlama"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-purple-600 bg-white"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={!newKeyword.trim()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Kural Ekle</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: Defined Rules List */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Aktif Tevkifat Kuralları ({rules.length})
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">"{rule.keyword}"</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                        {rule.tevkifatOrani}
                      </span>
                      {rule.minTotalThreshold !== undefined && rule.minTotalThreshold > 0 && (
                        <span className="text-[10px] font-mono font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          KDV Dahil &gt;= {formatNumber(rule.minTotalThreshold)} ₺
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{rule.aciklama}</div>
                  </div>

                  <button
                    onClick={() => onDeleteRule(rule.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                    title="Kuralı Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>KDV dahil sınır aşımında "Tevkifat Hesaplayınız" uyarısı otomatik verilir.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
