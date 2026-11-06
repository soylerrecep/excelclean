import { ExtractedProductItem } from '../types/excel';

/**
 * Recalculates financial totals for a product item
 */
export function recalculateItem(
  item: ExtractedProductItem,
  updates?: Partial<ExtractedProductItem>
): ExtractedProductItem {
  const merged = { ...item, ...updates };

  const miktar = Math.max(0, Number(merged.miktar) || 0);
  const kdvHaricFiyat = Math.max(0, Number(merged.kdvHaricFiyat) || 0);
  const kdvOrani = Math.max(0, Number(merged.kdvOrani) || 0);

  // KDV Haric Tutar = Miktar * Birim Fiyat (2 decimal precision)
  const kdvHaricTutar = Math.round(miktar * kdvHaricFiyat * 100) / 100;
  // KDV Tutari = KDV Haric Tutar * (KDV Orani / 100)
  const kdvTutari = Math.round(kdvHaricTutar * (kdvOrani / 100) * 100) / 100;
  // Toplam Tutar = KDV Haric + KDV
  const toplamTutar = Math.round((kdvHaricTutar + kdvTutari) * 100) / 100;

  return {
    ...merged,
    miktar,
    kdvHaricFiyat,
    kdvOrani,
    kdvHaricTutar,
    kdvTutari,
    toplamTutar
  };
}

export interface MergeGroupPreview {
  key: string;
  stokAdi: string;
  birim: string;
  kdvOrani: number;
  count: number;
  isDuplicate: boolean; // count > 1
  sourceItems: ExtractedProductItem[];
  combinedItem: ExtractedProductItem;
}

/**
 * Generates preview groups with source items and combined results
 */
export function getMergePreviewGroups(items: ExtractedProductItem[]): MergeGroupPreview[] {
  const groupMap = new Map<string, {
    stokAdi: string;
    birim: string;
    kdvOrani: number;
    sourceItems: ExtractedProductItem[];
  }>();

  for (const item of items) {
    const key = `${item.stokAdi.trim().toLowerCase()}_${item.birim.trim().toUpperCase()}`;
    const existing = groupMap.get(key);

    if (existing) {
      existing.sourceItems.push(item);
    } else {
      groupMap.set(key, {
        stokAdi: item.stokAdi,
        birim: item.birim,
        kdvOrani: item.kdvOrani,
        sourceItems: [item]
      });
    }
  }

  const result: MergeGroupPreview[] = [];
  let index = 1;

  for (const [key, val] of groupMap.entries()) {
    const totalMiktar = val.sourceItems.reduce((sum, it) => sum + it.miktar, 0);
    const totalKdvHaric = val.sourceItems.reduce((sum, it) => sum + it.kdvHaricTutar, 0);
    const totalKdv = val.sourceItems.reduce((sum, it) => sum + it.kdvTutari, 0);
    const totalToplam = val.sourceItems.reduce((sum, it) => sum + it.toplamTutar, 0);

    const avgFiyat =
      totalMiktar > 0
        ? Math.round((totalKdvHaric / totalMiktar) * 100) / 100
        : 0;

    const siparisler = new Set<string>();
    val.sourceItems.forEach(it => {
      if (it.siparisNo) siparisler.add(it.siparisNo);
    });

    const siparisStr =
      siparisler.size > 0
        ? Array.from(siparisler).slice(0, 3).join(', ') + (siparisler.size > 3 ? '...' : '')
        : undefined;

    const combinedItem: ExtractedProductItem = {
      id: `grouped-${index}`,
      stokAdi: val.stokAdi,
      miktar: Math.round(totalMiktar * 100) / 100,
      birim: val.birim,
      kdvHaricFiyat: avgFiyat,
      kdvOrani: val.kdvOrani,
      kdvHaricTutar: Math.round(totalKdvHaric * 100) / 100,
      kdvTutari: Math.round(totalKdv * 100) / 100,
      toplamTutar: Math.round(totalToplam * 100) / 100,
      combinedCount: val.sourceItems.length,
      siparisNo: siparisStr,
      rawRowNumber: index
    };

    result.push({
      key,
      stokAdi: val.stokAdi,
      birim: val.birim,
      kdvOrani: val.kdvOrani,
      count: val.sourceItems.length,
      isDuplicate: val.sourceItems.length > 1,
      sourceItems: val.sourceItems,
      combinedItem
    });

    index++;
  }

  // Sort so duplicate products (count > 1) appear first!
  result.sort((a, b) => {
    if (a.isDuplicate && !b.isDuplicate) return -1;
    if (!a.isDuplicate && b.isDuplicate) return 1;
    return b.count - a.count;
  });

  return result;
}

