export type SettlementType = 'city' | 'town' | 'kibbutz' | 'moshav' | 'community'

export type TaxBenefitZone =
  | 'none'
  | 'periphery_a'
  | 'periphery_b'
  | 'frontline'
  | 'eilat'
  | 'golan'
  | 'jordan_valley'
  | 'negev_a'
  | 'negev_b'
  | 'galilee_a'
  | 'galilee_b'

export interface Settlement {
  name: string
  nameEn?: string
  type: SettlementType
  zone: TaxBenefitZone
  creditPoints: number
  taxDiscountPct: number
  maxDiscountAnnual: number
  notes?: string
}

// Comprehensive Israeli settlement registry with tax benefit zones
// Source: Israeli Tax Authority (רשות המיסים) — updated for 2026
const SETTLEMENTS: Settlement[] = [
  // === עוטף עזה / קו עימות — Frontline ===
  { name: 'שדרות', nameEn: 'Sderot', type: 'city', zone: 'frontline', creditPoints: 3.0, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'כיסופים', nameEn: 'Kissufim', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'נירים', nameEn: 'Nirim', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'נחל עוז', nameEn: 'Nahal Oz', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'בארי', nameEn: 'Beeri', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'רעים', nameEn: 'Reim', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'כפר עזה', nameEn: 'Kfar Aza', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'יד מרדכי', nameEn: 'Yad Mordechai', type: 'moshav', zone: 'frontline', creditPoints: 3.0, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'עין השלושה', nameEn: 'Ein HaShlosha', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'ניר עוז', nameEn: 'Nir Oz', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'סופה', nameEn: 'Sufa', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'כרם אבו סאלם', nameEn: 'Kerem Abu Salem', type: 'moshav', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'חולית', nameEn: 'Holit', type: 'community', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'זיקים', nameEn: 'Zikim', type: 'kibbutz', zone: 'frontline', creditPoints: 3.0, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'ארז', nameEn: 'Erez', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'נתיב העשרה', nameEn: 'Netiv HaAsara', type: 'moshav', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'עמיעוז', nameEn: 'Amioz', type: 'moshav', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'תקומה', nameEn: 'Tkuma', type: 'community', zone: 'frontline', creditPoints: 3.0, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },

  // === קו עימות צפון — Northern Frontline ===
  { name: 'קריית שמונה', nameEn: 'Kiryat Shmona', type: 'city', zone: 'frontline', creditPoints: 3.0, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'מטולה', nameEn: 'Metula', type: 'town', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'שלומי', nameEn: 'Shlomi', type: 'town', zone: 'frontline', creditPoints: 3.0, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'דן', nameEn: 'Dan', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'דפנה', nameEn: 'Dafna', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'מנרה', nameEn: 'Manara', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'מרגליות', nameEn: 'Margaliot', type: 'moshav', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'אביבים', nameEn: 'Avivim', type: 'moshav', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'יפתח', nameEn: 'Yiftach', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'מלכיה', nameEn: 'Malkia', type: 'moshav', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'הגושרים', nameEn: 'HaGoshrim', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'שניר', nameEn: 'Snir', type: 'kibbutz', zone: 'frontline', creditPoints: 3.5, taxDiscountPct: 20, maxDiscountAnnual: 52_440 },
  { name: 'נהריה', nameEn: 'Nahariya', type: 'city', zone: 'frontline', creditPoints: 2.0, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },
  { name: 'עכו', nameEn: 'Akko', type: 'city', zone: 'galilee_b', creditPoints: 1.0, taxDiscountPct: 7, maxDiscountAnnual: 18_480 },

  // === נגב א — Negev A (higher benefits) ===
  { name: 'נתיבות', nameEn: 'Netivot', type: 'city', zone: 'negev_a', creditPoints: 2.5, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },
  { name: 'אופקים', nameEn: 'Ofakim', type: 'city', zone: 'negev_a', creditPoints: 2.5, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },
  { name: 'ערד', nameEn: 'Arad', type: 'city', zone: 'negev_a', creditPoints: 2.0, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },
  { name: 'דימונה', nameEn: 'Dimona', type: 'city', zone: 'negev_a', creditPoints: 2.0, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },
  { name: 'ירוחם', nameEn: 'Yeruham', type: 'city', zone: 'negev_a', creditPoints: 2.5, taxDiscountPct: 15, maxDiscountAnnual: 39_000 },
  { name: 'מצפה רמון', nameEn: 'Mitzpe Ramon', type: 'city', zone: 'negev_a', creditPoints: 2.5, taxDiscountPct: 15, maxDiscountAnnual: 39_000 },
  { name: 'רהט', nameEn: 'Rahat', type: 'city', zone: 'negev_a', creditPoints: 2.0, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },
  { name: 'כסיפה', nameEn: 'Kseifa', type: 'town', zone: 'negev_a', creditPoints: 2.0, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },
  { name: 'ערערה בנגב', nameEn: 'Arara BaNegev', type: 'town', zone: 'negev_a', creditPoints: 2.0, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },
  { name: 'שגב שלום', nameEn: 'Segev Shalom', type: 'town', zone: 'negev_a', creditPoints: 2.0, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },
  { name: 'חורה', nameEn: 'Hura', type: 'town', zone: 'negev_a', creditPoints: 2.0, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },
  { name: 'תל ערד', nameEn: 'Tel Arad', type: 'community', zone: 'negev_a', creditPoints: 2.0, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },

  // === נגב ב — Negev B ===
  { name: 'באר שבע', nameEn: 'Beer Sheva', type: 'city', zone: 'negev_b', creditPoints: 1.0, taxDiscountPct: 7, maxDiscountAnnual: 18_480 },
  { name: 'אשקלון', nameEn: 'Ashkelon', type: 'city', zone: 'negev_b', creditPoints: 1.0, taxDiscountPct: 7, maxDiscountAnnual: 18_480 },
  { name: 'קריית גת', nameEn: 'Kiryat Gat', type: 'city', zone: 'negev_b', creditPoints: 1.0, taxDiscountPct: 7, maxDiscountAnnual: 18_480 },
  { name: 'אשדוד', nameEn: 'Ashdod', type: 'city', zone: 'negev_b', creditPoints: 0.5, taxDiscountPct: 5, maxDiscountAnnual: 12_360 },

  // === אילת — Eilat (special) ===
  { name: 'אילת', nameEn: 'Eilat', type: 'city', zone: 'eilat', creditPoints: 4.0, taxDiscountPct: 10, maxDiscountAnnual: 262_320, notes: 'פטור 10% מהכנסה עד תקרה' },

  // === גליל א — Galilee A ===
  { name: 'צפת', nameEn: 'Safed', type: 'city', zone: 'galilee_a', creditPoints: 2.0, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },
  { name: 'טבריה', nameEn: 'Tiberias', type: 'city', zone: 'galilee_a', creditPoints: 1.5, taxDiscountPct: 10, maxDiscountAnnual: 26_160 },
  { name: 'חצור הגלילית', nameEn: 'Hazor HaGlilit', type: 'city', zone: 'galilee_a', creditPoints: 2.0, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },
  { name: 'ראש פינה', nameEn: 'Rosh Pina', type: 'town', zone: 'galilee_a', creditPoints: 2.0, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },
  { name: 'מגדל העמק', nameEn: 'Migdal HaEmek', type: 'city', zone: 'galilee_a', creditPoints: 1.5, taxDiscountPct: 10, maxDiscountAnnual: 26_160 },
  { name: 'בית שאן', nameEn: 'Beit Shean', type: 'city', zone: 'galilee_a', creditPoints: 2.0, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },

  // === גליל ב — Galilee B ===
  { name: 'כרמיאל', nameEn: 'Karmiel', type: 'city', zone: 'galilee_b', creditPoints: 1.0, taxDiscountPct: 7, maxDiscountAnnual: 18_480 },
  { name: 'מעלות תרשיחא', nameEn: 'Maalot Tarshiha', type: 'city', zone: 'galilee_b', creditPoints: 1.5, taxDiscountPct: 10, maxDiscountAnnual: 26_160 },
  { name: 'עפולה', nameEn: 'Afula', type: 'city', zone: 'galilee_b', creditPoints: 0.5, taxDiscountPct: 5, maxDiscountAnnual: 12_360 },
  { name: 'נצרת', nameEn: 'Nazareth', type: 'city', zone: 'galilee_b', creditPoints: 0.5, taxDiscountPct: 5, maxDiscountAnnual: 12_360 },
  { name: 'נצרת עילית', nameEn: 'Nof HaGalil', type: 'city', zone: 'galilee_b', creditPoints: 0.5, taxDiscountPct: 5, maxDiscountAnnual: 12_360 },
  { name: 'נוף הגליל', nameEn: 'Nof HaGalil', type: 'city', zone: 'galilee_b', creditPoints: 0.5, taxDiscountPct: 5, maxDiscountAnnual: 12_360 },
  { name: 'יקנעם', nameEn: 'Yokneam', type: 'city', zone: 'galilee_b', creditPoints: 0.5, taxDiscountPct: 5, maxDiscountAnnual: 12_360 },

  // === גולן — Golan Heights ===
  { name: 'קצרין', nameEn: 'Katzrin', type: 'city', zone: 'golan', creditPoints: 2.5, taxDiscountPct: 15, maxDiscountAnnual: 39_000 },
  { name: 'מג\'דל שמס', nameEn: 'Majdal Shams', type: 'town', zone: 'golan', creditPoints: 2.5, taxDiscountPct: 15, maxDiscountAnnual: 39_000 },
  { name: 'בוקעתא', nameEn: 'Buqata', type: 'town', zone: 'golan', creditPoints: 2.5, taxDiscountPct: 15, maxDiscountAnnual: 39_000 },
  { name: 'מסעדה', nameEn: 'Masade', type: 'town', zone: 'golan', creditPoints: 2.5, taxDiscountPct: 15, maxDiscountAnnual: 39_000 },
  { name: 'אל רום', nameEn: 'El Rom', type: 'kibbutz', zone: 'golan', creditPoints: 3.0, taxDiscountPct: 15, maxDiscountAnnual: 39_000 },
  { name: 'מרום גולן', nameEn: 'Merom Golan', type: 'kibbutz', zone: 'golan', creditPoints: 3.0, taxDiscountPct: 15, maxDiscountAnnual: 39_000 },

  // === בקעת הירדן — Jordan Valley ===
  { name: 'בית שאן', nameEn: 'Beit Shean', type: 'city', zone: 'jordan_valley', creditPoints: 2.0, taxDiscountPct: 12, maxDiscountAnnual: 31_320 },
  { name: 'מעלה אדומים', nameEn: 'Maale Adumim', type: 'city', zone: 'jordan_valley', creditPoints: 1.0, taxDiscountPct: 7, maxDiscountAnnual: 18_480 },
  { name: 'אריאל', nameEn: 'Ariel', type: 'city', zone: 'jordan_valley', creditPoints: 1.5, taxDiscountPct: 10, maxDiscountAnnual: 26_160 },

  // === מרכז — Center (no benefits) ===
  { name: 'תל אביב', nameEn: 'Tel Aviv', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'ירושלים', nameEn: 'Jerusalem', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'חיפה', nameEn: 'Haifa', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'רמת גן', nameEn: 'Ramat Gan', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'הרצליה', nameEn: 'Herzliya', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'פתח תקווה', nameEn: 'Petah Tikva', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'ראשון לציון', nameEn: 'Rishon LeZion', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'נתניה', nameEn: 'Netanya', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'חולון', nameEn: 'Holon', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'בני ברק', nameEn: 'Bnei Brak', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'בת ים', nameEn: 'Bat Yam', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'רעננה', nameEn: 'Raanana', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'כפר סבא', nameEn: 'Kfar Saba', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'הוד השרון', nameEn: 'Hod HaSharon', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'גבעתיים', nameEn: 'Givatayim', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'רחובות', nameEn: 'Rehovot', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'לוד', nameEn: 'Lod', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'רמלה', nameEn: 'Ramla', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'מודיעין', nameEn: 'Modiin', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'אור יהודה', nameEn: 'Or Yehuda', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'יבנה', nameEn: 'Yavne', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'נס ציונה', nameEn: 'Nes Ziona', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'קריית אונו', nameEn: 'Kiryat Ono', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'קריית מוצקין', nameEn: 'Kiryat Motzkin', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'קריית ביאליק', nameEn: 'Kiryat Bialik', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'קריית אתא', nameEn: 'Kiryat Ata', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
  { name: 'טירת כרמל', nameEn: 'Tirat Carmel', type: 'city', zone: 'none', creditPoints: 0, taxDiscountPct: 0, maxDiscountAnnual: 0 },
]

/** Search settlements by Hebrew name prefix */
export function searchSettlements(query: string): Settlement[] {
  if (!query || query.length < 2) return []
  const normalized = query.trim()
  return SETTLEMENTS.filter(s =>
    s.name.startsWith(normalized) ||
    s.name.includes(normalized) ||
    (s.nameEn && s.nameEn.toLowerCase().includes(normalized.toLowerCase()))
  ).slice(0, 20)
}

/** Zone display names in Hebrew */
export const ZONE_NAMES: Record<TaxBenefitZone, string> = {
  none: 'מרכז — ללא הטבה',
  periphery_a: 'פריפריה א׳',
  periphery_b: 'פריפריה ב׳',
  frontline: 'קו עימות / עוטף עזה',
  eilat: 'אילת — פטור מיוחד',
  golan: 'רמת הגולן',
  jordan_valley: 'בקעת הירדן',
  negev_a: 'נגב א׳',
  negev_b: 'נגב ב׳',
  galilee_a: 'גליל א׳',
  galilee_b: 'גליל ב׳',
}
