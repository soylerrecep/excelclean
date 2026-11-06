import * as XLSX from 'xlsx';
import { ExtractedProductItem, ParseResult, ReconciliationResult } from '../types/excel';

/**
 * Parses Turkish and European formatted numbers ("1.250,50", "187,50", "29,25", "148005", "148.005,00")
 * as well as standard JS numbers.
 */
export function parseLocalizedNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  let str = String(val).trim();
  if (!str) return 0;

  // Remove currency signs (₺, TL, $, €) and spaces
  str = str.replace(/[₺TL$\s]/gi, '').trim();

  // If format is like "148.005,00" or "1.250,50" (dot as thousand separator, comma as decimal)
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Turkish format: 148.005,00
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 148,005.00
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Only comma: e.g. "187,50" or "29,25" -> replace with dot
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Normalizes text for header detection
 */
function normalizeHeader(val: any): string {
  if (!val) return '';
  return String(val)
    .trim()
    .toLowerCase()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/[._\-\s]/g, '');
}

interface ColumnMapping {
  stokKodu: number;
  stokAdi: number;
  miktar: number;
  birim: number;
  kdvHaricFiyat: number;
  kdvOrani: number;
  araTutar: number;
  toplamTutar: number;
  barkod: number;
}

const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  stokKodu: 1, // B
  stokAdi: 2, // C
  barkod: 3, // D
  miktar: 5, // F
  birim: 6, // G
  kdvHaricFiyat: 13, // N
  araTutar: 15, // P
  toplamTutar: 17, // R
  kdvOrani: 26 // AA
};

