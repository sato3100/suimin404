import { useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMatchmaking } from "@/hooks/useMatchmaking";

export default function MatchingScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { state, startMatchmaking, cancel } = useMatchmaking(name ?? "");

  useEffect(() => {
    startMatchmaking();
  }, []);

  // ゲーム準備完了 → ゲーム画面へ
  useEffect(() => {
    if (state.status === "ready" && state.gameId && state.userId && state.lobby) {
      const opponentName =
        state.lobby.player1.userId === state.userId
          ? (state.lobby.player2?.name ?? "相手")
          : state.lobby.player1.name;

      router.replace({
        pathname: "/game",
        params: {
          mode: "online",
          gameId: state.gameId,
          playerId: state.userId,
          opponentName,
        },
      });
    }
  }, [state.status, state.gameId]);

  const opponent =
    state.lobby?.player2 &&
    state.lobby.player2.userId !== state.userId
      ? state.lobby.player2
      : state.lobby?.player1.userId !== state.userId
        ? state.lobby?.player1
        : null;

  const opponentToShow =
    state.lobby?.player2 &&
    state.lobby.player1.userId === state.userId
      ? state.lobby.player2
      : state.lobby?.player2?.userId === state.userId
        ? state.lobby.player1
        : null;

  return (
    <View className="flex-1 items-center justify-center bg-slate-900 px-6">
      <StatusBar style="light" />

      <Text className="mb-2 text-5xl">🎓</Text>
      <Text className="mb-8 text-2xl font-black text-orange-400">
        対戦相手を探しています...
      </Text>

      {/* 自分の情報 */}
      <View className="mb-6 w-full max-w-xs rounded-2xl bg-slate-800 p-5">
        <Text className="mb-1 text-xs text-slate-500">あなた</Text>
        <Text className="text-xl font-bold text-white">🧑‍🎓 {name}</Text>
        <Text className="mt-1 text-sm text-indigo-400">レート: 1000</Text>
      </View>

      {/* VS 表示 */}
      {opponentToShow ? (
        <>
          <Text className="mb-4 text-2xl font-black text-slate-400">VS</Text>
          <View className="mb-6 w-full max-w-xs rounded-2xl bg-slate-700 p-5">
            <Text className="mb-1 text-xs text-slate-500">対戦相手</Text>
            <Text className="text-xl font-bold text-white">
              🎓 {opponentToShow.name}
            </Text>
            <Text className="mt-1 text-sm text-yellow-400">
              レート: {opponentToShow.rating}
            </Text>
          </View>
          <View className="mb-6 flex-row items-center gap-2">
            <ActivityIndicator color="#6366f1" />
            <Text className="text-slate-400">
              {state.status === "starting"
                ? "ゲームを準備中..."
                : "対戦開始を待っています..."}
            </Text>
          </View>
        </>
      ) : (
        <View className="mb-8 flex-row items-center gap-3">
          <ActivityIndicator size="large" color="#6366f1" />
          <Text className="text-slate-400">マッチング中...</Text>
        </View>
      )}

      {state.status === "error" && (
        <Text className="mb-4 text-red-400">{state.errorMessage}</Text>
      )}

      <Pressable
        className="mt-4 rounded-full border border-slate-600 px-8 py-3 active:bg-slate-800"
        onPress={() => {
          cancel();
          router.back();
        }}
      >
        <Text className="text-slate-400">キャンセル</Text>
      </Pressable>
    </View>
  );
}
