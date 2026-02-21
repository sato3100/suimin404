import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  GameState,
  createInitialState,
  drawCard,
  useCard,
  passTurn,
  isPlayerTurn,
  getPlayerCredits,
  getCpuCredits,
  determineResult,
} from "@/game/engine";
import { cpuAction } from "@/game/cpu";
import { setLastResult, setLastOnlineResult } from "@/game/store";
import {
  GRADUATION_CREDITS,
  STARTING_CREDITS,
} from "@/data/cards";
import { useOnlineGame } from "@/hooks/useOnlineGame";

// ─── CPU対戦画面 ───────────────────────────────────────────────────────────────
function CpuGameScreen() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const playerTurn = isPlayerTurn(state.turn);
  const playerCredits = getPlayerCredits(state);
  const cpuCredits = getCpuCredits(state);

  useEffect(() => {
    if (state.phase === "ended") {
      setLastResult(determineResult(state));
      const t = setTimeout(() => router.replace("/result"), 800);
      return () => clearTimeout(t);
    }
    if (state.phase === "draw") {
      const t = setTimeout(() => setState((s) => drawCard(s)), 400);
      return () => clearTimeout(t);
    }
    if (state.phase === "action" && !playerTurn) {
      const t = setTimeout(() => setState((s) => cpuAction(s)), 800);
      return () => clearTimeout(t);
    }
  }, [state.phase, state.turn, playerTurn]);

  const handleUse = useCallback((idx: number) => {
    setState((s) => useCard(s, idx));
    setSelectedCard(null);
  }, []);

  const handlePass = useCallback(() => {
    setState((s) => passTurn(s));
    setSelectedCard(null);
  }, []);

  const selected =
    selectedCard !== null ? state.playerHand[selectedCard] : null;
  const canAct = playerTurn && state.phase === "action";

  return (
    <View className="flex-1 bg-slate-900">
      <StatusBar style="light" />
      <View className="flex-row items-center justify-between bg-slate-800 px-4 pb-3 pt-14">
        <Text className="text-sm font-bold text-slate-400">
          Turn {state.turn}/8
        </Text>
        <Text className="text-sm font-bold text-indigo-400">
          {playerTurn ? "あなたのターン" : "相手のターン..."}
        </Text>
        <Text className="text-sm text-slate-500">山札: {state.deck.length}</Text>
      </View>

      <View className="border-b border-slate-700 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-bold text-slate-300">🤖 CPU</Text>
          <View
            className={`rounded-lg px-3 py-1 ${cpuCredits >= GRADUATION_CREDITS ? "bg-green-900" : "bg-slate-700"}`}
          >
            <Text className="text-sm font-bold text-slate-200">
              {cpuCredits} 単位
            </Text>
          </View>
        </View>
        <View className="mt-2 flex-row gap-1">
          {state.cpuHand.map((_, i) => (
            <View
              key={i}
              className="h-10 w-7 items-center justify-center rounded bg-red-900"
            >
              <Text className="text-xs">🃏</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-2">
        {state.log.map((entry, i) => (
          <Text key={i} className="mb-1 text-xs leading-5 text-slate-500">
            {entry}
          </Text>
        ))}
      </ScrollView>

      {selected && (
        <View className="border-t border-slate-700 bg-slate-800 px-4 py-3">
          <Text className="text-center text-lg font-bold text-white">
            {selected.emoji} {selected.name}
          </Text>
          <Text className="mt-1 text-center text-xs text-slate-400">
            {selected.description}
          </Text>
          <Text className="mt-1 text-center text-xs text-indigo-300">
            キープ: +{selected.keepValue}単位 ／ 使用:{" "}
            {selected.effectType === "attack"
              ? `相手 ${selected.effectValue}`
              : `+${selected.effectValue}`}
            単位
          </Text>
        </View>
      )}

      <View className="border-t border-slate-700 bg-slate-800 px-4 pb-8 pt-3">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="font-bold text-white">🧑‍🎓 あなた</Text>
          <View
            className={`rounded-lg px-3 py-1 ${playerCredits >= GRADUATION_CREDITS ? "bg-green-700" : "bg-indigo-900"}`}
          >
            <Text className="text-base font-black text-white">
              {playerCredits} 単位
            </Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pb-2"
        >
          {state.playerHand.map((card, i) => (
            <Pressable
              key={card.uid}
              className={`w-20 rounded-xl border-2 p-2 ${
                selectedCard === i
                  ? "border-yellow-400 bg-slate-600"
                  : "border-slate-600 bg-slate-700"
              } ${!canAct ? "opacity-50" : ""}`}
              onPress={() => {
                if (canAct) setSelectedCard(selectedCard === i ? null : i);
              }}
              disabled={!canAct}
            >
              <Text className="text-center text-2xl">{card.emoji}</Text>
              <Text
                className="mt-1 text-center text-xs font-bold text-white"
                numberOfLines={1}
              >
                {card.name}
              </Text>
              <Text className="mt-0.5 text-center text-xs text-indigo-300">
                {card.keepValue}単位
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {canAct && (
          <View className="mt-2 flex-row gap-3">
            <Pressable
              className={`flex-1 rounded-xl py-3 ${
                selectedCard !== null
                  ? "bg-orange-600 active:bg-orange-700"
                  : "bg-slate-600"
              }`}
              onPress={() => selectedCard !== null && handleUse(selectedCard)}
              disabled={selectedCard === null}
            >
              <Text className="text-center font-bold text-white">
                {selected ? `${selected.emoji} 使う` : "カードを選択"}
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-xl bg-slate-600 py-3 active:bg-slate-500"
              onPress={handlePass}
            >
              <Text className="text-center font-bold text-slate-300">
                パスする
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── 通信対戦画面 ──────────────────────────────────────────────────────────────
function OnlineGameScreen({
  gameId,
  playerId,
  opponentName,
}: {
  gameId: string;
  playerId: string;
  opponentName: string;
}) {
  const {
    game,
    isMyTurn,
    myHand,
    opponentHandCount,
    myCredits,
    opponentCredits,
    timeLeft,
    loading,
    submitAction,
  } = useOnlineGame(gameId, playerId);

  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  // ゲーム終了処理
  useEffect(() => {
    if (!game || game.status !== "ended") return;

    const isPlayer1 = playerId === game.player1Id;
    const myHand = isPlayer1 ? game.player1Hand : game.player2Hand;
    const opponentHand = isPlayer1 ? game.player2Hand : game.player1Hand;
    const myBonus = isPlayer1 ? game.player1BonusCredits : game.player2BonusCredits;
    const opponentBonus = isPlayer1 ? game.player2BonusCredits : game.player1BonusCredits;

    const myC = STARTING_CREDITS + myHand.reduce((s, c) => s + c.keepValue, 0) + myBonus;
    const oppC = STARTING_CREDITS + opponentHand.reduce((s, c) => s + c.keepValue, 0) + opponentBonus;

    setLastOnlineResult({
      myCredits: myC,
      opponentCredits: oppC,
      myName: "あなた",
      opponentName,
      won: game.winnerId === playerId,
      myGraduated: myC >= GRADUATION_CREDITS,
      opponentGraduated: oppC >= GRADUATION_CREDITS,
    });

    const t = setTimeout(() => router.replace("/result?mode=online"), 800);
    return () => clearTimeout(t);
  }, [game?.status]);

  if (loading || !game) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <Text className="text-slate-400">ゲームを読み込み中...</Text>
      </View>
    );
  }

  const selected = selectedCard !== null ? myHand[selectedCard] : null;
  const timerColor =
    timeLeft > 30 ? "text-slate-400" : timeLeft > 10 ? "text-yellow-400" : "text-red-400";

  return (
    <View className="flex-1 bg-slate-900">
      <StatusBar style="light" />

      {/* ヘッダー */}
      <View className="flex-row items-center justify-between bg-slate-800 px-4 pb-3 pt-14">
        <Text className="text-sm font-bold text-slate-400">
          Turn {game.currentTurn}/8
        </Text>
        <Text
          className={`text-sm font-bold ${isMyTurn ? "text-indigo-400" : "text-slate-500"}`}
        >
          {isMyTurn ? "あなたのターン" : "相手のターン..."}
        </Text>
        {isMyTurn && (
          <Text className={`text-sm font-bold ${timerColor}`}>
            ⏱ {timeLeft}s
          </Text>
        )}
        {!isMyTurn && <Text className="text-sm text-slate-600">待機中</Text>}
      </View>

      {/* 相手情報 */}
      <View className="border-b border-slate-700 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-bold text-slate-300">🎓 {opponentName}</Text>
          <View
            className={`rounded-lg px-3 py-1 ${opponentCredits >= GRADUATION_CREDITS ? "bg-green-900" : "bg-slate-700"}`}
          >
            <Text className="text-sm font-bold text-slate-200">
              {opponentCredits} 単位
            </Text>
          </View>
        </View>
        <View className="mt-2 flex-row gap-1">
          {Array.from({ length: opponentHandCount }).map((_, i) => (
            <View
              key={i}
              className="h-10 w-7 items-center justify-center rounded bg-red-900"
            >
              <Text className="text-xs">🃏</Text>
            </View>
          ))}
          {opponentHandCount === 0 && (
            <Text className="text-xs text-slate-600">手札なし</Text>
          )}
        </View>
      </View>

      {/* ログ */}
      <ScrollView className="flex-1 px-4 py-2">
        {game.log.map((entry, i) => (
          <Text key={i} className="mb-1 text-xs leading-5 text-slate-500">
            {entry}
          </Text>
        ))}
        {!isMyTurn && game.status === "playing" && (
          <Text className="mt-2 text-xs text-slate-600 italic">
            相手の行動を待っています...
          </Text>
        )}
      </ScrollView>

      {/* 選択カード詳細 */}
      {selected && (
        <View className="border-t border-slate-700 bg-slate-800 px-4 py-3">
          <Text className="text-center text-lg font-bold text-white">
            {selected.emoji} {selected.name}
          </Text>
          <Text className="mt-1 text-center text-xs text-slate-400">
            {selected.description}
          </Text>
          <Text className="mt-1 text-center text-xs text-indigo-300">
            キープ: +{selected.keepValue}単位 ／ 使用:{" "}
            {selected.effectType === "attack"
              ? `相手 ${selected.effectValue}`
              : `+${selected.effectValue}`}
            単位
          </Text>
        </View>
      )}

      {/* プレイヤーエリア */}
      <View className="border-t border-slate-700 bg-slate-800 px-4 pb-8 pt-3">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="font-bold text-white">🧑‍🎓 あなた</Text>
          <View
            className={`rounded-lg px-3 py-1 ${myCredits >= GRADUATION_CREDITS ? "bg-green-700" : "bg-indigo-900"}`}
          >
            <Text className="text-base font-black text-white">
              {myCredits} 単位
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pb-2"
        >
          {myHand.map((card, i) => (
            <Pressable
              key={`${card.uid}-${i}`}
              className={`w-20 rounded-xl border-2 p-2 ${
                selectedCard === i
                  ? "border-yellow-400 bg-slate-600"
                  : "border-slate-600 bg-slate-700"
              } ${!isMyTurn ? "opacity-50" : ""}`}
              onPress={() => {
                if (isMyTurn) setSelectedCard(selectedCard === i ? null : i);
              }}
              disabled={!isMyTurn}
            >
              <Text className="text-center text-2xl">{card.emoji}</Text>
              <Text
                className="mt-1 text-center text-xs font-bold text-white"
                numberOfLines={1}
              >
                {card.name}
              </Text>
              <Text className="mt-0.5 text-center text-xs text-indigo-300">
                {card.keepValue}単位
              </Text>
            </Pressable>
          ))}
          {myHand.length === 0 && isMyTurn && (
            <Text className="py-4 text-xs text-slate-600">
              カードをドローしています...
            </Text>
          )}
        </ScrollView>

        {isMyTurn && (
          <View className="mt-2 flex-row gap-3">
            <Pressable
              className={`flex-1 rounded-xl py-3 ${
                selectedCard !== null
                  ? "bg-orange-600 active:bg-orange-700"
                  : "bg-slate-600"
              }`}
              onPress={() => {
                if (selectedCard !== null) {
                  submitAction({ type: "use", cardIndex: selectedCard });
                  setSelectedCard(null);
                }
              }}
              disabled={selectedCard === null}
            >
              <Text className="text-center font-bold text-white">
                {selected ? `${selected.emoji} 使う` : "カードを選択"}
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-xl bg-slate-600 py-3 active:bg-slate-500"
              onPress={() => {
                submitAction({ type: "pass" });
                setSelectedCard(null);
              }}
            >
              <Text className="text-center font-bold text-slate-300">
                パスする
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── メインエクスポート ─────────────────────────────────────────────────────────
export default function GameScreen() {
  const { mode, gameId, playerId, opponentName } = useLocalSearchParams<{
    mode?: string;
    gameId?: string;
    playerId?: string;
    opponentName?: string;
  }>();

  if (mode === "online" && gameId && playerId) {
    return (
      <OnlineGameScreen
        gameId={gameId}
        playerId={playerId}
        opponentName={opponentName ?? "相手"}
      />
    );
  }

  return <CpuGameScreen />;
}