export function parseExcelBuffer(buffer: ArrayBuffer, fileName: string): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0] || 'Sayfa1';
  const worksheet = workbook.Sheets[firstSheetName];

  // Raw rows as 2D array
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
  const rawRowsNumeric: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null });

  let activeMapping: ColumnMapping = { ...DEFAULT_COLUMN_MAPPING };
  const extractedItems: ExtractedProductItem[] = [];

  let currentSiparisNo = '';
  let currentCariUnvan = '';
  let orderCount = 0;
  let skippedHeaderRows = 0;

  // Let's first search for any bottom D-column total or summary row
  let detectedDTotal: number | undefined = undefined;
  let dTotalSource = 'Otomatik Tespit';

  // 1. Scan from bottom row upwards to find D column total
  const totalRows = rawRows.length;
  for (let r = totalRows - 1; r >= Math.max(0, totalRows - 40); r--) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rowText = row.map(c => String(c).toLowerCase()).join(' ');
    const hasTotalLabel = rowText.includes('genel toplam') || rowText.includes('dip toplam') || rowText.includes('toplam') || rowText.includes('toplam tutar');

    // Check Column D (index 3) and Column E, F, G, H, R, S
    const candidateD = parseLocalizedNumber(row[3]); // Column D
    const candidateE = parseLocalizedNumber(row[4]);
    const candidateH = parseLocalizedNumber(row[7]);

    if (candidateD > 100) {
      detectedDTotal = candidateD;
      dTotalSource = `D Sütunu Son Satır (Satır ${r + 1})`;
      break;
    } else if (hasTotalLabel) {
      // Find the first large positive number in this total row
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const val = parseLocalizedNumber(row[colIdx]);
        if (val > 100) {
          detectedDTotal = val;
          dTotalSource = `Dip Toplam Satırı (Satır ${r + 1}, Sütun ${colIdx + 1})`;
          break;
        }
      }
      if (detectedDTotal) break;
    }
  }

  // 2. Iterate each row to extract items
  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r] || [];
    const numRow = rawRowsNumeric[r] || [];
    if (row.length === 0) continue;

    const rowStr = row.map(c => String(c).trim()).join(' ');
    if (!rowStr) continue;

    // Check if this row is an Order Header row (e.g., Yurtiçi İd Alınan, Sipariş No, Ticari Unvanı)
    const normRow = row.map(normalizeHeader);
    const isOrderHeader =
      normRow.some(c => c.includes('yurtici') || c.includes('muhasebelendi') || c.includes('siparissatis')) ||
      normRow.some(c => c === 'siparisi' || c === 'siparisno' || c === 'ticariunvani');

    if (isOrderHeader) {
      skippedHeaderRows++;
      // Try to extract Sipariş No and Cari Unvanı from order header
      // Usually Sipariş No is in col E (index 4) or D
      for (let col = 0; col < row.length; col++) {
        const cell = String(row[col] || '').trim();
        if (/^[S|ASP|SP]\d+/i.test(cell)) {
          currentSiparisNo = cell;
        }
        if (cell.includes('TİC') || cell.includes('LTD') || cell.includes('ŞTİ') || cell.includes('A.Ş') || cell.includes('SAN.') || cell.includes('GIDA') || cell.includes('MADENCİLİK')) {
          currentCariUnvan = cell;
        }
      }
      orderCount++;
      continue;
    }

    // Check if this row is a column header (Stok Kodu, Stok Adı, Miktarı, Birimi, vb.)
    const isSubHeader =
      normRow.some(c => c.includes('stokkodu') || c === 'stok' || c.includes('stokkod')) &&
      normRow.some(c => c.includes('stokadi') || c === 'stokad') &&
      normRow.some(c => c.includes('miktar') || c.includes('birim'));

    if (isSubHeader) {
      skippedHeaderRows++;
      // Dynamically detect column indices!
      const newMap: Partial<ColumnMapping> = {};
      normRow.forEach((cell, idx) => {
        if (cell.includes('stokkodu') || cell === 'stokkod') newMap.stokKodu = idx;
        else if (cell.includes('stokadi') || cell === 'stokad') newMap.stokAdi = idx;
        else if (cell === 'barkodu' || cell === 'barkod') newMap.barkod = idx;
        else if (cell === 'miktari' || cell === 'miktar') newMap.miktar = idx;
        else if (cell === 'birimi' || cell === 'birim') newMap.birim = idx;
        else if (cell.includes('kdvhrsfiyat') || cell.includes('kdvharicfiyat') || cell.includes('kdvhrcfiyat')) newMap.kdvHaricFiyat = idx;
        else if (cell.includes('kdvorani') || cell.includes('kdvoran') || cell === 'kdv') newMap.kdvOrani = idx;
        else if (cell.includes('aratutari') || cell.includes('aratutar')) newMap.araTutar = idx;
        else if (cell.includes('toplamtutar') || cell.includes('kdvtutari')) newMap.toplamTutar = idx;
      });

      activeMapping = {
        ...activeMapping,
        ...newMap
      };
      continue;
    }

    // Check if this row is a summary/footer row (e.g. "Toplam", "Genel Toplam")
    const isBottomTotalRow = normRow.some(c => c === 'geneltoplam' || c === 'aratoplam' || c === 'toplam' || c === 'diptoplam');
    if (isBottomTotalRow) {
      skippedHeaderRows++;
      continue;
    }

    // Attempt to extract item from row using active column mappings
    const stokAdiCandidate = String(row[activeMapping.stokAdi] || '').trim();
    const stokKoduCandidate = String(row[activeMapping.stokKodu] || '').trim();

    // If both Stok Adı and Stok Kodu are empty, or it's clearly a decorative row
    if (!stokAdiCandidate && !stokKoduCandidate) {
      continue;
    }

    // Check if stokAdiCandidate is a header word
    const normStok = normalizeHeader(stokAdiCandidate);
    if (normStok === 'stokadi' || normStok === 'stokkodu' || normStok === 'ticariunvani' || normStok.includes('muhasebelendi')) {
      continue;
    }

    // Extract numeric miktar
    const miktarRaw = numRow[activeMapping.miktar] ?? row[activeMapping.miktar];
    const miktar = parseLocalizedNumber(miktarRaw);

    // Extract unit
    const birimRaw = String(row[activeMapping.birim] || '').trim().toUpperCase();
    const birim = birimRaw || 'ADET';

    // Extract KDV Hariç Fiyat
    const fiyatRaw = numRow[activeMapping.kdvHaricFiyat] ?? row[activeMapping.kdvHaricFiyat];
    let kdvHaricFiyat = parseLocalizedNumber(fiyatRaw);
    kdvHaricFiyat = Math.round(kdvHaricFiyat * 10000) / 10000;

    // Extract KDV Oranı
    let kdvOraniRaw = numRow[activeMapping.kdvOrani] ?? row[activeMapping.kdvOrani];
    let kdvOrani = parseLocalizedNumber(kdvOraniRaw);
    if (kdvOrani > 0 && kdvOrani < 1) {
      // 0.20 -> 20
      kdvOrani = Math.round(kdvOrani * 100);
    }
    // If not found or 0, default to 20 (standard in Turkey for these items)
    if (kdvOrani === 0) {
      kdvOrani = 20;
    }

    // Extract or calculate ara tutar (KDV Hariç Tutar)
    const araTutarRaw = numRow[activeMapping.araTutar] ?? row[activeMapping.araTutar];
    let kdvHaricTutar = parseLocalizedNumber(araTutarRaw);

    if (kdvHaricTutar === 0 && miktar > 0 && kdvHaricFiyat > 0) {
      kdvHaricTutar = Math.round(miktar * kdvHaricFiyat * 100) / 100;
    } else if (kdvHaricFiyat === 0 && miktar > 0 && kdvHaricTutar > 0) {
      kdvHaricFiyat = Math.round((kdvHaricTutar / miktar) * 10000) / 10000;
    }

    // Valid item check: must have either valid quantity and price, or valid product name with quantity
    if (stokAdiCandidate && (miktar > 0 || kdvHaricFiyat > 0 || kdvHaricTutar > 0)) {
      const kdvTutari = Math.round(kdvHaricTutar * (kdvOrani / 100) * 100) / 100;
      const toplamTutar = Math.round((kdvHaricTutar + kdvTutari) * 100) / 100;

      extractedItems.push({
        id: `extracted-${r}-${extractedItems.length + 1}`,
        stokKodu: stokKoduCandidate || '-',
        stokAdi: stokAdiCandidate,
        miktar: miktar || 1,
        birim: birim || 'ADET',
        kdvHaricFiyat: kdvHaricFiyat,
        kdvOrani: kdvOrani,
        kdvHaricTutar: kdvHaricTutar,
        kdvTutari: kdvTutari,
        toplamTutar: toplamTutar,
        siparisNo: currentSiparisNo || undefined,
        cariUnvan: currentCariUnvan || undefined,
        rawRowNumber: r + 1
      });
    }
  }

  // Calculate totals
  const calculatedSubtotal = Math.round(extractedItems.reduce((acc, it) => acc + it.kdvHaricTutar, 0) * 100) / 100;
  const calculatedTaxTotal = Math.round(extractedItems.reduce((acc, it) => acc + it.kdvTutari, 0) * 100) / 100;
  const calculatedGrandTotal = Math.round(extractedItems.reduce((acc, it) => acc + it.toplamTutar, 0) * 100) / 100;

  // Determine excel target total
  const finalExcelTotal = detectedDTotal !== undefined && detectedDTotal > 0 ? detectedDTotal : calculatedGrandTotal;
  const difference = Math.round(Math.abs(finalExcelTotal - calculatedGrandTotal) * 100) / 100;
  const isReconciled = difference < 0.05;

  const reconciliation: ReconciliationResult = {
    excelGrandTotal: finalExcelTotal,
    excelTotalSource: detectedDTotal ? dTotalSource : 'Ayıklanan Toplamdan Otomatik Hesaptandı',
    calculatedSubtotal,
    calculatedTaxTotal,
    calculatedGrandTotal,
    targetMode: 'kdvDahil',
    difference,
    isReconciled
  };

  return {
    fileName,
    fileSize: buffer.byteLength,
    sheetName: firstSheetName,
    items: extractedItems,
    reconciliation,
    orderCount: Math.max(orderCount, 1),
    totalRowsScanned: rawRows.length,
    skippedHeaderRows,
    detectedDColumnTotal: detectedDTotal,
    rawPreview: rawRows.slice(0, 15)
  };
}
