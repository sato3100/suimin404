// ─── カード使用効果の定義 ────────────────────────────────────────────────────
export interface UseEffect {
  selfBonus?: number;
  opponentBonus?: number;
  skipNextDraw?: boolean;
  drawCards?: number;
  extraActions?: number;
  discardSelf?: number;
  discardOpponent?: number;
  gamble?: { win: number; lose: number };
}

export interface CardDef {
  id: string;
  name: string;
  keepValue: number;
  useEffect: UseEffect;
  description: string;
  category: "stable" | "minus" | "chaos";
}

export interface Card extends CardDef {
  uid: string;
}

export const CARD_DEFS: CardDef[] = [
  // ─── 安定系 ────────────────────────────────────────────────────────────────
  {
    id: "clone_thesis",
    name: "卒論複製",
    keepValue: 12,
    useEffect: { selfBonus: 24, skipNextDraw: true },
    description: "cloneした卒論を再度提出し、24単位を得る。次のターンはドローしない。",
    category: "stable",
  },
  {
    id: "dogeza",
    name: "教授に土下座",
    keepValue: 8,
    useEffect: { selfBonus: 16, drawCards: 1 },
    description: "教授に涙の謝罪を決め、16単位を得る。1枚ドローする。",
    category: "stable",
  },
  {
    id: "ghostwriter",
    name: "ゴーストライター",
    keepValue: 10,
    useEffect: { selfBonus: 16 },
    description: "レポートを文豪が量産し、16単位を得る。",
    category: "stable",
  },
  {
    id: "native_helper",
    name: "助っ人ネイティブ",
    keepValue: 7,
    useEffect: { selfBonus: 10 },
    description: "外国語授業にネイティブを召喚し、10単位を得る。",
    category: "stable",
  },
  {
    id: "sit_in",
    name: "座り込み出席",
    keepValue: 6,
    useEffect: { selfBonus: 8, extraActions: 1 },
    description: "前日から教室で待機し、8単位を得る。このターンの行動回数+1。",
    category: "stable",
  },

  // ─── マイナス系 ────────────────────────────────────────────────────────────
  {
    id: "oversleep",
    name: "爆睡",
    keepValue: 8,
    useEffect: { selfBonus: 0, extraActions: 1 },
    description: "数多くの授業を寝過ごし、0単位を得る。このターンの行動回数+1。",
    category: "minus",
  },
  {
    id: "planned_nap",
    name: "計画的昼寝",
    keepValue: 10,
    useEffect: { selfBonus: 5, drawCards: 1 },
    description: "午後の授業をサボり、5単位を得る。1枚ドローする。",
    category: "minus",
  },
  {
    id: "flame",
    name: "大炎上",
    keepValue: 5,
    useEffect: { selfBonus: -10 },
    description: "SNSで悪評が知れ渡り、10単位を失う。",
    category: "minus",
  },

  // ─── 混沌系 ────────────────────────────────────────────────────────────────
  {
    id: "gacha",
    name: "卒業演習ガチャ",
    keepValue: 6,
    useEffect: { gamble: { win: 20, lose: -15 } },
    description: "配属先をランダムに決める。50%で+20単位、50%で-15単位。",
    category: "chaos",
  },
  {
    id: "all_nighter",
    name: "2徹",
    keepValue: 10,
    useEffect: { extraActions: 2, skipNextDraw: true },
    description: "命がけで課題をこなし、行動回数+2。次のターン、ドローしない。",
    category: "chaos",
  },
  {
    id: "drop_course",
    name: "履修中止",
    keepValue: 2,
    useEffect: { selfBonus: 0, discardSelf: 1, discardOpponent: 1 },
    description: "履中し、0単位を得る。手札1枚を除外し、相手のカードを1枚捨てる。",
    category: "chaos",
  },
  {
    id: "grade_hack",
    name: "成績改ざん",
    keepValue: 10,
    useEffect: { opponentBonus: -10 },
    description: "成績通知書の原本を書き換え、相手の単位を10減らす。",
    category: "chaos",
  },
  {
    id: "nightlife",
    name: "夜遊びの誘い",
    keepValue: 4,
    useEffect: { selfBonus: -6, opponentBonus: -16, drawCards: 1 },
    description: "深夜の麻雀で相手を陥れ、自分-6単位、相手-16単位。1枚ドロー。",
    category: "chaos",
  },
];

// デッキ構成：各カード3枚 = 39枚
// deck[0..19]: ターンドロー用, deck[20..32]: extraDraw用, deck[33..38]: 初期手札用
export const DECK_COMPOSITION: { cardId: string; count: number }[] =
  CARD_DEFS.map((d) => ({ cardId: d.id, count: 3 }));

export const STARTING_CREDITS = 24;
export const GRADUATION_CREDITS = 100;
export const TOTAL_TURNS = 20;

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const { cardId, count } of DECK_COMPOSITION) {
    const def = CARD_DEFS.find((d) => d.id === cardId)!;
    for (let i = 0; i < count; i++) {
      deck.push({ ...def, uid: `${cardId}-${i}` });
    }
  }
  return shuffleArray(deck);
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function createDeckWithSeed(seed: number): Card[] {
  const deck: Card[] = [];
  for (const { cardId, count } of DECK_COMPOSITION) {
    const def = CARD_DEFS.find((d) => d.id === cardId)!;
    for (let i = 0; i < count; i++) {
      deck.push({ ...def, uid: `${cardId}-${i}` });
    }
  }
  const rand = seededRandom(seed);
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