/**
 * Groups items by Stok Adı and Birim
 */
export function groupProductsByName(items: ExtractedProductItem[]): ExtractedProductItem[] {
  return getMergePreviewGroups(items).map(g => g.combinedItem);
}

/**
 * Balances rounding difference by distributing it equally across ALL products' prices
 * so that the sum of all products matches the Excel Dip Total exactly to the penny.
 */
export function balanceDifferenceAcrossAllItems(
  items: ExtractedProductItem[],
  targetTotal: number,
  targetMode: 'kdvDahil' | 'kdvHaric'
): ExtractedProductItem[] {
  if (items.length === 0) return items;

  // Filter out any artificial adjustment row
  const cleanItems = items.filter(it => !it.isAdjustment);
  if (cleanItems.length === 0) return items;

  const currentTotal =
    targetMode === 'kdvDahil'
      ? cleanItems.reduce((acc, it) => acc + it.toplamTutar, 0)
      : cleanItems.reduce((acc, it) => acc + it.kdvHaricTutar, 0);

  const diff = Math.round((targetTotal - currentTotal) * 100) / 100;
  if (Math.abs(diff) < 0.005) {
    return cleanItems;
  }

  // Total difference in kuruş (integer cents)
  const totalCents = Math.round(diff * 100);
  const N = cleanItems.length;

  const baseCents = Math.trunc(totalCents / N);
  const remainderCents = totalCents - (baseCents * N);

  // Distribute remainder cents to items (positive or negative)
  const centsPerItem = new Array(N).fill(baseCents);
  const absRemainder = Math.abs(remainderCents);
  const sign = Math.sign(remainderCents);

  for (let i = 0; i < absRemainder; i++) {
    centsPerItem[i] += sign;
  }

  const updatedItems = cleanItems.map((item, idx) => {
    const deltaTutar = centsPerItem[idx] / 100;
    if (deltaTutar === 0) return item;

    let updatedHaricTutar = item.kdvHaricTutar;
    let updatedKdvTutari = item.kdvTutari;
    let updatedToplamTutar = item.toplamTutar;

    if (targetMode === 'kdvDahil') {
      updatedToplamTutar = Math.round((item.toplamTutar + deltaTutar) * 100) / 100;
      const rateMultiplier = 1 + (item.kdvOrani || 0) / 100;
      updatedHaricTutar = Math.round((updatedToplamTutar / rateMultiplier) * 100) / 100;
      updatedKdvTutari = Math.round((updatedToplamTutar - updatedHaricTutar) * 100) / 100;
    } else {
      updatedHaricTutar = Math.round((item.kdvHaricTutar + deltaTutar) * 100) / 100;
      updatedKdvTutari = Math.round(updatedHaricTutar * (item.kdvOrani / 100) * 100) / 100;
      updatedToplamTutar = Math.round((updatedHaricTutar + updatedKdvTutari) * 100) / 100;
    }

    const updatedBirimFiyat =
      item.miktar > 0
        ? Math.round((updatedHaricTutar / item.miktar) * 100) / 100
        : item.kdvHaricFiyat;

    return {
      ...item,
      kdvHaricFiyat: updatedBirimFiyat,
      kdvHaricTutar: updatedHaricTutar,
      kdvTutari: updatedKdvTutari,
      toplamTutar: updatedToplamTutar
    };
  });

  // Final validation to guarantee 100% exact match down to the penny
  const finalSum =
    targetMode === 'kdvDahil'
      ? updatedItems.reduce((acc, it) => acc + it.toplamTutar, 0)
      : updatedItems.reduce((acc, it) => acc + it.kdvHaricTutar, 0);

  const finalDiff = Math.round((targetTotal - finalSum) * 100) / 100;

  if (Math.abs(finalDiff) > 0.005) {
    const lastIdx = updatedItems.length - 1;
    const lastItem = updatedItems[lastIdx];
    let adjToplam = Math.round((lastItem.toplamTutar + finalDiff) * 100) / 100;
    let adjHaric = Math.round((adjToplam / (1 + (lastItem.kdvOrani || 0) / 100)) * 100) / 100;
    let adjKdv = Math.round((adjToplam - adjHaric) * 100) / 100;
    let adjBirimFiyat =
      lastItem.miktar > 0
        ? Math.round((adjHaric / lastItem.miktar) * 100) / 100
        : lastItem.kdvHaricFiyat;

    updatedItems[lastIdx] = {
      ...lastItem,
      kdvHaricFiyat: adjBirimFiyat,
      kdvHaricTutar: adjHaric,
      kdvTutari: adjKdv,
      toplamTutar: adjToplam
    };
  }

  return updatedItems;
}

