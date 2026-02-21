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
import { updateRating } from "./ratingService";

// ゲーム開始：lobbyのplayer1がゲームドキュメントを作成
export async function startGame(
  lobbyId: string,
  player1Id: string,
  player2Id: string,
): Promise<string> {
  const deckSeed = Math.floor(Math.random() * 1_000_000);

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
      player1Hand: [],
      player2Hand: [],
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

// カード効果を適用（新カードシステム対応）
function applyCardEffect(
  card: Card,
  isPlayer1: boolean,
  p1Bonus: number,
  p2Bonus: number,
  _p1Vol: boolean,
  _p2Vol: boolean,
  deckSeed: number,
  turn: number,
): {
  p1Bonus: number;
  p2Bonus: number;
  p1Vol: boolean;
  p2Vol: boolean;
  logMsg: string;
} {
  const eff = card.useEffect;
  let logMsg = `⚡ ${card.name}を使用！`;

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

  return { p1Bonus, p2Bonus, p1Vol: _p1Vol, p2Vol: _p2Vol, logMsg };
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
  return p1Diff <= p2Diff ? game.player1Id : game.player2Id;
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

    const deck = createDeckWithSeed(game.deckSeed);
    const drawnCard = deck[turn - 1];
    if (!drawnCard) return;

    // ドローしたカードを手札に追加
    let p1Hand = [...game.player1Hand];
    let p2Hand = [...game.player2Hand];
    if (isPlayer1) {
      p1Hand = [...p1Hand, drawnCard];
    } else {
      p2Hand = [...p2Hand, drawnCard];
    }

    let p1Bonus = game.player1BonusCredits;
    let p2Bonus = game.player2BonusCredits;
    let p1Vol = game.player1UsedVolunteer;
    let p2Vol = game.player2UsedVolunteer;
    const newLog = [...game.log];

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
        p1Vol,
        p2Vol,
        game.deckSeed,
        turn,
      );
      p1Bonus = result.p1Bonus;
      p2Bonus = result.p2Bonus;
      p1Vol = result.p1Vol;
      p2Vol = result.p2Vol;
      if (result.logMsg) newLog.push(result.logMsg);
    } else {
      newLog.push(isPlayer1 ? "⏭️ パスした（手札をキープ）" : "⏭️ 相手がパスした");
    }

    const nextTurn = turn + 1;
    const isEnded = nextTurn > TOTAL_TURNS;

    const updatedGame: Partial<FirestoreGame> = {
      player1Hand: p1Hand,
      player2Hand: p2Hand,
      player1BonusCredits: p1Bonus,
      player2BonusCredits: p2Bonus,
      player1UsedVolunteer: p1Vol,
      player2UsedVolunteer: p2Vol,
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
