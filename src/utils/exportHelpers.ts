import * as XLSX from 'xlsx';
import { ExtractedProductItem } from '../types/excel';

/**
 * Format currency in Turkish Lira style: 1.250,50 ₺
 */
export function formatCurrency(val: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val || 0);
}

/**
 * Format number with thousand separators: 1.250,50
 */
export function formatNumber(val: number, decimals: number = 2): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(val || 0);
}

/**
 * Generates and downloads a clean, beautifully formatted Excel (.xlsx) file
 */
export function exportToCleanExcel(
  items: ExtractedProductItem[],
  originalFileName: string = 'urunler'
): void {
  const baseName = originalFileName.replace(/\.[^/.]+$/, '');
  const exportFileName = `${baseName}_temiz_liste.xlsx`;

  // Prepare data rows (without Stok Kodu)
  const headers = [
    'Sıra No',
    'Stok Adı',
    'Miktarı',
    'Birimi',
    'KDV Hariç Fiyat (TL)',
    'KDV Oranı (%)',
    'KDV Hariç Tutar (TL)',
    'KDV Tutarı (TL)',
    'Toplam Tutar (TL)'
  ];

  const rows = items.map((item, index) => [
    index + 1,
    item.stokAdi,
    item.miktar,
    item.birim,
    item.kdvHaricFiyat,
    `%${item.kdvOrani}`,
    item.kdvHaricTutar,
    item.kdvTutari,
    item.toplamTutar
  ]);

  // Compute footer totals
  const totalMiktar = items.reduce((sum, it) => sum + it.miktar, 0);
  const totalHaric = items.reduce((sum, it) => sum + it.kdvHaricTutar, 0);
  const totalKdv = items.reduce((sum, it) => sum + it.kdvTutari, 0);
  const totalGenel = items.reduce((sum, it) => sum + it.toplamTutar, 0);

  const totalRow = [
    'GENEL TOPLAM',
    `${items.length} Kalem Ürün`,
    totalMiktar,
    '',
    '',
    '',
    totalHaric,
    totalKdv,
    totalGenel
  ];

  const sheetData = [headers, ...rows, totalRow];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },  // Sıra
    { wch: 48 }, // Stok Adı
    { wch: 14 }, // Miktar
    { wch: 10 }, // Birim
    { wch: 22 }, // KDV Hariç Fiyat
    { wch: 14 }, // KDV Oranı
    { wch: 22 }, // KDV Hariç Tutar
    { wch: 18 }, // KDV Tutarı
    { wch: 22 }  // Toplam Tutar
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Temiz Ürün Listesi');
  XLSX.writeFile(workbook, exportFileName);
}

/**
 * Generates and downloads a clean CSV with UTF-8 BOM and semicolon (;) delimiter
 * Ensures Turkish characters (ç, ğ, ı, ö, ş, ü, İ) render perfectly in Excel.
 */
export function exportToCSV(
  items: ExtractedProductItem[],
  originalFileName: string = 'urunler'
): void {
  const baseName = originalFileName.replace(/\.[^/.]+$/, '');
  const exportFileName = `${baseName}_temiz_liste.csv`;

  const headers = [
    'Sıra No',
    'Stok Adı',
    'Miktarı',
    'Birimi',
    'KDV Hariç Fiyat (TL)',
    'KDV Oranı (%)',
    'KDV Hariç Tutar (TL)',
    'KDV Tutarı (TL)',
    'Toplam Tutar (TL)'
  ];

  const csvRows = [headers.join(';')];

  items.forEach((item, index) => {
    const row = [
      index + 1,
      `"${item.stokAdi.replace(/"/g, '""')}"`,
      formatNumber(item.miktar),
      item.birim,
      formatNumber(item.kdvHaricFiyat),
      item.kdvOrani,
      formatNumber(item.kdvHaricTutar),
      formatNumber(item.kdvTutari),
      formatNumber(item.toplamTutar)
    ];
    csvRows.push(row.join(';'));
  });

  // Footer total
  const totalMiktar = items.reduce((sum, it) => sum + it.miktar, 0);
  const totalHaric = items.reduce((sum, it) => sum + it.kdvHaricTutar, 0);
  const totalKdv = items.reduce((sum, it) => sum + it.kdvTutari, 0);
  const totalGenel = items.reduce((sum, it) => sum + it.toplamTutar, 0);

  csvRows.push([
    'TOPLAM',
    `"${items.length} Kalem Ürün"`,
    formatNumber(totalMiktar),
    '',
    '',
    '',
    formatNumber(totalHaric),
    formatNumber(totalKdv),
    formatNumber(totalGenel)
  ].join(';'));

  // UTF-8 BOM \uFEFF ensures Excel recognizes UTF-8 immediately
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', exportFileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copies the table as tab-separated values (TSV) directly to the system clipboard
 */
export async function copyToClipboardAsTSV(items: ExtractedProductItem[]): Promise<boolean> {
  const headers = [
    'Stok Adı',
    'Miktarı',
    'Birimi',
    'KDV Hariç Fiyat (TL)',
    'KDV Oranı (%)',
    'KDV Hariç Tutar (TL)',
    'KDV Tutarı (TL)',
    'Toplam Tutar (TL)'
  ];

  const rows = items.map(item => [
    item.stokAdi,
    formatNumber(item.miktar),
    item.birim,
    formatNumber(item.kdvHaricFiyat),
    item.kdvOrani,
    formatNumber(item.kdvHaricTutar),
    formatNumber(item.kdvTutari),
    formatNumber(item.toplamTutar)
  ]);

  const text = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Pano kopyalama hatası:', err);
    return false;
  }
}
