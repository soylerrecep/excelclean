import { ExtractedProductItem } from '../types/excel';

export interface KdvRule {
  id: string;
  keyword: string; // e.g. "ayakkabı", "baret", "çimento"
  targetKdv: number; // e.g. 20, 10, 1, 0
}

export interface KdvItemCheck {
  item: ExtractedProductItem;
  matchedRule: KdvRule;
  currentRate: number;
  targetRate: number;
  isMismatch: boolean;
}

export interface KdvRulesReport {
  totalChecked: number;
  mismatchCount: number;
  mismatches: KdvItemCheck[];
}

const STORAGE_KEY = 'erp_parser_custom_kdv_rules_v1';

export const DEFAULT_KDV_RULES: KdvRule[] = [
  { id: 'rule-ayakkabi', keyword: 'ayakkabı', targetKdv: 20 },
  { id: 'rule-baret', keyword: 'baret', targetKdv: 20 }
];

/**
 * Loads custom KDV rules from localStorage or returns sensible defaults
 */
export function loadKdvRules(): KdvRule[] {
  if (typeof window === 'undefined') return DEFAULT_KDV_RULES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_KDV_RULES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_KDV_RULES;
  } catch (e) {
    console.error('KDV kuralları yüklenirken hata:', e);
    return DEFAULT_KDV_RULES;
  }
}

/**
 * Saves custom KDV rules to localStorage
 */
export function saveKdvRules(rules: KdvRule[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.error('KDV kuralları kaydedilirken hata:', e);
  }
}

/**
 * Checks a single item against all active KDV rules.
 * Returns the first matching rule where KDV rate doesn't match, or undefined if no mismatch.
 */
export function checkItemKdvRule(
  item: ExtractedProductItem,
  rules: KdvRule[]
): KdvItemCheck | null {
  if (item.isAdjustment) return null;
  const nameTr = item.stokAdi.toLocaleLowerCase('tr-TR');

  for (const rule of rules) {
    const kwTr = rule.keyword.trim().toLocaleLowerCase('tr-TR');
    if (kwTr && nameTr.includes(kwTr)) {
      if (item.kdvOrani !== rule.targetKdv) {
        return {
          item,
          matchedRule: rule,
          currentRate: item.kdvOrani,
          targetRate: rule.targetKdv,
          isMismatch: true
        };
      }
    }
  }

  return null;
}

/**
 * Audits all items against the current set of KDV rules
 */
export function auditItemsWithKdvRules(
  items: ExtractedProductItem[],
  rules: KdvRule[]
): KdvRulesReport {
  const mismatches: KdvItemCheck[] = [];

  for (const item of items) {
    const check = checkItemKdvRule(item, rules);
    if (check && check.isMismatch) {
      mismatches.push(check);
    }
  }

  return {
    totalChecked: items.filter(it => !it.isAdjustment).length,
    mismatchCount: mismatches.length,
    mismatches
  };
}
