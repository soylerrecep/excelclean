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

  // Remove currency signs (₺, TL, $, €, %) and spaces
  str = str.replace(/[₺TL$€%\s]/gi, '').trim();

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
 * Turkish-aware header normalization (handles İ/I/Ğ/Ü/Ş/Ö/Ç before lowercasing to avoid \u0307 bugs)
 */
function normalizeHeader(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLowerCase()
    .replace(/\u0307/g, '')
    .replace(/[._\-\s%():/\\]/g, '');
}

/**
 * Standard Turkish & international units of measure (Birimi)
 */
const KNOWN_UNITS = new Set([
  'ADET', 'ADT', 'AD',
  'KG', 'KĞ', 'KILO', 'KİLO', 'KILOGRAM', 'KİLOGRAM', 'GR', 'GRAM', 'MG', 'TON', 'TN',
  'MT', 'M', 'METRE', 'METRETUL', 'METRETÜL', 'MTUL', 'M/T',
  'M2', 'M²', 'METREKARE', 'M3', 'M³', 'METREKUP', 'METREKÜP', 'CM', 'MM', 'KM',
  'LT', 'L', 'LITRE', 'LİTRE', 'ML', 'CC',
  'TORBA', 'TRB', 'CUVAL', 'ÇUVAL', 'CVL',
  'PAKET', 'PKT', 'PK',
  'KUTU', 'KT',
  'KOLI', 'KOLİ', 'KL',
  'RULO', 'RL', 'BOBIN', 'BOBİN', 'MAKARA', 'TOP',
  'TAKIM', 'TKM', 'TK', 'SET',
  'CIFT', 'ÇİFT', 'CFT', 'ÇFT',
  'KOVA', 'TENEKE', 'TNK', 'BIDON', 'BİDON', 'VARIL', 'VARİL', 'GALON', 'KAP',
  'BAG', 'BAĞ', 'DEMET', 'DMT', 'BALYA',
  'PLAKA', 'PLK', 'LEVHA', 'TABAKA', 'BOY',
  'PALET', 'PLT', 'SANDIK', 'KASA', 'KARTON',
  'SISE', 'ŞİŞE', 'TUP', 'TÜP', 'KAVANOZ', 'POSET', 'POŞET',
  'DUZINE', 'DÜZİNE', 'DESTE', 'KOCAN', 'KOÇAN', 'FILE', 'FİLE', 'SEPET', 'TEPSI', 'TEPSİ',
  'SAAT', 'GUN', 'GÜN', 'AY', 'YIL', 'KALEM', 'PARCA', 'PARÇA', 'BIRIM', 'BİRİM', 'HIZMET', 'HİZMET',
  'SERIT', 'ŞERİT', 'DILIM', 'DİLİM', 'KAPSUL', 'KAPSÜL', 'PORSIYON', 'PORSİYON'
]);

const KNOWN_TWO_WORD_UNITS = new Set([
  'METRE KARE',
  'METRE KUP',
  'METRE KÜP',
  'METRE TUL',
  'METRE TÜL'
]);

/**
 * Validates whether a cell value represents a unit of measure (Birimi) rather than
 * an order note, customer name, or product description (e.g. "BAĞ TELİ,HA" or "TUĞLA 8,5 LUK").
 */
