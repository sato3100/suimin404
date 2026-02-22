import { db } from "@/firebase";
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
  getDoc,
} from "firebase/firestore";
import { Action, FirestoreGame } from "@/types/online";
import {
  Card,
  createDeckWithSeed,
  STARTING_CREDITS,
  GRADUATION_CREDITS,
  TOTAL_TURNS,
  seededRandom,
} from "@/data/cards";
import { INITIAL_HAND_SIZE } from "@/game/engine";
import { updateRating } from "./ratingService";

// ゲーム開始：lobbyのplayer1がゲームドキュメントを作成
export async function startGame(
  lobbyId: string,
  player1Id: string,
  player2Id: string,
): Promise<string> {
  const deckSeed = Math.floor(Math.random() * 1_000_000);
  // deck[0..19]: ターンドロー用, deck[20..32]: extraDraw用
  // deck[33..35]: player1初期手札, deck[36..38]: player2初期手札
  const deck = createDeckWithSeed(deckSeed);
  const player1Hand = deck.slice(-(INITIAL_HAND_SIZE * 2), -INITIAL_HAND_SIZE);
  const player2Hand = deck.slice(-INITIAL_HAND_SIZE);

  return await runTransaction(db, async (tx) => {
    const lobbyRef = doc(db, "lobbies", lobbyId);
    const lobbySnap = await tx.get(lobbyRef);
    if (!lobbySnap.exists()) throw new Error("Lobby not found");

    const lobbyData = lobbySnap.data();
    // 既に gameId がある場合は再利用（race condition 対策）
    if (lobbyData.gameId) return lobbyData.gameId as string;

    const gameRef = doc(collection(db, "games"));
    const gameData: FirestoreGame = {
      lobbyId,
      player1Id,
      player2Id,
      deckSeed,
      currentTurn: 1,
      player1Hand,
      player2Hand,
      player1BonusCredits: 0,
      player2BonusCredits: 0,
      player1UsedVolunteer: false,
      player2UsedVolunteer: false,
      status: "playing",
      winnerId: null,
      log: ["🎓 卒業チキンレース開始！"],
    };

    tx.set(gameRef, { ...gameData, updatedAt: serverTimestamp() });
    tx.update(lobbyRef, { status: "playing", gameId: gameRef.id });

    return gameRef.id;
  });
}

// ゲーム状態をリアルタイム監視
export function subscribeGame(
  gameId: string,
  callback: (game: FirestoreGame) => void,
): () => void {
  return onSnapshot(doc(db, "games", gameId), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as FirestoreGame);
    }
  });
}

// カード効果を適用（全効果対応）
function applyCardEffect(
  card: Card,
  isPlayer1: boolean,
  p1Bonus: number,
  p2Bonus: number,
  deckSeed: number,
  turn: number,
  p1Hand: Card[],
  p2Hand: Card[],
  extraDrawCount: number,
  deck: Card[],
): {
  p1Bonus: number;
  p2Bonus: number;
  p1Hand: Card[];
  p2Hand: Card[];
  extraDrawCount: number;
  logMsg: string;
  skipNextDraw: boolean;
  extraActionsCount: number;
} {
  const eff = card.useEffect;
  let logMsg = `⚡ ${card.name}を使用！`;
  let skipNextDraw = false;
  let extraActionsCount = 0;

  // 自己ボーナス
  if (eff.selfBonus !== undefined && eff.selfBonus !== 0) {
    if (isPlayer1) p1Bonus += eff.selfBonus;
    else p2Bonus += eff.selfBonus;
    logMsg += eff.selfBonus > 0 ? ` +${eff.selfBonus}単位` : ` ${eff.selfBonus}単位`;
  }

  // 相手ボーナス
  if (eff.opponentBonus !== undefined && eff.opponentBonus !== 0) {
    if (isPlayer1) p2Bonus += eff.opponentBonus;
    else p1Bonus += eff.opponentBonus;
    logMsg += ` 相手${eff.opponentBonus}単位`;
  }

  // ギャンブル（シード固定）
  if (eff.gamble) {
    const won = seededRandom(deckSeed + turn * 997)() >= 0.5;
    const change = won ? eff.gamble.win : eff.gamble.lose;
    if (isPlayer1) p1Bonus += change;
    else p2Bonus += change;
    logMsg += won ? ` 成功！+${eff.gamble.win}単位` : ` 失敗... ${eff.gamble.lose}単位`;
  }

  // 次のターンのドローをスキップ（自分）
  if (eff.skipNextDraw) {
    skipNextDraw = true;
  }

  // 追加行動
  if (eff.extraActions && eff.extraActions > 0) {
    extraActionsCount = eff.extraActions;
  }

  // 追加ドロー（デッキの TOTAL_TURNS 以降を使用）
  if (eff.drawCards && eff.drawCards > 0) {
    for (let i = 0; i < eff.drawCards; i++) {
      const extra = deck[TOTAL_TURNS + extraDrawCount];
      if (extra) {
        if (isPlayer1) p1Hand = [...p1Hand, extra];
        else p2Hand = [...p2Hand, extra];
        extraDrawCount++;
        logMsg += ` 追加ドロー`;
      }
    }
  }

  // 相手カード除外（シード固定でランダム）
  if (eff.discardOpponent && eff.discardOpponent > 0) {
    const oppHand = isPlayer1 ? [...p2Hand] : [...p1Hand];
    for (let i = 0; i < eff.discardOpponent && oppHand.length > 0; i++) {
      const rand = seededRandom(deckSeed + turn * 1009 + i);
      const idx = Math.floor(rand() * oppHand.length);
      const removed = oppHand.splice(idx, 1)[0];
      logMsg += ` 🗑️相手の${removed.name}を除外！`;
    }
    if (isPlayer1) p2Hand = oppHand;
    else p1Hand = oppHand;
  }

  // 自分カード除外（シード固定でランダム）
  if (eff.discardSelf && eff.discardSelf > 0) {
    const selfHand = isPlayer1 ? [...p1Hand] : [...p2Hand];
    for (let i = 0; i < eff.discardSelf && selfHand.length > 0; i++) {
      const rand = seededRandom(deckSeed + turn * 1013 + i);
      const idx = Math.floor(rand() * selfHand.length);
      const removed = selfHand.splice(idx, 1)[0];
      logMsg += ` 🗑️${removed.name}を捨てた`;
    }
    if (isPlayer1) p1Hand = selfHand;
    else p2Hand = selfHand;
  }

  return { p1Bonus, p2Bonus, p1Hand, p2Hand, extraDrawCount, logMsg, skipNextDraw, extraActionsCount };
}

