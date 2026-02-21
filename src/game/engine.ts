import {
  Card,
  createDeck,
  STARTING_CREDITS,
  GRADUATION_CREDITS,
  TOTAL_TURNS,
} from "@/data/cards";

export type GamePhase = "draw" | "action" | "ended";

export interface GameState {
  phase: GamePhase;
  turn: number; // 1-8
  deck: Card[];
  playerHand: Card[];
  cpuHand: Card[];
  playerBonusCredits: number;
  cpuBonusCredits: number;
  playerUsedVolunteer: boolean;
  cpuUsedVolunteer: boolean;
  log: string[];
}

export function isPlayerTurn(turn: number): boolean {
  return turn % 2 === 1; // 奇数ターン = プレイヤー
}

export function createInitialState(): GameState {
  return {
    phase: "draw",
    turn: 1,
    deck: createDeck(),
    playerHand: [],
    cpuHand: [],
    playerBonusCredits: 0,
    cpuBonusCredits: 0,
    playerUsedVolunteer: false,
    cpuUsedVolunteer: false,
    log: ["🎓 卒業チキンレース開始！"],
  };
}

export function drawCard(state: GameState): GameState {
  if (state.phase !== "draw" || state.deck.length === 0) return state;

  const newDeck = [...state.deck];
  const card = newDeck.pop()!;
  const player = isPlayerTurn(state.turn);

  return {
    ...state,
    deck: newDeck,
    playerHand: player ? [...state.playerHand, card] : state.playerHand,
    cpuHand: player ? state.cpuHand : [...state.cpuHand, card],
    phase: "action",
    log: [
      ...state.log,
      player
        ? `📥 カードを引いた: ${card.emoji} ${card.name}`
        : "🤖 相手がカードを引いた",
    ],
  };
}

export function useCard(state: GameState, cardIndex: number): GameState {
  if (state.phase !== "action") return state;

  const player = isPlayerTurn(state.turn);
  const hand = player ? [...state.playerHand] : [...state.cpuHand];
  const card = hand[cardIndex];
  if (!card) return state;

  hand.splice(cardIndex, 1);

  let playerBonus = state.playerBonusCredits;
  let cpuBonus = state.cpuBonusCredits;
  let playerVol = state.playerUsedVolunteer;
  let cpuVol = state.cpuUsedVolunteer;
  let logMsg = "";

  switch (card.effectType) {
    case "boost":
      if (player) {
        playerBonus += card.effectValue;
        logMsg = `📚 ${card.name}を使用！自分 +${card.effectValue}単位`;
      } else {
        cpuBonus += card.effectValue;
        logMsg = `🤖 相手が${card.name}を使用！相手 +${card.effectValue}単位`;
      }
      break;

    case "attack":
      if (player) {
        cpuBonus += card.effectValue;
        logMsg = `⚔️ ${card.name}を使用！相手 ${card.effectValue}単位`;
      } else {
        playerBonus += card.effectValue;
        logMsg = `🤖 相手が${card.name}を発動！あなた ${card.effectValue}単位`;
      }
      break;

    case "special":
      if (player) {
        playerBonus += card.effectValue;
        playerVol = true;
        logMsg = `🤝 ${card.name}参加！自分 +${card.effectValue}単位`;
      } else {
        cpuBonus += card.effectValue;
        cpuVol = true;
        logMsg = `🤖 相手が${card.name}に参加！`;
      }
      break;

    case "gamble": {
      const won = Math.random() >= 0.5;
      const change = won ? card.effectValue : -card.effectValue;
      if (player) {
        playerBonus += change;
        logMsg = won
          ? `🎰 徹夜で勉強成功！+${card.effectValue}単位`
          : `🎰 遊んでしまった... -${card.effectValue}単位`;
      } else {
        cpuBonus += change;
        logMsg = won
          ? `🤖 相手の徹夜勉強が成功！`
          : `🤖 相手の徹夜が裏目に！`;
      }
      break;
    }
  }

  return advanceTurn({
    ...state,
    playerHand: player ? hand : state.playerHand,
    cpuHand: player ? state.cpuHand : hand,
    playerBonusCredits: playerBonus,
    cpuBonusCredits: cpuBonus,
    playerUsedVolunteer: playerVol,
    cpuUsedVolunteer: cpuVol,
    log: [...state.log, logMsg],
  });
}

export function passTurn(state: GameState): GameState {
  if (state.phase !== "action") return state;

  const player = isPlayerTurn(state.turn);
  return advanceTurn({
    ...state,
    log: [
      ...state.log,
      player ? "⏭️ パスした" : "🤖 相手がパスした",
    ],
  });
}

function advanceTurn(state: GameState): GameState {
  if (state.turn >= TOTAL_TURNS) {
    return { ...state, phase: "ended" };
  }
  return { ...state, turn: state.turn + 1, phase: "draw" };
}

export function getPlayerCredits(state: GameState): number {
  const handValue = state.playerHand.reduce((s, c) => s + c.keepValue, 0);
  return STARTING_CREDITS + handValue + state.playerBonusCredits;
}

export function getCpuCredits(state: GameState): number {
  const handValue = state.cpuHand.reduce((s, c) => s + c.keepValue, 0);
  return STARTING_CREDITS + handValue + state.cpuBonusCredits;
}

export interface GameResult {
  playerCredits: number;
  cpuCredits: number;
  playerGraduated: boolean;
  cpuGraduated: boolean;
  playerWon: boolean;
  playerUsedVolunteer: boolean;
  ending: string;
  endingTitle: string;
}

export function determineResult(state: GameState): GameResult {
  const playerCredits = getPlayerCredits(state);
  const cpuCredits = getCpuCredits(state);

  const playerGrad = playerCredits >= GRADUATION_CREDITS;
  const cpuGrad = cpuCredits >= GRADUATION_CREDITS;

  let playerWon: boolean;
  if (playerGrad && !cpuGrad) {
    playerWon = true;
  } else if (!playerGrad && cpuGrad) {
    playerWon = false;
  } else {
    // 両者同条件: 124に近い方が勝ち
    const pDiff = Math.abs(playerCredits - GRADUATION_CREDITS);
    const cDiff = Math.abs(cpuCredits - GRADUATION_CREDITS);
    playerWon = pDiff <= cDiff;
  }

  let ending: string;
  let endingTitle: string;

  if (playerCredits === GRADUATION_CREDITS) {
    ending = "perfect";
    endingTitle = "伝説の省エネ卒業";
  } else if (playerGrad && state.playerUsedVolunteer) {
    ending = "employed";
    endingTitle = "超優良企業へ就職";
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

  return {
    playerCredits,
    cpuCredits,
    playerGraduated: playerGrad,
    cpuGraduated: cpuGrad,
    playerWon,
    playerUsedVolunteer: state.playerUsedVolunteer,
    ending,
    endingTitle,
  };
}