function evaluateUnit(rawUnit: string): { clean: string; isKnown: boolean; isPlausible: boolean } {
  const trimmed = rawUnit.trim().toUpperCase();
  if (!trimmed) {
    return { clean: '', isKnown: false, isPlausible: false };
  }

  const clean = trimmed.replace(/\.+$/, '').trim();

  if (KNOWN_UNITS.has(clean) || KNOWN_TWO_WORD_UNITS.has(clean)) {
    return { clean, isKnown: true, isPlausible: true };
  }

  // Comma, semicolon, colon, or parenthesis inside a "unit" means it's an order description
  if (/[,;:()]/.test(clean)) {
    return { clean, isKnown: false, isPlausible: false };
  }

  // Multiple words not in KNOWN_TWO_WORD_UNITS -> order description/product name
  if (/\s+/.test(clean)) {
    return { clean, isKnown: false, isPlausible: false };
  }

  // Purely numeric or too long (> 10 chars) -> not a unit
  if (/^\d+([.,]\d+)?$/.test(clean) || clean.length > 10) {
    return { clean, isKnown: false, isPlausible: false };
  }

  // Short single alphabetic token (e.g. 2-8 letters, no punctuation)
  const isShortAlpha = /^[A-ZÇĞİÖŞÜ]{1,8}$/.test(clean);
  return { clean, isKnown: false, isPlausible: isShortAlpha };
}

interface ColumnMapping {
  stokKodu: number;
  stokAdi: number;
  barkod: number;
  miktar: number;
  birim: number;
  fiyatAlt: number; // M (12)
  kdvHaricFiyat: number; // N (13)
  araTutar: number; // P (15)
  toplamTutar: number; // R (17)
  kdvOrani: number; // AB (27)
}

const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  stokKodu: 1, // B
  stokAdi: 2, // C
  barkod: 3, // D
  miktar: 5, // F
  birim: 6, // G
  fiyatAlt: 12, // M
  kdvHaricFiyat: 13, // N
  araTutar: 15, // P
  toplamTutar: 17, // R
  kdvOrani: 27 // AB
};

function isOrderHeaderLabelRow(normRow: string[]): boolean {
  const hasEntityLabel = normRow.some(
    c =>
      c === 'ticariunvani' ||
      c === 'cariunvani' ||
      c === 'cariadi' ||
      c === 'carikodu' ||
      c === 'adisoyadi' ||
      c === 'siparisturu' ||
      c === 'siparisdurumu'
  );
  const hasOrderLabel = normRow.some(
    c =>
      c === 'siparistarihi' ||
      c === 'siparisno' ||
      c === 'siparisi' ||
      c === 'siparistipi' ||
      c === 'belgeno' ||
      c === 'yetkilisi'
  );
  const hasProductHeader = normRow.some(c => c === 'stokadi' || c === 'stokkodu');
  if (hasProductHeader && !hasEntityLabel) return false;

  return hasEntityLabel || hasOrderLabel;
}

function isOrderDataStatusRow(normRow: string[]): boolean {
  return normRow.some(
    c =>
      c.includes('yurtici') ||
      c.includes('yurtdisi') ||
      c.includes('muhasebelendi') ||
      c.includes('siparissatis') ||
      c.includes('alinansiparis') ||
      c.includes('verilensiparis')
  );
}

/**
 * Detects the product sub-header row ("Stok Kodu | Stok Adı | Barkodu | ... | Miktarı | Birimi")
 * right above each order's product rows.
 */
function isProductSubHeaderRow(normRow: string[], activeStokAdiCol: number): boolean {
  const hasStokAdiInCol =
    normRow[activeStokAdiCol] === 'stokadi' ||
    normRow[activeStokAdiCol] === 'stokad' ||
    normRow[2] === 'stokadi' ||
    normRow[2] === 'stokad';

  if (hasStokAdiInCol) return true;

  const hasStokAdiAnywhere = normRow.some(
    c => c === 'stokadi' || c === 'stokad' || c === 'malzemeadi' || c === 'urunadi'
  );
  const hasMiktarAndBirim =
    normRow.some(c => c === 'miktari' || c === 'miktar') &&
    normRow.some(c => c === 'birimi' || c === 'birim');
  const hasStokKoduAndMiktarOrBirim =
    normRow.some(c => c === 'stokkodu' || c === 'stokkod') &&
    normRow.some(c => c === 'miktari' || c === 'miktar' || c === 'birimi' || c === 'birim');

  return (
    (hasStokAdiAnywhere && normRow.some(c => c.includes('miktar') || c.includes('birim'))) ||
    hasMiktarAndBirim ||
    hasStokKoduAndMiktarOrBirim
  );
}

