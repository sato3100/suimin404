import {
  Card,
  createDeck,
  STARTING_CREDITS,
  GRADUATION_CREDITS,
  TOTAL_TURNS,
} from "@/data/cards";

// ─── 型定義 ─────────────────────────────────────────────────────────────────
export type GamePhase = "draw" | "action" | "ended";

export interface GameState {
  phase: GamePhase;
  turn: number;
  deck: Card[];
  playerHand: Card[];
  cpuHand: Card[];
  playerBonusCredits: number;
  cpuBonusCredits: number;
  playerSkipDraw: boolean;
  cpuSkipDraw: boolean;
  actionsRemaining: number;
  log: string[];
}

export interface GameResult {
  playerCredits: number;
  cpuCredits: number;
  playerGraduated: boolean;
  cpuGraduated: boolean;
  playerWon: boolean;
  ending: string;
  endingTitle: string;
}

// ─── 定数 ───────────────────────────────────────────────────────────────────
export const INITIAL_HAND_SIZE = 3;
export const MAX_HAND_SIZE = 8;

// ─── ターン判定（奇数=プレイヤー、偶数=CPU） ────────────────────────────────
export function isPlayerTurn(turn: number): boolean {
  return turn % 2 === 1;
}

// ─── ゲーム初期化 ───────────────────────────────────────────────────────────
export function createInitialState(): GameState {
  const deck = createDeck();
  const playerHand = deck.splice(-INITIAL_HAND_SIZE);
  const cpuHand = deck.splice(-INITIAL_HAND_SIZE);

  return {
    phase: "draw",
    turn: 1,
    deck,
    playerHand,
    cpuHand,
    playerBonusCredits: 0,
    cpuBonusCredits: 0,
    playerSkipDraw: false,
    cpuSkipDraw: false,
    actionsRemaining: 1,
    log: [],
  };
}

// ─── カードドロー ───────────────────────────────────────────────────────────
export function drawCard(state: GameState): GameState {
  if (state.phase !== "draw") return state;

  const player = isPlayerTurn(state.turn);
  const skipDraw = player ? state.playerSkipDraw : state.cpuSkipDraw;

  if (skipDraw) {
    return {
      ...state,
      phase: "action",
      actionsRemaining: 1,
      playerSkipDraw: player ? false : state.playerSkipDraw,
      cpuSkipDraw: player ? state.cpuSkipDraw : false,
      log: [...state.log, player ? "⏭️ ドロースキップ" : "🤖 相手のドロースキップ"],
    };
  }

  if (state.deck.length === 0) {
    return { ...state, phase: "action", actionsRemaining: 1 };
  }

  const newDeck = [...state.deck];
  const card = newDeck.pop()!;

  const canDraw = player
    ? state.playerHand.length < MAX_HAND_SIZE
    : state.cpuHand.length < MAX_HAND_SIZE;

  if (!canDraw) {
    return { ...state, phase: "action", actionsRemaining: 1 };
  }

  return {
    ...state,
    deck: newDeck,
    playerHand: player ? [...state.playerHand, card] : state.playerHand,
    cpuHand: player ? state.cpuHand : [...state.cpuHand, card],
    phase: "action",
    actionsRemaining: 1,
    log: [...state.log, player ? `📥 カードを引いた: ${card.name}` : "🤖 相手がカードを引いた"],
  };
}

// ─── 追加ドロー ─────────────────────────────────────────────────────────────
function drawExtra(state: GameState, count: number, forPlayer: boolean): GameState {
  let s = { ...state };
  for (let i = 0; i < count; i++) {
    if (s.deck.length === 0) break;
    const handSize = forPlayer ? s.playerHand.length : s.cpuHand.length;
    if (handSize >= MAX_HAND_SIZE) break;
    const newDeck = [...s.deck];
    const card = newDeck.pop()!;
    s = {
      ...s,
      deck: newDeck,
      playerHand: forPlayer ? [...s.playerHand, card] : s.playerHand,
      cpuHand: forPlayer ? s.cpuHand : [...s.cpuHand, card],
      log: [...s.log, forPlayer ? `📥 追加ドロー: ${card.name}` : "🤖 相手が追加ドロー"],
    };
  }
  return s;
}

