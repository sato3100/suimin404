import { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { getLastResult, getLastOnlineResult } from "@/game/store";

// ─── スコアカード（各プレイヤーの最終単位表示） ──────────────────────────────
function ScoreCard({
  label,
  credits,
  graduated,
}: {
  label: string;
  credits: number;
  graduated: boolean;
}) {
  return (
    <View
      style={{
        width: "100%",
        maxWidth: 300,
        backgroundColor: "#1e293b",
        borderRadius: 16,
        padding: 20,
        borderWidth: graduated ? 2 : 0,
        borderColor: "#16a34a",
      }}
    >
      <Text style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <Text style={{ fontSize: 14, color: "#94a3b8" }}>最終取得 </Text>
        <Text
          style={{
            fontSize: 32,
            fontWeight: "900",
            color: graduated ? "#4ade80" : "#f87171",
          }}
        >
          {credits}
        </Text>
        <Text style={{ fontSize: 14, color: "#94a3b8" }}> 単位</Text>
      </View>
    </View>
  );
}

// ─── 結果表示コンテンツ（WIN/LOSE + スコア比較） ─────────────────────────────
function ResultContent({
  won,
  myCredits,
  opponentCredits,
  opponentLabel,
  myGraduated,
  opponentGraduated,
  resultPath,
}: {
  won: boolean;
  myCredits: number;
  opponentCredits: number;
  opponentLabel: string;
  myGraduated: boolean;
  opponentGraduated: boolean;
  resultPath: string;
}) {
  // 8秒後にLINE報告画面へ自動遷移
  useEffect(() => {
    const t = setTimeout(() => router.replace(resultPath as any), 8000);
    return () => clearTimeout(t);
  }, []);

  // アニメーション用の値
  const titleScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const card1Opacity = useSharedValue(0);
  const card2Opacity = useSharedValue(0);
  const hintOpacity = useSharedValue(0);

  // 段階的にフェードイン
  useEffect(() => {
    card1Opacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    titleOpacity.value = withDelay(500, withTiming(1, { duration: 200 }));
    titleScale.value = withDelay(
      500,
      withSequence(
        withTiming(1.3, { duration: 120, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 6, stiffness: 180 }),
      ),
    );
    card2Opacity.value = withDelay(800, withTiming(1, { duration: 300 }));
    hintOpacity.value = withDelay(1500, withTiming(1, { duration: 500 }));
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
    opacity: titleOpacity.value,
  }));
  const c1 = useAnimatedStyle(() => ({ opacity: card1Opacity.value }));
  const c2 = useAnimatedStyle(() => ({ opacity: card2Opacity.value }));
  const hint = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));

  return (
    <Pressable
      style={{ flex: 1, backgroundColor: "#0f172a" }}
      onPress={() => router.replace(resultPath as any)}
    >
      <StatusBar style="light" />
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
          gap: 20,
        }}
      >
        {/* 相手スコア */}
        <Animated.View style={c1}>
          <ScoreCard
            label={opponentLabel}
            credits={opponentCredits}
            graduated={opponentGraduated}
          />
        </Animated.View>

        {/* 勝敗タイトル */}
        <Animated.View style={titleStyle}>
          <Text
            style={{
              fontSize: 44,
              fontWeight: "900",
              color: won ? "#eab308" : "#64748b",
              textAlign: "center",
              textShadowColor: won ? "rgba(234,179,8,0.4)" : "transparent",
              textShadowRadius: 20,
            }}
          >
            {won ? "YOU WIN!" : "YOU LOSE..."}
          </Text>
        </Animated.View>

        {/* 自分スコア */}
        <Animated.View style={c2}>
          <ScoreCard
            label="🧑‍🎓 あなた"
            credits={myCredits}
            graduated={myGraduated}
          />
        </Animated.View>

        {/* タップヒント */}
        <Animated.View style={hint}>
          <Text style={{ color: "#475569", fontSize: 12, marginTop: 12 }}>
            タップでLINE報告へ
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

// ─── ルートコンポーネント（モードに応じたデータ取得） ─────────────────────────
export default function BattleResultScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  // 通信対戦モード
  if (mode === "online") {
    const result = getLastOnlineResult();
    if (!result) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" }}>
          <Pressable onPress={() => router.replace("/")}>
            <Text style={{ color: "#94a3b8" }}>タイトルに戻る</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <ResultContent
        won={result.won}
        myCredits={result.myCredits}
        opponentCredits={result.opponentCredits}
        opponentLabel={`🎓 ${result.opponentName}`}
        myGraduated={result.myGraduated}
        opponentGraduated={result.opponentGraduated}
        resultPath="/result?mode=online"
      />
    );
  }

  // CPU対戦モード
  const result = getLastResult();
  if (!result) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" }}>
        <Pressable onPress={() => router.replace("/")}>
          <Text style={{ color: "#94a3b8" }}>タイトルに戻る</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <ResultContent
      won={result.playerWon}
      myCredits={result.playerCredits}
      opponentCredits={result.cpuCredits}
      opponentLabel="🤖 CPU"
      myGraduated={result.playerGraduated}
      opponentGraduated={result.cpuGraduated}
      resultPath="/result"
    />
  );
}