function extractColumnMappingFromSubHeader(
  normRow: string[],
  current: ColumnMapping
): ColumnMapping {
  const newMap: Partial<ColumnMapping> = {};
  let foundExplicitKdvHaricFiyat = false;

  normRow.forEach((cell, idx) => {
    if (!cell) return;
    if (cell === 'stokkodu' || cell === 'stokkod') {
      newMap.stokKodu = idx;
    } else if (
      cell === 'stokadi' ||
      cell === 'stokad' ||
      cell === 'malzemeadi' ||
      cell === 'urunadi'
    ) {
      newMap.stokAdi = idx;
    } else if (cell === 'barkodu' || cell === 'barkod') {
      newMap.barkod = idx;
    } else if (cell === 'miktari' || cell === 'miktar') {
      newMap.miktar = idx;
    } else if (cell === 'birimi' || cell === 'birim' || cell === 'olcubirimi') {
      newMap.birim = idx;
    } else if (
      cell.includes('kdvhrsfiyat') ||
      cell.includes('kdvharicfiyat') ||
      cell.includes('kdvhrcfiyat') ||
      cell.includes('kdvharicbirimfiyat') ||
      cell.includes('netfiyat') ||
      (cell.includes('kdvh') && cell.includes('fiyat')) ||
      ((cell === 'kdvharic' || cell === 'kdvhrc' || cell === 'kdvhrs') && !foundExplicitKdvHaricFiyat)
    ) {
      newMap.kdvHaricFiyat = idx;
      foundExplicitKdvHaricFiyat = true;
    } else if (
      (cell === 'fiyati' || cell === 'fiyat' || cell === 'birimfiyati' || cell === 'birimfiyat') &&
      !foundExplicitKdvHaricFiyat
    ) {
      newMap.fiyatAlt = idx;
    } else if (
      cell.includes('kdvorani') ||
      cell.includes('kdvoran') ||
      cell === 'kdv' ||
      cell === 'kdvyuzde' ||
      cell === 'kdvyuzdesi'
    ) {
      newMap.kdvOrani = idx;
    } else if (
      cell.includes('aratutari') ||
      cell.includes('aratutar') ||
      cell.includes('kdvharictutar') ||
      cell.includes('kdvhrstutar') ||
      cell.includes('nettutar')
    ) {
      newMap.araTutar = idx;
    } else if (cell.includes('toplamtutar') || cell.includes('kdvdahiltutar')) {
      newMap.toplamTutar = idx;
    }
  });

  return {
    ...current,
    ...newMap
  };
}

function isValidKdvRateValue(raw: any): { valid: boolean; rate: number } {
  if (raw === null || raw === undefined) return { valid: false, rate: 0 };
  const str = String(raw).trim();
  if (!str) return { valid: false, rate: 0 };

  let num = parseLocalizedNumber(raw);
  if (num > 0 && num < 1) {
    num = Math.round(num * 100);
  }
  const rounded = Math.round(num * 100) / 100;
  const valid = !isNaN(rounded) && rounded >= 0 && rounded <= 40 && /\d/.test(str);
  return { valid, rate: rounded };
}

function looksLikeDateCell(val: any, numVal: any): boolean {
  if (numVal instanceof Date) return true;
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  if (!s) return false;
  // Matches "23.11.2026 17:29:41", "3.10.2026 12:17:12", "2026-11-23", "29/07/2026"
  return (
    /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}(\s+\d{1,2}:\d{2}(:\d{2})?)?$/.test(s) ||
    /^\d{4}-\d{2}-\d{2}/.test(s)
  );
}

