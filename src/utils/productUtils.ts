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
  const kdvHaricFiyat = Math.max(0, Math.round((Number(merged.kdvHaricFiyat) || 0) * 10000) / 10000);
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
        ? Math.round((totalKdvHaric / totalMiktar) * 10000) / 10000
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

export type BalanceStrategy = 'balanced' | 'quantityFirst' | 'priceEqual';

const CONTINUOUS_UNITS = new Set([
  'KG', 'KĞ', 'KİLO', 'KILO', 'KİLOGRAM', 'KILOGRAM', 'GR', 'GRAM', 'MG', 'TON', 'TN',
  'MT', 'M', 'METRE', 'METRETÜL', 'METRETUL', 'MTUL', 'M/T',
  'M2', 'M²', 'METREKARE', 'M3', 'M³', 'METREKÜP', 'METREKUP', 'CM', 'MM', 'KM',
  'LT', 'L', 'LİTRE', 'LITRE', 'ML', 'CC'
]);

function isContinuousQuantity(item: ExtractedProductItem): boolean {
  if (Math.abs(item.miktar - Math.round(item.miktar)) > 0.0001) {
    return true;
  }
  const unitClean = item.birim.trim().toUpperCase().replace(/\.+$/, '');
  return CONTINUOUS_UNITS.has(unitClean);
}

/**
 * Computes proportional target line totals in integer kuruş using Largest Remainder Method
 * so the sum of item targets matches targetCents exactly without distorting small items.
 */
function allocateProportionalCents(weights: number[], targetCents: number): number[] {
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  if (sumWeights <= 0) {
    const N = weights.length;
    const base = Math.trunc(targetCents / N);
    const rem = targetCents - base * N;
    return weights.map((_, i) => base + (i < Math.abs(rem) ? Math.sign(rem) : 0));
  }

  const exactShares = weights.map(w => (w / sumWeights) * targetCents);
  const floors = exactShares.map(s => Math.trunc(s));
  let remainder = targetCents - floors.reduce((a, b) => a + b, 0);

  const indexedRemainders = exactShares
    .map((s, idx) => ({ idx, frac: s - floors[idx] }))
    .sort((a, b) => (remainder >= 0 ? b.frac - a.frac : a.frac - b.frac));

  const step = remainder >= 0 ? 1 : -1;
  let k = 0;
  while (remainder !== 0 && k < indexedRemainders.length) {
    floors[indexedRemainders[k].idx] += step;
    remainder -= step;
    k++;
  }

  return floors;
}

/**
 * Balances difference against Excel Dip Total using the selected strategy:
 * - 'balanced' (default): Stably adjusts both quantities and 4-decimal unit prices proportionally
 * - 'quantityFirst': Adjusts product quantities proportionally while keeping unit prices fixed
 * - 'priceEqual': Keeps quantities fixed and distributes difference equally across unit prices
 */
