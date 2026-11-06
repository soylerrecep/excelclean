export interface ExtractedProductItem {
  id: string;
  stokKodu?: string;
  stokAdi: string;
  miktar: number;
  birim: string;
  kdvHaricFiyat: number;
  kdvOrani: number; // e.g. 20, 10, 1
  kdvHaricTutar: number; // miktar * kdvHaricFiyat
  kdvTutari: number; // kdvHaricTutar * (kdvOrani / 100)
  toplamTutar: number; // kdvHaricTutar + kdvTutari
  siparisNo?: string;
  cariUnvan?: string;
  rawRowNumber?: number;
  isAdjustment?: boolean; // Kuruş farkını kapatmak için eklenen satır
  combinedCount?: number; // Aynı isimdeki ürünler birleştirildiğinde kaç kalemden oluştuğu
}

export interface ReconciliationResult {
  excelGrandTotal: number; // Excel'den okunan D sütunu dip toplamı veya genel toplam
  excelTotalSource: string; // "D Sütunu Son Toplam Hücresi", "Siparişler Toplamı", vb.
  calculatedSubtotal: number; // Ayıklanan ürünlerin KDV hariç matrahı
  calculatedTaxTotal: number; // Ayıklanan ürünlerin toplam KDV tutarı
  calculatedGrandTotal: number; // Ayıklanan ürünlerin KDV dahil genel toplamı
  targetMode: 'kdvDahil' | 'kdvHaric'; // Karşılaştırma modu (varsayılan KDV Dahil)
  difference: number; // Hedef toplam ile ayıklanan toplam arasındaki fark
  isReconciled: boolean; // Fark 0.05 TL altındaysa true
}

export interface ParseResult {
  fileName: string;
  fileSize: number;
  sheetName: string;
  items: ExtractedProductItem[];
  reconciliation: ReconciliationResult;
  orderCount: number;
  totalRowsScanned: number;
  skippedHeaderRows: number;
  detectedDColumnTotal?: number;
  rawPreview?: string[][];
}
