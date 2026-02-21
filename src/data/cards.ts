export interface CardDef {
  id: string;
  name: string;
  emoji: string;
  keepValue: number;
  effectType: "boost" | "attack" | "special" | "gamble";
  effectValue: number;
  description: string;
}

export interface Card extends CardDef {
  uid: string;
}

export const CARD_DEFS: CardDef[] = [
  // 単位UP系（カードを作成するまで仮実装）
  {
    id: "attendance",
    name: "真面目に出席",
    emoji: "📚",
    keepValue: 9,
    effectType: "boost",
    effectValue: 11,
    description: "コツコツ出席して単位GET",
  },
  {
    id: "report",
    name: "レポート提出",
    emoji: "📝",
    keepValue: 8,
    effectType: "boost",
    effectValue: 10,
    description: "頑張って書いたレポート",
  },
  {
    id: "pastexam",
    name: "過去問入手",
    emoji: "📋",
    keepValue: 10,
    effectType: "boost",
    effectValue: 12,
    description: "先輩からの贈り物",
  },
  {
    id: "library",
    name: "図書館で自習",
    emoji: "📖",
    keepValue: 7,
    effectType: "boost",
    effectValue: 9,
    description: "静かな環境で集中",
  },
  // 妨害系（カードを作成するまで仮実装）
  {
    id: "party",
    name: "飲み会に誘う",
    emoji: "🍺",
    keepValue: 7,
    effectType: "attack",
    effectValue: -8,
    description: "今日は飲みに行こうぜ！",
  },
  {
    id: "gaming",
    name: "ゲーム貸す",
    emoji: "🎮",
    keepValue: 8,
    effectType: "attack",
    effectValue: -9,
    description: "このゲーム超面白いよ",
  },
  {
    id: "oversleep",
    name: "夜更かしさせる",
    emoji: "💤",
    keepValue: 5,
    effectType: "attack",
    effectValue: -10,
    description: "あと1話だけ見ようよ...",
  },
  {
    id: "nuke",
    name: "落単砲",
    emoji: "💀",
    keepValue: 3,
    effectType: "attack",
    effectValue: -12,
    description: "最強の妨害カード",
  },
];

export const DECK_COMPOSITION: { cardId: string; count: number }[] = [
  { cardId: "attendance", count: 3 },
  { cardId: "report", count: 3 },
  { cardId: "pastexam", count: 3 },
  { cardId: "library", count: 3 },
  { cardId: "party", count: 3 },
  { cardId: "gaming", count: 3 },
  { cardId: "oversleep", count: 3 },
  { cardId: "nuke", count: 3 },
];

export const STARTING_CREDITS = 94;
export const GRADUATION_CREDITS = 124;
export const TOTAL_TURNS = 16; // プレイヤー8ターン + CPU8ターン

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
