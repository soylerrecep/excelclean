import { ExtractedProductItem } from '../types/excel';

export interface TevkifatRule {
  id: string;
  keyword: string; // e.g. "hafriyat", "temizlik", "bakım", "mühendislik", "yapım", "inşaat"
  tevkifatOrani: string; // e.g. "9/10", "5/10", "7/10"
   aciklama: string;
}

export interface TevkifatItemCheck {
  item: ExtractedProductItem;
  rule: TevkifatRule;
  tevkifatTutar: number;
  netKdv: number;
}

const STORAGE_KEY = 'erp_parser_tevkifat_rules_v1';

/**
 * Standard Turkish VAT Withholding (KDV Tevkifatı) rules according to KDVK Seri Seri Tebliğleri
 * (Yapım işleri, mühendislik-mimarlık, çevre ve temizlik, makine bakım onarım, hafriyat vb.)
 */
export const DEFAULT_TEVKIFAT_RULES: TevkifatRule[] = [
  {
    id: 'tev-1',
    keyword: 'hafriyat',
    tevkifatOrani: '5/10',
    aciklama: 'Hafriyat işleri (5/10 KDV Tevkifatı)'
  },
  {
    id: 'tev-2',
    keyword: 'temizlik',
    tevkifatOrani: '7/10',
    aciklama: 'Çevre ve bahçe bakım / temizlik hizmetleri (7/10 KDV Tevkifatı)'
  },
  {
    id: 'tev-3',
    keyword: 'mühendislik',
    tevkifatOrani: '9/10',
    aciklama: 'Mimarlık, mühendislik ve danışmanlık hizmetleri (9/10 KDV Tevkifatı)'
  },
  {
    id: 'tev-4',
    keyword: 'bakım',
    tevkifatOrani: '5/10',
    aciklama: 'Makine, teçhizat ve demirbaş bakım onarımı (5/10 KDV Tevkifatı)'
  },
  {
    id: 'tev-5',
    keyword: 'yapım',
    tevkifatOrani: '4/10',
    aciklama: 'Yapım işleri ile bu işlere ilişkin mühendislik-mimarlık (4/10 KDV Tevkifatı)'
  }
];

export function loadTevkifatRules(): TevkifatRule[] {
  if (typeof window === 'undefined') return DEFAULT_TEVKIFAT_RULES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TEVKIFAT_RULES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_TEVKIFAT_RULES;
  } catch (e) {
    console.error('Tevkifat kuralları yüklenirken hata:', e);
    return DEFAULT_TEVKIFAT_RULES;
  }
}

export function saveTevkifatRules(rules: TevkifatRule[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.error('Tevkifat kuralları kaydedilirken hata:', e);
  }
}

/**
 * Checks if an item matches any Tevkifat rule based on its stock name
 */
export function checkItemTevkifat(
  item: ExtractedProductItem,
  rules: TevkifatRule[]
): TevkifatItemCheck | null {
  if (item.isAdjustment) return null;
  const nameTr = item.stokAdi.toLocaleLowerCase('tr-TR');

  for (const rule of rules) {
    const kw = rule.keyword.trim().toLocaleLowerCase('tr-TR');
    if (kw && nameTr.includes(kw)) {
      // Parse numerator / denominator e.g. "9/10" -> numerator = 9, denominator = 10
      const parts = rule.tevkifatOrani.split('/');
      const num = parseFloat(parts[0]) || 0;
      const den = parseFloat(parts[1]) || 10;
      const factor = num / den;

      const tevkifatTutar = Math.round(item.kdvTutari * factor * 100) / 100;
      const netKdv = Math.round((item.kdvTutari - tevkifatTutar) * 100) / 100;

      return {
        item,
        rule,
        tevkifatTutar,
        netKdv
      };
    }
  }

  return null;
}

export interface TevkifatReport {
  totalChecked: number;
  tevkifatCount: number;
  totalTevkifatTL: number;
  matches: TevkifatItemCheck[];
}

export function auditItemsTevkifat(
  items: ExtractedProductItem[],
  rules: TevkifatRule[]
): TevkifatReport {
  const matches: TevkifatItemCheck[] = [];
  let totalTevkifatTL = 0;

  for (const item of items) {
    const check = checkItemTevkifat(item, rules);
    if (check) {
      matches.push(check);
      totalTevkifatTL += check.tevkifatTutar;
    }
  }

  return {
    totalChecked: items.filter(it => !it.isAdjustment).length,
    tevkifatCount: matches.length,
    totalTevkifatTL: Math.round(totalTevkifatTL * 100) / 100,
    matches
  };
}
