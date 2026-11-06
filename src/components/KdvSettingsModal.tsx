import React, { useState } from 'react';
import {
  X,
  Settings,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Wand2,
  ArrowRight,
  Info
} from 'lucide-react';
import { KdvRule, KdvRulesReport } from '../utils/kdvRules';

interface KdvSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: KdvRule[];
  onAddRule: (keyword: string, targetKdv: number) => void;
  onDeleteRule: (id: string) => void;
  report: KdvRulesReport;
  onFixSingleItem: (itemId: string, targetKdv: number) => void;
  onFixAllMismatches: () => void;
}

export const KdvSettingsModal: React.FC<KdvSettingsModalProps> = ({
  isOpen,
  onClose,
  rules,
  onAddRule,
  onDeleteRule,
  report,
  onFixSingleItem,
  onFixAllMismatches
}) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [newTargetKdv, setNewTargetKdv] = useState<number>(20);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    onAddRule(trimmed, newTargetKdv);
    setNewKeyword('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  KDV Ayarları ve Ürün Kuralları
                </h3>
                {report.mismatchCount > 0 ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                    {report.mismatchCount} Kural Uyuşmazlığı
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                    Tüm Ürünler Kurallara Uygun
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Stok adında belirli bir kelime geçen ürünler için KDV oranı belirleyin; farklı oranlar uyarılır.
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
          {/* Section 1: Add New Rule Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Yeni KDV Kuralı Ekle</span>
            </div>

            <form
              onSubmit={handleAddSubmit}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Stok Adında Aranacak Kelime
                </label>
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Örn: ayakkabı, baret, çimento, boru..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-blue-600 focus:border-blue-600 bg-white"
                />
              </div>

              <div className="w-full sm:w-40">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Olması Gereken KDV
                </label>
                <select
                  value={newTargetKdv}
                  onChange={(e) => setNewTargetKdv(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg focus:outline-blue-600 focus:border-blue-600 bg-white cursor-pointer"
                >
                  <option value={20}>%20 KDV</option>
                  <option value={10}>%10 KDV</option>
                  <option value={1}>%1 KDV</option>
                  <option value={0}>%0 KDV</option>
                </select>
              </div>

              <div className="self-end sm:self-auto pt-0 sm:pt-4">
                <button
                  type="submit"
                  disabled={!newKeyword.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Kuralı Ekle</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Active Rules List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span>Tanımlı KDV Kuralları ({rules.length})</span>
              <span className="text-[11px] font-normal normal-case text-slate-400">
                Stok adında bu kelimeler geçtiğinde otomatik kontrol edilir
              </span>
            </div>

            {rules.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                Henüz tanımlı KDV kuralı yok. Yukarıdaki formdan ekleyebilirsiniz.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">İçerik:</span>
                      <strong className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        "{rule.keyword}"
                      </strong>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        %{rule.targetKdv}
                      </span>
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
            )}
          </div>

          {/* Section 3: Rule Violations / Warnings */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Kurala Uymayan Ürünler
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  report.mismatchCount > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {report.mismatchCount} Ürün
                </span>
              </div>

              {report.mismatchCount > 0 && (
                <button
                  onClick={onFixAllMismatches}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Tümünü Belirlenen Kurala Göre Düzelt</span>
                </button>
              )}
            </div>

            {report.mismatchCount === 0 ? (
              <div className="p-6 bg-emerald-50/60 rounded-xl border border-emerald-200 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="font-bold text-xs text-emerald-950">
                  Uyuşmazlık Bulunamadı
                </div>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  Listedeki tüm ürünlerin KDV oranları belirlediğiniz kurallara tam uyum sağlamaktadır.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {report.mismatches.map((m) => (
                  <div
                    key={m.item.id}
                    className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-bold text-xs text-slate-900">
                          {m.item.stokAdi}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 pl-6 flex items-center gap-1.5">
                        <span>Eşleşen Kural:</span>
                        <span className="font-semibold text-slate-800">
                          "{m.matchedRule.keyword}" geçen ürünler %{m.targetRate} olmalı
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <div className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-mono font-bold text-xs">
                        Mevcut: %{m.currentRate}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <div className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-xs">
                        Hedef: %{m.targetRate}
                      </div>

                      <button
                        onClick={() => onFixSingleItem(m.item.id, m.targetRate)}
                        className="ml-2 inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs"
                      >
                        <span>%{m.targetRate} Yap</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Kural ayarlarınız tarayıcınızda otomatik kaydedilir ve sonraki dosyalarda da korunur.
            </span>
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
