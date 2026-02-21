import { useEffect, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useMatchmaking } from "@/hooks/useMatchmaking";

// ─── アバター（丸頭 + アーチ型ボディのシルエット） ──────────────────────────
function Avatar({ color }: { color: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: color }}
      />
      <View
        style={{
          width: 70,
          height: 42,
          borderTopLeftRadius: 35,
          borderTopRightRadius: 35,
          backgroundColor: color,
          marginTop: 3,
        }}
      />
    </View>
  );
}

// ─── マッチング画面 ─────────────────────────────────────────────────────────
export default function MatchingScreen() {
  const { name, mode } = useLocalSearchParams<{ name: string; mode?: string }>();
  const isCpu = mode === "cpu";
  const hasNavigated = useRef(false);

  // アニメーション値（横スライドイン + VS登場）
  const opponentX = useSharedValue(400);
  const opponentOpacity = useSharedValue(0);
  const selfX = useSharedValue(-400);
  const selfOpacity = useSharedValue(0);
  const vsScale = useSharedValue(0);
  const vsOpacity = useSharedValue(0);
  const infoOpacity = useSharedValue(0);
  const pulse = useSharedValue(1);
  const lineWidth = useSharedValue(0);

  // CPU対戦：ゲーム画面へ遷移
  function navigateToGame() {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.replace({ pathname: "/game", params: { mode: "cpu", playerName: name } });
  }

  // スライドインアニメーション開始
  useEffect(() => {
    // 相手: 右からスライドイン
    opponentX.value = withSpring(0, { damping: 14, stiffness: 90 });
    opponentOpacity.value = withTiming(1, { duration: 200 });

    // 自分: 左からスライドイン（200ms遅延）
    selfX.value = withDelay(200, withSpring(0, { damping: 14, stiffness: 90 }));
    selfOpacity.value = withDelay(200, withTiming(1, { duration: 200 }));

    // 斜め線: 350ms後にフェードイン
    lineWidth.value = withDelay(350, withTiming(1, { duration: 200 }));

    // VS: 450ms後にバウンス登場
    vsOpacity.value = withDelay(450, withTiming(1, { duration: 80 }));
    vsScale.value = withDelay(
      450,
      withSequence(
        withTiming(1.5, { duration: 80, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 5, stiffness: 200 }),
      ),
    );

    // 名前タグ: 650ms後にフェードイン
    infoOpacity.value = withDelay(650, withTiming(1, { duration: 300 }));

    // パルスアニメーション（1.4秒後に開始）
    setTimeout(() => {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 800, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    }, 1400);
  }, []);

  // CPU対戦: 2.5秒後に自動遷移
  useEffect(() => {
    if (!isCpu) return;
    const t = setTimeout(navigateToGame, 2500);
    return () => clearTimeout(t);
  }, [isCpu]);

  // 通信対戦: マッチメイキング開始
  const { state, startMatchmaking, cancel } = useMatchmaking(isCpu ? "" : (name ?? ""));

  useEffect(() => {
    if (isCpu) return;
    startMatchmaking();
  }, []);

  // 通信対戦: マッチ成立時にゲーム画面へ遷移
  useEffect(() => {
    if (isCpu) return;
    if (state.status === "ready" && state.gameId && state.userId && state.lobby) {
      const oppName =
        state.lobby.player1.userId === state.userId
          ? (state.lobby.player2?.name ?? "相手")
          : state.lobby.player1.name;
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      router.replace({
        pathname: "/game",
        params: {
          mode: "online",
          gameId: state.gameId,
          playerId: state.userId,
          opponentName: oppName,
        },
      });
    }
  }, [state.status, state.gameId]);

  // 相手情報の取得
  const opponentInfo = isCpu
    ? { name: "CPU", rating: 1000 }
    : (() => {
        if (!state.userId || !state.lobby) return null;
        const isP1 = state.lobby.player1.userId === state.userId;
        if (isP1 && state.lobby.player2) return state.lobby.player2;
        if (!isP1) return state.lobby.player1;
        return null;
      })();

  // アニメーションスタイル
  const opponentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: opponentX.value }],
    opacity: opponentOpacity.value,
  }));
  const selfStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: selfX.value }],
    opacity: selfOpacity.value,
  }));
  const vsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: vsScale.value * pulse.value }],
    opacity: vsOpacity.value,
  }));
  const infoStyle = useAnimatedStyle(() => ({ opacity: infoOpacity.value }));
  const lineStyle = useAnimatedStyle(() => ({ opacity: lineWidth.value }));

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <StatusBar style="light" />

      {/* 上半分: 相手（右からスライドイン） */}
      <View style={{ flex: 1, justifyContent: "center", alignItems: "flex-end", paddingRight: 40, paddingTop: 60 }}>
        <Animated.View style={[{ alignItems: "center" }, opponentStyle]}>
          <Avatar color="#475569" />
        </Animated.View>
        <Animated.View style={[{ marginTop: 12 }, infoStyle]}>
          <View style={{ backgroundColor: "#334155", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              {opponentInfo?.name ?? "検索中..."}
            </Text>
            <Text style={{ color: "#fbbf24", fontSize: 12, marginTop: 2 }}>
              Rate {opponentInfo?.rating ?? "---"}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* 中央: 斜め線 + VS */}
      <View style={{ height: 80, justifyContent: "center", alignItems: "center" }}>
        <Animated.View
          style={[
            {
              position: "absolute",
              width: "120%",
              height: 3,
              backgroundColor: "#dc2626",
              transform: [{ rotate: "-8deg" }],
            },
            lineStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: "#dc2626",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#dc2626",
              shadowOpacity: 0.6,
              shadowRadius: 16,
              elevation: 10,
              borderWidth: 3,
              borderColor: "#fca5a5",
            },
            vsStyle,
          ]}
        >
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22, letterSpacing: 2 }}>
            VS
          </Text>
        </Animated.View>
      </View>

      {/* 下半分: 自分（左からスライドイン） */}
      <View style={{ flex: 1, justifyContent: "center", alignItems: "flex-start", paddingLeft: 40, paddingBottom: 20 }}>
        <Animated.View style={[{ alignItems: "center" }, selfStyle]}>
          <Avatar color="#3b82f6" />
        </Animated.View>
        <Animated.View style={[{ marginTop: 12 }, infoStyle]}>
          <View style={{ backgroundColor: "#334155", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              {name ?? "あなた"}
            </Text>
            <Text style={{ color: "#fbbf24", fontSize: 12, marginTop: 2 }}>
              Rate 1000
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* ステータス + キャンセル */}
      <Animated.View style={[{ paddingBottom: 56, alignItems: "center" }, infoStyle]}>
        <Text style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
          {isCpu
            ? "CPU対戦を準備中..."
            : opponentInfo
              ? "対戦開始を待っています..."
              : "マッチング中..."}
        </Text>
        {!isCpu && (
          <Pressable
            style={{
              borderWidth: 1,
              borderColor: "#475569",
              borderRadius: 20,
              paddingHorizontal: 28,
              paddingVertical: 10,
            }}
            onPress={() => {
              cancel();
              router.back();
            }}
          >
            <Text style={{ color: "#64748b", fontSize: 14 }}>キャンセル</Text>
          </Pressable>
        )}
        {!isCpu && state.status === "error" && (
          <Text style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>
            {state.errorMessage}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}