function computeCredits(hand: Card[], bonus: number): number {
  const handValue = hand.reduce((s, c) => s + c.keepValue, 0);
  return STARTING_CREDITS + handValue + bonus;
}

function computeWinner(game: FirestoreGame): string | null {
  const p1Credits = computeCredits(game.player1Hand, game.player1BonusCredits);
  const p2Credits = computeCredits(game.player2Hand, game.player2BonusCredits);
  const p1Grad = p1Credits >= GRADUATION_CREDITS;
  const p2Grad = p2Credits >= GRADUATION_CREDITS;

  if (p1Grad && !p2Grad) return game.player1Id;
  if (!p1Grad && p2Grad) return game.player2Id;

  const p1Diff = Math.abs(p1Credits - GRADUATION_CREDITS);
  const p2Diff = Math.abs(p2Credits - GRADUATION_CREDITS);
  // 同距離の場合はP2勝利（engine.tsと統一）
  return p1Diff < p2Diff ? game.player1Id : game.player2Id;
}

// アクション送信 + ターン処理（トランザクション）
export async function submitAction(
  gameId: string,
  playerId: string,
  action: Action,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const gameRef = doc(db, "games", gameId);
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) throw new Error("Game not found");

    const game = gameSnap.data() as FirestoreGame;
    if (game.status !== "playing") return;

    const isPlayer1 = playerId === game.player1Id;
    const turn = game.currentTurn;

    // アクティブプレイヤー確認（奇数ターン=player1、偶数=player2）
    const isP1Turn = turn % 2 === 1;
    if (isPlayer1 !== isP1Turn) return; // 自分のターンではない

    const myExtraActions = isPlayer1
      ? (game.player1ExtraActions ?? 0)
      : (game.player2ExtraActions ?? 0);
    const isExtraAction = myExtraActions > 0;

    const deck = createDeckWithSeed(game.deckSeed);
    let p1Hand = [...game.player1Hand];
    let p2Hand = [...game.player2Hand];
    let p1Bonus = game.player1BonusCredits;
    let p2Bonus = game.player2BonusCredits;
    let p1Vol = game.player1UsedVolunteer;
    let p2Vol = game.player2UsedVolunteer;
    let p1SkipDraw = game.player1SkipDraw ?? false;
    let p2SkipDraw = game.player2SkipDraw ?? false;
    let p1ExtraActions = game.player1ExtraActions ?? 0;
    let p2ExtraActions = game.player2ExtraActions ?? 0;
    let extraDrawCount = game.extraDrawCount ?? 0;
    const newLog = [...game.log];

    if (!isExtraAction) {
      // 通常ターン: ドロー処理
      const skipDraw = isPlayer1 ? p1SkipDraw : p2SkipDraw;
      if (skipDraw) {
        newLog.push(isPlayer1 ? "⏭️ ドロースキップ" : "⏭️ 相手のドロースキップ");
        if (isPlayer1) p1SkipDraw = false;
        else p2SkipDraw = false;
      } else {
        const drawnCard = deck[turn - 1];
        if (drawnCard) {
          if (isPlayer1) p1Hand = [...p1Hand, drawnCard];
          else p2Hand = [...p2Hand, drawnCard];
        }
      }
    }
    // extraAction 中はドローしない（手札はすでに1アクション目でFirestoreに保存済み）

    if (action.type === "use") {
      const hand = isPlayer1 ? p1Hand : p2Hand;
      const card = hand[action.cardIndex];
      if (!card) return;

      // 使用したカードを手札から除去
      if (isPlayer1) {
        p1Hand = p1Hand.filter((_, i) => i !== action.cardIndex);
      } else {
        p2Hand = p2Hand.filter((_, i) => i !== action.cardIndex);
      }

      const result = applyCardEffect(
        card,
        isPlayer1,
        p1Bonus,
        p2Bonus,
        game.deckSeed,
        turn,
        p1Hand,
        p2Hand,
        extraDrawCount,
        deck,
      );
      p1Bonus = result.p1Bonus;
      p2Bonus = result.p2Bonus;
      p1Hand = result.p1Hand;
      p2Hand = result.p2Hand;
      extraDrawCount = result.extraDrawCount;

      if (result.skipNextDraw) {
        if (isPlayer1) p1SkipDraw = true;
        else p2SkipDraw = true;
      }

      if (result.extraActionsCount > 0) {
        if (isPlayer1) p1ExtraActions += result.extraActionsCount;
        else p2ExtraActions += result.extraActionsCount;
      }

      if (result.logMsg) newLog.push(result.logMsg);
    } else {
      newLog.push(isPlayer1 ? "⏭️ パスした（手札をキープ）" : "⏭️ 相手がパスした");
    }

    // 追加行動を消費
    if (isExtraAction) {
      if (isPlayer1) p1ExtraActions = Math.max(0, p1ExtraActions - 1);
      else p2ExtraActions = Math.max(0, p2ExtraActions - 1);
    }

    // 残り追加行動がなければターンを進める
    const remainingExtras = isPlayer1 ? p1ExtraActions : p2ExtraActions;
    const shouldAdvanceTurn = remainingExtras <= 0;
    const nextTurn = shouldAdvanceTurn ? turn + 1 : turn;
    const isEnded = shouldAdvanceTurn && nextTurn > TOTAL_TURNS;

    const updatedGame: Partial<FirestoreGame> = {
      player1Hand: p1Hand,
      player2Hand: p2Hand,
      player1BonusCredits: p1Bonus,
      player2BonusCredits: p2Bonus,
      player1UsedVolunteer: p1Vol,
      player2UsedVolunteer: p2Vol,
      player1SkipDraw: p1SkipDraw,
      player2SkipDraw: p2SkipDraw,
      player1ExtraActions: p1ExtraActions,
      player2ExtraActions: p2ExtraActions,
      extraDrawCount,
      currentTurn: isEnded ? turn : nextTurn,
      log: newLog,
    };

    if (isEnded) {
      const winnerId = computeWinner({
        ...game,
        ...updatedGame,
      } as FirestoreGame);
      updatedGame.status = "ended";
      updatedGame.winnerId = winnerId;
      newLog.push(
        winnerId === game.player1Id
          ? "🏆 player1の勝利！"
          : "🏆 player2の勝利！",
      );
      updatedGame.log = newLog;
    }

    tx.update(gameRef, { ...updatedGame, updatedAt: serverTimestamp() });
  });

  // ゲーム終了時にレーティング更新
  const gameSnap = await getDoc(doc(db, "games", gameId));
  if (gameSnap.exists()) {
    const game = gameSnap.data() as FirestoreGame;
    if (game.status === "ended" && game.winnerId) {
      const p1Won = game.winnerId === game.player1Id;
      const p1Doc = await getDoc(doc(db, "users", game.player1Id));
      const p2Doc = await getDoc(doc(db, "users", game.player2Id));
      if (p1Doc.exists() && p2Doc.exists()) {
        const p1Rating = p1Doc.data().rating ?? 1000;
        const p2Rating = p2Doc.data().rating ?? 1000;
        await Promise.all([
          updateRating(game.player1Id, p1Won, p2Rating),
          updateRating(game.player2Id, !p1Won, p1Rating),
        ]);
      }
    }
  }
}

// 単位計算（UI用）
export { computeCredits };