function looksLikeCompanyName(text: string): boolean {
  const upper = text.toLocaleUpperCase('tr-TR');
  return (
    /\b(LTD\.?|ŞTİ\.?|A\.Ş\.?|SAN\.?\s*TİC\.?|TİC\.?\s*LTD\.?|LİMİTED|ANONİM|KOOP\.?)\b/.test(upper) ||
    upper.includes('LTD. ŞTİ') ||
    upper.includes('LTD.ŞTİ') ||
    upper.includes('TİC. LTD') ||
    upper.includes('TİC.LTD') ||
    upper.includes('BELEDİYE') ||
    upper.includes('MÜDÜRLÜĞÜ') ||
    upper.includes('BAKANLIĞI')
  );
}

export function parseExcelBuffer(buffer: ArrayBuffer, fileName: string): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0] || 'Sayfa1';
  const worksheet = workbook.Sheets[firstSheetName];

  // Force range to start at (row 0, col 0 = A1) so column letters C, F, G, M, N, AB
  // retain their exact 0-based indices even if columns A or B were cleared/empty.
  let sheetRange: XLSX.Range | undefined = undefined;
  if (worksheet['!ref']) {
    const decoded = XLSX.utils.decode_range(worksheet['!ref']);
    sheetRange = {
      s: { r: 0, c: 0 },
      e: decoded.e
    };
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: '',
    range: sheetRange
  });
  const rawRowsNumeric: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: null,
    range: sheetRange
  });

  let activeMapping: ColumnMapping = { ...DEFAULT_COLUMN_MAPPING };
  const extractedItems: ExtractedProductItem[] = [];

  let currentSiparisNo = '';
  let currentCariUnvan = '';
  let orderCount = 0;
  let skippedHeaderRows = 0;

  // Pre-scan to detect whether this file uses "Stok Adı" sub-headers and whether KDV uses AB (27) or AA (26)
  let abKdvHits = 0;
  let aaKdvHits = 0;
  let detectedKdvSubHeaderCol: number | null = null;
  let hasAnyStokAdiSubHeader = false;

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r] || [];
    const normRow = row.map(normalizeHeader);
    if (isProductSubHeaderRow(normRow, activeMapping.stokAdi)) {
      hasAnyStokAdiSubHeader = true;
      const m = extractColumnMappingFromSubHeader(normRow, activeMapping);
      if (m.kdvOrani !== activeMapping.kdvOrani) {
        detectedKdvSubHeaderCol = m.kdvOrani;
      }
    }
    const abCheck = isValidKdvRateValue(row[27]);
    if (abCheck.valid && [0, 1, 8, 10, 18, 20].includes(abCheck.rate)) abKdvHits++;
    const aaCheck = isValidKdvRateValue(row[26]);
    if (aaCheck.valid && [0, 1, 8, 10, 18, 20].includes(aaCheck.rate)) aaKdvHits++;
  }

  if (detectedKdvSubHeaderCol !== null) {
    activeMapping.kdvOrani = detectedKdvSubHeaderCol;
  } else if (abKdvHits >= aaKdvHits && abKdvHits > 0) {
    activeMapping.kdvOrani = 27; // AB
  } else if (aaKdvHits > abKdvHits && aaKdvHits > 0) {
    activeMapping.kdvOrani = 26; // AA
  }

  const hasKdvColumnInSheet = detectedKdvSubHeaderCol !== null || abKdvHits >= 2 || aaKdvHits >= 2;

  // 1. Scan from bottom row upwards to find D column total
  let detectedDTotal: number | undefined = undefined;
  let dTotalSource = 'Otomatik Tespit';
  const totalRows = rawRows.length;

  for (let r = totalRows - 1; r >= Math.max(0, totalRows - 40); r--) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rowText = row.map(c => String(c).toLowerCase()).join(' ');
    const hasTotalLabel =
      rowText.includes('genel toplam') ||
      rowText.includes('dip toplam') ||
      rowText.includes('toplam tutar') ||
      rowText.includes('toplam');

    const candidateD = parseLocalizedNumber(row[3]); // Column D
    const colCVal = String(row[2] || '').trim();
    const colGUnit = evaluateUnit(String(row[6] || ''));
    const colFIsDate = looksLikeDateCell(row[5], rawRowsNumeric[r]?.[5]);

    const looksLikeProductRow = Boolean(colCVal) && colGUnit.isKnown;

    if (
      candidateD > 100 &&
      candidateD < 100000000 &&
      !looksLikeProductRow &&
      (!colCVal || hasTotalLabel || (!colGUnit.isKnown && !colFIsDate))
    ) {
      detectedDTotal = candidateD;
      dTotalSource = `D Sütunu Son Satır (Satır ${r + 1})`;
      break;
    } else if (hasTotalLabel) {
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const val = parseLocalizedNumber(row[colIdx]);
        if (val > 100 && val < 100000000) {
          detectedDTotal = val;
          dTotalSource = `Dip Toplam Satırı (Satır ${r + 1}, Sütun ${colIdx + 1})`;
          break;
        }
      }
      if (detectedDTotal) break;
    }
  }

  // Helper to find the next non-empty row index
  const findNextNonEmptyRow = (startIdx: number): number => {
    for (let k = startIdx + 1; k < rawRows.length; k++) {
      const nextR = rawRows[k];
      if (nextR && nextR.some(c => String(c || '').trim() !== '')) {
        return k;
      }
    }
    return -1;
  };

  // Block-level product tracking:
  // When the sheet has "Stok Adı" headers (as shown in the ERP screenshot),
  // ONLY rows directly under a "Stok Adı" row (until blank row / next order / total) are products!
  let inProductBlock = !hasAnyStokAdiSubHeader;

  // 2. Iterate each row to extract items
  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r] || [];
    const numRow = rawRowsNumeric[r] || [];

    const isEmptyRow = row.length === 0 || !row.some(c => String(c || '').trim() !== '');
    if (isEmptyRow) {
      // Blank row separates order blocks -> close current product block
      if (hasAnyStokAdiSubHeader) {
        inProductBlock = false;
      }
      continue;
    }

    const normRow = row.map(normalizeHeader);

    // A. Product Sub-Header Row ("Stok Adı | Miktarı | Birimi") -> opens product block below it!
    if (isProductSubHeaderRow(normRow, activeMapping.stokAdi)) {
      skippedHeaderRows++;
      activeMapping = extractColumnMappingFromSubHeader(normRow, activeMapping);
      inProductBlock = true;
      continue;
    }

    // B. Order Header Label Row ("Sipariş Türü | Sipariş Durumu | Ticari Unvanı | ... | Tarihi | Açıklama")
    if (isOrderHeaderLabelRow(normRow)) {
      skippedHeaderRows++;
      if (hasAnyStokAdiSubHeader) {
        inProductBlock = false;
      }
      continue;
    }

    // C. Order Data Status Row ("Yurt İçi Alınan | Muhasebelendi | MEHMET ZAMKI | ...")
    if (isOrderDataStatusRow(normRow)) {
      skippedHeaderRows++;
      if (hasAnyStokAdiSubHeader) {
        inProductBlock = false;
      }
      for (let col = 0; col < row.length; col++) {
        const cell = String(row[col] || '').trim();
        if (/^(S|ASP|SP)\d+/i.test(cell)) {
          currentSiparisNo = cell;
        }
      }
      const cariFromC = String(row[activeMapping.stokAdi] || '').trim();
      if (cariFromC) {
        currentCariUnvan = cariFromC;
      }
      orderCount++;
      continue;
    }

    // D. Summary/Footer Row ("Toplam", "Genel Toplam", etc.)
    const isBottomTotalRow = normRow.some(
      c =>
        c === 'geneltoplam' ||
        c === 'aratoplam' ||
        c === 'toplam' ||
        c === 'diptoplam' ||
        c === 'toplamtutar' ||
        c === 'kdvtoplami'
    );
    if (isBottomTotalRow) {
      skippedHeaderRows++;
      if (hasAnyStokAdiSubHeader) {
        inProductBlock = false;
      }
      continue;
    }

    // E. Order Data Row detection via Date in Col F (Tarihi) or Left Cols (A/B) or Sipariş No in Col E
    const hasDateInMiktarCol = looksLikeDateCell(
      row[activeMapping.miktar],
      numRow[activeMapping.miktar]
    );
    const hasDateInLeftCols =
      looksLikeDateCell(row[0], numRow[0]) || looksLikeDateCell(row[1], numRow[1]);

    if (hasDateInMiktarCol || hasDateInLeftCols) {
      skippedHeaderRows++;
      if (hasAnyStokAdiSubHeader) {
        inProductBlock = false;
      }
      const sipNoCandidate = String(row[4] || '').trim();
      if (sipNoCandidate) {
        currentSiparisNo = sipNoCandidate;
      }
      const cariFromC = String(row[activeMapping.stokAdi] || '').trim();
      if (cariFromC) {
        currentCariUnvan = cariFromC;
      }
      orderCount++;
      continue;
    }

    // F. Strict block enforcement: if the file uses "Stok Adı" sub-headers,
    // any row outside an open product block (e.g., an Order/Cari row above "Stok Adı") MUST be skipped!
    if (hasAnyStokAdiSubHeader && !inProductBlock) {
      const possibleCari = String(row[activeMapping.stokAdi] || '').trim();
      if (possibleCari) {
        currentCariUnvan = possibleCari;
      }
      const sipNoCandidate = String(row[4] || '').trim();
      if (/^(S|ASP|SP)?\d{3,}$/i.test(sipNoCandidate)) {
        currentSiparisNo = sipNoCandidate;
        orderCount++;
      }
      skippedHeaderRows++;
      continue;
    }

    // G. Look-ahead safeguard: if the very next non-empty row is a "Stok Adı" header row,
    // check if current row is actually an Order/Cari row (no blank row separated them).
    const nextIdx = findNextNonEmptyRow(r);
    const nextIsSubHeader =
      nextIdx !== -1 &&
      isProductSubHeaderRow((rawRows[nextIdx] || []).map(normalizeHeader), activeMapping.stokAdi);

    // Extract candidate fields using active column mappings (C, F, G, M, N, AB)
    const stokAdiCandidate = String(row[activeMapping.stokAdi] || '').trim();
    const stokKoduCandidate = String(row[activeMapping.stokKodu] || '').trim();

    if (!stokAdiCandidate) {
      continue;
    }

    // Skip if stokAdiCandidate is itself a header or summary keyword
    const normStok = normalizeHeader(stokAdiCandidate);
    if (
      normStok === 'stokadi' ||
      normStok === 'stokkodu' ||
      normStok === 'ticariunvani' ||
      normStok === 'cariunvani' ||
      normStok === 'adisoyadi' ||
      normStok === 'toplam' ||
      normStok === 'geneltoplam' ||
      normStok === 'aratoplam' ||
      normStok.includes('muhasebelendi')
    ) {
      continue;
    }

    // Skip if Stok Adı clearly looks like a company name (LTD, ŞTİ, A.Ş, etc.)
    if (looksLikeCompanyName(stokAdiCandidate)) {
      currentCariUnvan = stokAdiCandidate;
      skippedHeaderRows++;
      if (hasAnyStokAdiSubHeader) inProductBlock = false;
      continue;
    }

    // Extract unit (Column G) and validate it strictly
    const birimRaw = String(row[activeMapping.birim] || '').trim();
    const unitEval = evaluateUnit(birimRaw);

    // Reject if unit column contains non-unit descriptions like "BAĞ TELİ,HA" or "TUĞLA 8,5 LUK"
    if (birimRaw && !unitEval.isPlausible) {
      skippedHeaderRows++;
      continue;
    }

    // Extract KDV Oranı (Column AB = 27, or mapped kdvOrani, with AA = 26 fallback if AB empty)
    let kdvRaw = numRow[activeMapping.kdvOrani] ?? row[activeMapping.kdvOrani];
    let kdvCheck = isValidKdvRateValue(kdvRaw);
    if (!kdvCheck.valid && activeMapping.kdvOrani === 27) {
      const aaRaw = numRow[26] ?? row[26];
      const aaCheck = isValidKdvRateValue(aaRaw);
      if (aaCheck.valid) {
        kdvRaw = aaRaw;
        kdvCheck = aaCheck;
      }
    }

    if (nextIsSubHeader && (!unitEval.isKnown || !kdvCheck.valid)) {
      currentCariUnvan = stokAdiCandidate;
      skippedHeaderRows++;
      continue;
    }

    if (hasKdvColumnInSheet && !kdvCheck.valid) {
      if (!unitEval.isKnown || stokAdiCandidate === currentCariUnvan) {
        skippedHeaderRows++;
        continue;
      }
    }

    if (!birimRaw && !kdvCheck.valid) {
      continue;
    }

    if (birimRaw && !unitEval.isKnown && !kdvCheck.valid) {
      skippedHeaderRows++;
      continue;
    }

    // Extract numeric miktar (Column F)
    const miktarRaw = numRow[activeMapping.miktar] ?? row[activeMapping.miktar];
    const miktar = parseLocalizedNumber(miktarRaw);

    // Extract KDV Hariç Fiyat (Column N = 13, fallback Column M = 12)
    const fiyatRawN = numRow[activeMapping.kdvHaricFiyat] ?? row[activeMapping.kdvHaricFiyat];
    const fiyatRawM = numRow[activeMapping.fiyatAlt] ?? row[activeMapping.fiyatAlt];
    const valN = parseLocalizedNumber(fiyatRawN);
    const valM = parseLocalizedNumber(fiyatRawM);

    // Extract Ara Tutar (Column P = 15, if present)
    const araTutarRaw = numRow[activeMapping.araTutar] ?? row[activeMapping.araTutar];
    let kdvHaricTutar = parseLocalizedNumber(araTutarRaw);

    let kdvHaricFiyat = valN;
    if (kdvHaricFiyat === 0 && valM > 0) {
      kdvHaricFiyat = valM;
    } else if (
      kdvHaricTutar === 0 &&
      miktar > 1 &&
      valM > 0 &&
      valN > 0 &&
      Math.abs(valM * miktar - valN) < Math.max(0.05, valN * 0.005)
    ) {
      kdvHaricFiyat = valM;
      kdvHaricTutar = valN;
    }

    kdvHaricFiyat = Math.round(kdvHaricFiyat * 10000) / 10000;

    const kdvOrani = kdvCheck.valid ? kdvCheck.rate : 20;

    if (kdvHaricTutar === 0 && miktar > 0 && kdvHaricFiyat > 0) {
      kdvHaricTutar = Math.round(miktar * kdvHaricFiyat * 100) / 100;
    } else if (kdvHaricFiyat === 0 && miktar > 0 && kdvHaricTutar > 0) {
      kdvHaricFiyat = Math.round((kdvHaricTutar / miktar) * 10000) / 10000;
    }

    if (stokAdiCandidate && (miktar > 0 || kdvHaricFiyat > 0 || kdvHaricTutar > 0)) {
      const kdvTutari = Math.round(kdvHaricTutar * (kdvOrani / 100) * 100) / 100;
      const toplamTutar = Math.round((kdvHaricTutar + kdvTutari) * 100) / 100;

      extractedItems.push({
        id: `extracted-${r}-${extractedItems.length + 1}`,
        stokKodu: stokKoduCandidate || '-',
        stokAdi: stokAdiCandidate,
        miktar: miktar || 1,
        birim: unitEval.clean || 'ADET',
        kdvHaricFiyat,
        kdvOrani,
        kdvHaricTutar,
        kdvTutari,
        toplamTutar,
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
    excelTotalSource: detectedDTotal ? dTotalSource : 'Ayıklanan Toplamdan Otomatik Hesaplandı',
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
