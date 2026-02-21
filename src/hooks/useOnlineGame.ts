import { useState, useEffect, useRef, useCallback } from "react";
import { FirestoreGame } from "@/types/online";
import { subscribeGame, submitAction, computeCredits } from "@/services/gameService";
import { Card, createDeckWithSeed, STARTING_CREDITS, TOTAL_TURNS } from "@/data/cards";
import { Action } from "@/types/online";

const TURN_TIME_SECONDS = 120; // 2分

export interface OnlineGameHookState {
  game: FirestoreGame | null;
  isMyTurn: boolean;
  myHand: Card[];
  opponentHandCount: number;
  myCredits: number;
  opponentCredits: number;
  drawnCard: Card | null; // 今ターンドローしたカード（手札末尾）
  timeLeft: number;
  loading: boolean;
}

export function useOnlineGame(gameId: string, playerId: string) {
  const [game, setGame] = useState<FirestoreGame | null>(null);
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_SECONDS);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoPassedRef = useRef(false);

  useEffect(() => {
    const unsub = subscribeGame(gameId, (g) => {
      setGame(g);
      setLoading(false);
    });
    return unsub;
  }, [gameId]);

  // ターン変更時にタイマーリセット
  useEffect(() => {
    if (!game || game.status !== "playing") return;

    const isP1 = playerId === game.player1Id;
    const myTurn = game.currentTurn % 2 === 1 ? isP1 : !isP1;
    if (!myTurn) return;

    setTimeLeft(TURN_TIME_SECONDS);
    autoPassedRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // タイムアウト → 自動パス
          if (!autoPassedRef.current) {
            autoPassedRef.current = true;
            submitAction(gameId, playerId, { type: "pass" }).catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game?.currentTurn, gameId, playerId]);

  const handleSubmit = useCallback(
    async (action: Action) => {
      if (timerRef.current) clearInterval(timerRef.current);
      await submitAction(gameId, playerId, action);
    },
    [gameId, playerId],
  );

  if (!game) {
    return {
      game: null,
      isMyTurn: false,
      myHand: [],
      opponentHandCount: 0,
      myCredits: STARTING_CREDITS,
      opponentCredits: STARTING_CREDITS,
      drawnCard: null,
      timeLeft: TURN_TIME_SECONDS,
      loading,
      submitAction: handleSubmit,
    };
  }

  const isPlayer1 = playerId === game.player1Id;
  const isMyTurn =
    game.status === "playing" &&
    (game.currentTurn % 2 === 1 ? isPlayer1 : !isPlayer1);

  // 今ターンのドローカード（自分のターン時のみ）
  let drawnCard: Card | null = null;
  if (isMyTurn) {
    const deck = createDeckWithSeed(game.deckSeed);
    drawnCard = deck[game.currentTurn - 1] ?? null;
  }

  // 手札：Firestoreから取得した配列 + 今ターンのドローカード（自分ターン時）
  const baseMyHand = isPlayer1 ? game.player1Hand : game.player2Hand;
  const myHand: Card[] = isMyTurn && drawnCard
    ? [...baseMyHand, drawnCard]
    : baseMyHand;

  const opponentHand = isPlayer1 ? game.player2Hand : game.player1Hand;
  const myBonus = isPlayer1 ? game.player1BonusCredits : game.player2BonusCredits;
  const opponentBonus = isPlayer1 ? game.player2BonusCredits : game.player1BonusCredits;

  return {
    game,
    isMyTurn,
    myHand,
    opponentHandCount: opponentHand.length,
    myCredits: computeCredits(myHand, myBonus),
    opponentCredits: computeCredits(opponentHand, opponentBonus),
    drawnCard: isMyTurn ? drawnCard : null,
    timeLeft,
    loading,
    submitAction: handleSubmit,
  };
}