export function balanceDifferenceAcrossAllItems(
  items: ExtractedProductItem[],
  targetTotal: number,
  targetMode: 'kdvDahil' | 'kdvHaric',
  strategy: BalanceStrategy = 'balanced'
): ExtractedProductItem[] {
  if (items.length === 0) return items;

  const cleanItems = items.filter(it => !it.isAdjustment);
  if (cleanItems.length === 0) return items;

  const getLineValue = (it: ExtractedProductItem) =>
    targetMode === 'kdvDahil' ? it.toplamTutar : it.kdvHaricTutar;

  const currentTotal = Math.round(cleanItems.reduce((acc, it) => acc + getLineValue(it), 0) * 100) / 100;
  const diff = Math.round((targetTotal - currentTotal) * 100) / 100;

  if (Math.abs(diff) < 0.005) {
    return cleanItems;
  }

  const targetCents = Math.round(targetTotal * 100);
  const totalDiffCents = Math.round(diff * 100);
  const N = cleanItems.length;

  let updatedItems: ExtractedProductItem[];

  if (strategy === 'priceEqual' || currentTotal <= 0) {
    // Equal kuruş per item, keeping quantities fixed
    const baseCents = Math.trunc(totalDiffCents / N);
    const remainderCents = totalDiffCents - baseCents * N;
    const centsPerItem = new Array(N).fill(baseCents);
    const absRemainder = Math.abs(remainderCents);
    const sign = Math.sign(remainderCents);
    for (let i = 0; i < absRemainder; i++) {
      centsPerItem[i] += sign;
    }

    updatedItems = cleanItems.map((item, idx) => {
      const deltaTutar = centsPerItem[idx] / 100;
      if (deltaTutar === 0) return item;

      const rateMultiplier = 1 + (item.kdvOrani || 0) / 100;
      const targetHaric =
        targetMode === 'kdvDahil'
          ? (item.toplamTutar + deltaTutar) / rateMultiplier
          : item.kdvHaricTutar + deltaTutar;

      const newFiyat =
        item.miktar > 0
          ? Math.max(0.0001, Math.round((targetHaric / item.miktar) * 10000) / 10000)
          : item.kdvHaricFiyat;

      return recalculateItem(item, { kdvHaricFiyat: newFiyat });
    });
  } else if (strategy === 'quantityFirst') {
    // Proportional target per item, adjusting quantity while keeping unit price fixed
    const weights = cleanItems.map(it => Math.max(0, getLineValue(it)));
    const targetLineCents = allocateProportionalCents(weights, targetCents);

    updatedItems = cleanItems.map((item, idx) => {
      const oldLineVal = getLineValue(item);
      const targetLineVal = targetLineCents[idx] / 100;
      if (Math.abs(targetLineVal - oldLineVal) < 0.005 || item.kdvHaricFiyat <= 0) {
        return item;
      }

      const rateMultiplier = 1 + (item.kdvOrani || 0) / 100;
      const targetHaric = targetMode === 'kdvDahil' ? targetLineVal / rateMultiplier : targetLineVal;

      const newMiktar = Math.max(
        0.01,
        Math.round((targetHaric / item.kdvHaricFiyat) * 100) / 100
      );

      return recalculateItem(item, { miktar: newMiktar });
    });
  } else {
    // 'balanced': Stable proportional adjustment across both quantities and 4-decimal unit prices
    const weights = cleanItems.map(it => Math.max(0, getLineValue(it)));
    const targetLineCents = allocateProportionalCents(weights, targetCents);
    const overallScale = currentTotal > 0 ? targetTotal / currentTotal : 1;
    const isMeaningfulDiff = Math.abs(diff) >= 0.5 && Math.abs(overallScale - 1) >= 0.0015;

    updatedItems = cleanItems.map((item, idx) => {
      const oldLineVal = getLineValue(item);
      const targetLineVal = targetLineCents[idx] / 100;
      if (Math.abs(targetLineVal - oldLineVal) < 0.005 || item.miktar <= 0) {
        return item;
      }

      const rateMultiplier = 1 + (item.kdvOrani || 0) / 100;
      const targetHaric = targetMode === 'kdvDahil' ? targetLineVal / rateMultiplier : targetLineVal;
      const lineScale = oldLineVal > 0 ? targetLineVal / oldLineVal : 1;

      let newMiktar = item.miktar;
      if (isMeaningfulDiff && lineScale > 0) {
        const qtyScale = Math.sqrt(lineScale);
        if (isContinuousQuantity(item)) {
          newMiktar = Math.max(0.01, Math.round(item.miktar * qtyScale * 100) / 100);
        } else {
          // For discrete integer units (ADET, TORBA, etc.), prefer clean integer step if it moves by >= 1
          const roundedInt = Math.round(item.miktar * qtyScale);
          if (roundedInt >= 1 && roundedInt !== item.miktar) {
            newMiktar = roundedInt;
          } else if (Math.abs(lineScale - 1) > 0.08 && item.miktar >= 2) {
            newMiktar = Math.max(0.01, Math.round(item.miktar * qtyScale * 100) / 100);
          }
        }
      }

      const newFiyat = Math.max(
        0.0001,
        Math.round((targetHaric / newMiktar) * 10000) / 10000
      );

      return recalculateItem(item, {
        miktar: newMiktar,
        kdvHaricFiyat: newFiyat
      });
    });
  }

  // Penny-exact solver: try fine 0.0001 price nudges (or 0.01 qty nudges in quantityFirst)
  // on largest items first so every row stays consistent with recalculateItem AND sum matches 0.00 difference.
  const computeSum = (arr: ExtractedProductItem[]) =>
    Math.round(arr.reduce((acc, it) => acc + getLineValue(it), 0) * 100) / 100;

  let remCents = Math.round((targetTotal - computeSum(updatedItems)) * 100);

  if (remCents !== 0) {
    const indicesBySize = updatedItems
      .map((it, idx) => ({ idx, val: getLineValue(it) }))
      .sort((a, b) => b.val - a.val)
      .map(x => x.idx);

    let guard = 0;
    while (remCents !== 0 && guard < 120) {
      guard++;
      let progressed = false;
      const wantSign = Math.sign(remCents);

      for (const idx of indicesBySize) {
        if (remCents === 0) break;
        const it = updatedItems[idx];
        if (it.miktar <= 0) continue;

        const oldValCents = Math.round(getLineValue(it) * 100);
        let bestCandidate: ExtractedProductItem | null = null;
        let bestDeltaCents = 0;

        // Try small unit price adjustments (0.0001 steps, and larger when miktar is small)
        const priceSteps =
          it.miktar >= 10
            ? [0.0001, 0.0002, 0.0005, 0.001, 0.002]
            : it.miktar >= 2
              ? [0.0005, 0.001, 0.002, 0.005, 0.01]
              : [0.005, 0.01, 0.02, 0.03];

        for (const pStep of priceSteps) {
          const candFiyat = Math.max(
            0.0001,
            Math.round((it.kdvHaricFiyat + wantSign * pStep) * 10000) / 10000
          );
          const cand = recalculateItem(it, { kdvHaricFiyat: candFiyat });
          const newValCents = Math.round(getLineValue(cand) * 100);
          const deltaCents = newValCents - oldValCents;

          if (
            deltaCents !== 0 &&
            Math.sign(deltaCents) === wantSign &&
            Math.abs(deltaCents) <= Math.abs(remCents)
          ) {
            if (!bestCandidate || Math.abs(deltaCents) < Math.abs(bestDeltaCents) || deltaCents === remCents) {
              bestCandidate = cand;
              bestDeltaCents = deltaCents;
              if (Math.abs(bestDeltaCents) === 1 || bestDeltaCents === remCents) break;
            }
          }
        }

        if (bestCandidate) {
          updatedItems[idx] = bestCandidate;
          remCents -= bestDeltaCents;
          progressed = true;
        }
      }

      if (!progressed) break;
    }
  }

  // Final hard guarantee: if any odd rounding cent remains (e.g. due to 20% KDV 1.2x integer step parity),
  // absorb the remaining cents on the largest item so Dip Toplam matches 100% to the penny.
  const finalSum = computeSum(updatedItems);
  const finalDiff = Math.round((targetTotal - finalSum) * 100) / 100;

  if (Math.abs(finalDiff) >= 0.005) {
    let targetIdx = updatedItems.length - 1;
    let maxVal = -1;
    updatedItems.forEach((it, idx) => {
      const v = getLineValue(it);
      if (v > maxVal) {
        maxVal = v;
        targetIdx = idx;
      }
    });

    const targetItem = updatedItems[targetIdx];
    const rateMultiplier = 1 + (targetItem.kdvOrani || 0) / 100;

    let adjToplam = targetItem.toplamTutar;
    let adjHaric = targetItem.kdvHaricTutar;
    let adjKdv = targetItem.kdvTutari;

    if (targetMode === 'kdvDahil') {
      adjToplam = Math.round((targetItem.toplamTutar + finalDiff) * 100) / 100;
      adjHaric = Math.round((adjToplam / rateMultiplier) * 100) / 100;
      adjKdv = Math.round((adjToplam - adjHaric) * 100) / 100;
    } else {
      adjHaric = Math.round((targetItem.kdvHaricTutar + finalDiff) * 100) / 100;
      adjKdv = Math.round(adjHaric * ((targetItem.kdvOrani || 0) / 100) * 100) / 100;
      adjToplam = Math.round((adjHaric + adjKdv) * 100) / 100;
    }

    const adjBirimFiyat =
      targetItem.miktar > 0
        ? Math.round((adjHaric / targetItem.miktar) * 10000) / 10000
        : targetItem.kdvHaricFiyat;

    updatedItems[targetIdx] = {
      ...targetItem,
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
      ? Math.round((updatedHaricTutar / targetItem.miktar) * 10000) / 10000
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