/**
 * Balances rounding difference by adding a "Kuruş Dengeleme Satırı"
 */
export function balanceDifferenceWithAdjustment(
  items: ExtractedProductItem[],
  targetTotal: number,
  targetMode: 'kdvDahil' | 'kdvHaric'
): ExtractedProductItem[] {
  // Remove any previous adjustment rows first
  const cleanItems = items.filter(it => !it.isAdjustment);

  const currentTotal =
    targetMode === 'kdvDahil'
      ? cleanItems.reduce((acc, it) => acc + it.toplamTutar, 0)
      : cleanItems.reduce((acc, it) => acc + it.kdvHaricTutar, 0);

  const diff = Math.round((targetTotal - currentTotal) * 100) / 100;

  if (Math.abs(diff) < 0.005) {
    return cleanItems; // Already balanced
  }

  const adjustmentRow: ExtractedProductItem = {
    id: `adjustment-${Date.now()}`,
    stokAdi: 'KURUŞ YUVARLAMA / MUTABAKAT DENGELEME FARKI',
    miktar: 1,
    birim: 'ADET',
    kdvHaricFiyat: diff,
    kdvOrani: 0,
    kdvHaricTutar: diff,
    kdvTutari: 0,
    toplamTutar: diff,
    isAdjustment: true,
    rawRowNumber: cleanItems.length + 1
  };

  return [...cleanItems, adjustmentRow];
}

/**
 * Balances rounding difference by adjusting the last non-adjustment item
 * so that the sum of all items matches the Excel Dip Total exactly to the penny.
 */
export function balanceDifferenceOnLastItem(
  items: ExtractedProductItem[],
  targetTotal: number,
  targetMode: 'kdvDahil' | 'kdvHaric'
): ExtractedProductItem[] {
  if (items.length === 0) return items;

  const currentTotal =
    targetMode === 'kdvDahil'
      ? items.reduce((acc, it) => acc + it.toplamTutar, 0)
      : items.reduce((acc, it) => acc + it.kdvHaricTutar, 0);

  const diff = Math.round((targetTotal - currentTotal) * 100) / 100;

  if (Math.abs(diff) < 0.005) {
    return items;
  }

  // Find last non-adjustment item
  let lastIndex = -1;
  for (let i = items.length - 1; i >= 0; i--) {
    if (!items[i].isAdjustment) {
      lastIndex = i;
      break;
    }
  }

  if (lastIndex === -1) lastIndex = items.length - 1;
  const targetItem = items[lastIndex];

  let updatedHaricTutar = targetItem.kdvHaricTutar;
  let updatedKdvTutari = targetItem.kdvTutari;
  let updatedToplamTutar = targetItem.toplamTutar;

  if (targetMode === 'kdvDahil') {
    // We want targetItem.toplamTutar to change by exact diff
    updatedToplamTutar = Math.round((targetItem.toplamTutar + diff) * 100) / 100;
    const rateMultiplier = 1 + (targetItem.kdvOrani || 0) / 100;
    updatedHaricTutar = Math.round((updatedToplamTutar / rateMultiplier) * 100) / 100;
    updatedKdvTutari = Math.round((updatedToplamTutar - updatedHaricTutar) * 100) / 100;
  } else {
    // We want targetItem.kdvHaricTutar to change by exact diff
    updatedHaricTutar = Math.round((targetItem.kdvHaricTutar + diff) * 100) / 100;
    updatedKdvTutari = Math.round(updatedHaricTutar * (targetItem.kdvOrani / 100) * 100) / 100;
    updatedToplamTutar = Math.round((updatedHaricTutar + updatedKdvTutari) * 100) / 100;
  }

  const updatedBirimFiyat =
    targetItem.miktar > 0
      ? Math.round((updatedHaricTutar / targetItem.miktar) * 100) / 100
      : targetItem.kdvHaricFiyat;

  const updatedItem: ExtractedProductItem = {
    ...targetItem,
    kdvHaricFiyat: updatedBirimFiyat,
    kdvHaricTutar: updatedHaricTutar,
    kdvTutari: updatedKdvTutari,
    toplamTutar: updatedToplamTutar
  };

  const newItems = [...items];
  newItems[lastIndex] = updatedItem;
  return newItems;
}