// ─── カード使用 ─────────────────────────────────────────────────────────────
export function useCard(state: GameState, cardIndex: number): GameState {
  if (state.phase !== "action") return state;

  const player = isPlayerTurn(state.turn);
  const hand = player ? [...state.playerHand] : [...state.cpuHand];
  const card = hand[cardIndex];
  if (!card) return state;

  hand.splice(cardIndex, 1);

  let playerBonus = state.playerBonusCredits;
  let cpuBonus = state.cpuBonusCredits;
  let playerSkip = state.playerSkipDraw;
  let cpuSkip = state.cpuSkipDraw;
  let actionsRemaining = state.actionsRemaining - 1;
  let logMsg = `⚡ ${card.name}を使用！`;

  const eff = card.useEffect;

  if (eff.selfBonus !== undefined && eff.selfBonus !== 0) {
    if (player) playerBonus += eff.selfBonus;
    else cpuBonus += eff.selfBonus;
    logMsg += eff.selfBonus > 0 ? ` +${eff.selfBonus}単位` : ` ${eff.selfBonus}単位`;
  }

  if (eff.opponentBonus !== undefined && eff.opponentBonus !== 0) {
    if (player) cpuBonus += eff.opponentBonus;
    else playerBonus += eff.opponentBonus;
    logMsg += ` 相手${eff.opponentBonus}単位`;
  }

  if (eff.skipNextDraw) {
    if (player) playerSkip = true;
    else cpuSkip = true;
  }

  if (eff.extraActions) {
    actionsRemaining += eff.extraActions;
  }

  if (eff.gamble) {
    const won = Math.random() >= 0.5;
    const change = won ? eff.gamble.win : eff.gamble.lose;
    if (player) playerBonus += change;
    else cpuBonus += change;
    logMsg += won ? ` 成功！+${eff.gamble.win}単位` : ` 失敗... ${eff.gamble.lose}単位`;
  }

  let newState: GameState = {
    ...state,
    playerHand: player ? hand : state.playerHand,
    cpuHand: player ? state.cpuHand : hand,
    playerBonusCredits: playerBonus,
    cpuBonusCredits: cpuBonus,
    playerSkipDraw: playerSkip,
    cpuSkipDraw: cpuSkip,
    actionsRemaining,
    log: [...state.log, logMsg],
  };

  if (eff.discardOpponent && eff.discardOpponent > 0) {
    const oppHand = player ? [...newState.cpuHand] : [...newState.playerHand];
    for (let i = 0; i < eff.discardOpponent && oppHand.length > 0; i++) {
      const idx = Math.floor(Math.random() * oppHand.length);
      const removed = oppHand.splice(idx, 1)[0];
      newState = { ...newState, log: [...newState.log, `🗑️ 相手の${removed.name}を除外！`] };
    }
    newState = player ? { ...newState, cpuHand: oppHand } : { ...newState, playerHand: oppHand };
  }

  if (eff.discardSelf && eff.discardSelf > 0) {
    const selfHand = player ? [...newState.playerHand] : [...newState.cpuHand];
    for (let i = 0; i < eff.discardSelf && selfHand.length > 0; i++) {
      const idx = Math.floor(Math.random() * selfHand.length);
      const removed = selfHand.splice(idx, 1)[0];
      newState = { ...newState, log: [...newState.log, `🗑️ 自分の${removed.name}を除外`] };
    }
    newState = player ? { ...newState, playerHand: selfHand } : { ...newState, cpuHand: selfHand };
  }

  if (eff.drawCards && eff.drawCards > 0) {
    newState = drawExtra(newState, eff.drawCards, player);
  }

  if (newState.actionsRemaining <= 0) {
    return advanceTurn(newState);
  }
  return newState;
}

// ─── パス ───────────────────────────────────────────────────────────────────
export function passTurn(state: GameState): GameState {
  if (state.phase !== "action") return state;
  const player = isPlayerTurn(state.turn);
  return advanceTurn({
    ...state,
    actionsRemaining: 0,
    log: [...state.log, player ? "⏭️ パスした" : "🤖 相手がパスした"],
  });
}

// ─── ターン進行 ─────────────────────────────────────────────────────────────
function advanceTurn(state: GameState): GameState {
  if (state.turn >= TOTAL_TURNS) {
    return { ...state, phase: "ended" };
  }
  return { ...state, turn: state.turn + 1, phase: "draw" };
}

// ─── 単位計算 ───────────────────────────────────────────────────────────────
export function getPlayerCredits(state: GameState): number {
  return STARTING_CREDITS + state.playerHand.reduce((s, c) => s + c.keepValue, 0) + state.playerBonusCredits;
}

export function getCpuCredits(state: GameState): number {
  return STARTING_CREDITS + state.cpuHand.reduce((s, c) => s + c.keepValue, 0) + state.cpuBonusCredits;
}

// ─── 結果判定（仕様書準拠） ─────────────────────────────────────────────────
export function determineResult(state: GameState): GameResult {
  const playerCredits = getPlayerCredits(state);
  const cpuCredits = getCpuCredits(state);
  const playerGrad = playerCredits >= GRADUATION_CREDITS;
  const cpuGrad = cpuCredits >= GRADUATION_CREDITS;

  let playerWon: boolean;
  if (playerGrad && !cpuGrad) playerWon = true;
  else if (!playerGrad && cpuGrad) playerWon = false;
  else {
    const pDiff = Math.abs(playerCredits - GRADUATION_CREDITS);
    const cDiff = Math.abs(cpuCredits - GRADUATION_CREDITS);
    playerWon = pDiff < cDiff;
  }

  let ending: string;
  let endingTitle: string;
  if (playerCredits === GRADUATION_CREDITS) {
    ending = "perfect";
    endingTitle = "伝説の省エネ卒業";
  } else if (playerCredits >= 131) {
    ending = "nerd";
    endingTitle = "ガリ勉・友達ゼロ";
  } else if (playerGrad) {
    ending = "graduate";
    endingTitle = "卒業";
  } else if (playerCredits >= 94) {
    ending = "repeat";
    endingTitle = "留年";
  } else {
    ending = "dropout";
    endingTitle = "中退・家出";
  }

  return { playerCredits, cpuCredits, playerGraduated: playerGrad, cpuGraduated: cpuGrad, playerWon, ending, endingTitle };
}
