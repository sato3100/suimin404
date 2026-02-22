import { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ImageBackground,
  Image,
} from "react-native";
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

const BG = require("@/assets/images/game/bg-parchment.png");

// 結果画像素材
const IMG_GRADUATE_WIN = require("@/assets/images/対戦終了_卒業_勝利.png");
const IMG_GRADUATE_LOSE = require("@/assets/images/対戦終了_卒業＿敗北.png");
const IMG_REPEAT_WIN = require("@/assets/images/対戦終了_留年_勝利.png");
const IMG_REPEAT_LOSE = require("@/assets/images/対戦終了_留年_敗北.png");

// ─── 結果画像選択 ───────────────────────────────────────────────────────────
function getResultImage(credits: number, won: boolean) {
  if (credits >= 100) {
    return won ? IMG_GRADUATE_WIN : IMG_GRADUATE_LOSE;
  }
  if (credits >= 76) {
    return won ? IMG_REPEAT_WIN : IMG_REPEAT_LOSE;
  }
  // 中退（76未満）は留年_敗北画像を使用
  return IMG_REPEAT_LOSE;
}

// ─── エンディングラベル判定 ──────────────────────────────────────────────────
function getEndingLabel(credits: number): string {
  if (credits === 100) return "伝説の省エネ卒業";
  if (credits >= 107) return "ガリ勉";
  if (credits >= 100) return "卒業";
  if (credits >= 76) return "留年";
  return "中退";
}

// ─── 結果表示コンテンツ ─────────────────────────────────────────────────────
function ResultContent({
  won,
  myCredits,
  opponentCredits,
  opponentLabel,
  myGraduated,
  opponentGraduated,
  endingLabel,
  resultPath,
}: {
  won: boolean;
  myCredits: number;
  opponentCredits: number;
  opponentLabel: string;
  myGraduated: boolean;
  opponentGraduated: boolean;
  endingLabel: string;
  resultPath: string;
}) {
  const resultImage = getResultImage(myCredits, won);

  // 8秒後にLINE報告画面へ自動遷移
  useEffect(() => {
    const t = setTimeout(() => router.replace(resultPath as any), 8000);
    return () => clearTimeout(t);
  }, []);

  // アニメーション用の値
  const imgScale = useSharedValue(0);
  const imgOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const hintOpacity = useSharedValue(0);

  useEffect(() => {
    imgOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    imgScale.value = withDelay(
      200,
      withSequence(
        withTiming(1.1, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 8, stiffness: 180 }),
      ),
    );
    textOpacity.value = withDelay(600, withTiming(1, { duration: 300 }));
    hintOpacity.value = withDelay(1500, withTiming(1, { duration: 500 }));
  }, []);

  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imgScale.value }],
    opacity: imgOpacity.value,
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));

  // 中退の場合は画像の上にテキストオーバーレイ
  const isDropout = myCredits < 94;

  return (
    <Pressable
      className="flex-1"
      onPress={() => router.replace(resultPath as any)}
    >
      <ImageBackground source={BG} className="flex-1" resizeMode="cover" style={{ backgroundColor: "#8B7355" }}>
        <StatusBar style="light" />

        {/* 結果画像: 上78%を占有 */}
        <Animated.View style={[{ flex: 0.78, width: "100%" }, imgStyle]}>
          <Image
            source={resultImage}
            style={{ flex: 1, width: "100%" }}
            resizeMode="contain"
          />
          {/* 中退の場合のオーバーレイテキスト */}
          {isDropout && (
            <View
              className="absolute items-center justify-center"
              style={{ top: 0, left: 0, right: 0, bottom: 0 }}
            >
              <Text
                className="font-black"
                style={{
                  fontSize: 36,
                  color: "#fff",
                  textShadowColor: "rgba(0,0,0,0.8)",
                  textShadowRadius: 8,
                  textShadowOffset: { width: 2, height: 2 },
                }}
              >
                中退
              </Text>
            </View>
          )}
        </Animated.View>

        {/* テキスト情報: 下22% */}
        <View style={{ flex: 0.22, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}>
          {/* エンディング + 勝敗テキスト */}
          <Animated.View className="items-center" style={textStyle}>
            <Text
              className="font-black text-center"
              style={{
                fontSize: 38,
                color: "#2a1a0a",
                textShadowColor: "rgba(160,128,80,0.3)",
                textShadowRadius: 12,
              }}
            >
              {endingLabel}
            </Text>
            <Text
              className="font-black text-center mt-1"
              style={{
                fontSize: 22,
                color: won ? "#A08050" : "#8B7355",
              }}
            >
              {won ? "YOU WIN!" : "YOU LOSE..."}
            </Text>
          </Animated.View>

          {/* スコア表示 */}
          <Animated.View className="items-center mt-2" style={textStyle}>
            <Text style={{ fontSize: 13, color: "#5a4020" }}>
              {opponentLabel}: {opponentCredits}単位 / あなた: {myCredits}単位
            </Text>
          </Animated.View>

          {/* タップヒント */}
          <Animated.View style={hintStyle}>
            <Text className="mt-3" style={{ color: "#8B7355", fontSize: 13 }}>
              タップでLINE報告へ
            </Text>
          </Animated.View>
        </View>
      </ImageBackground>
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
        <ImageBackground source={BG} className="flex-1 items-center justify-center" style={{ backgroundColor: "#8B7355" }}>
          <Pressable onPress={() => router.replace("/")} className="rounded-xl px-8 py-4" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
            <Text style={{ color: "#F5E6C8", fontSize: 18, fontWeight: "bold" }}>タイトルに戻る</Text>
          </Pressable>
        </ImageBackground>
      );
    }
    return (
      <ResultContent
        won={result.won}
        myCredits={result.myCredits}
        opponentCredits={result.opponentCredits}
        opponentLabel={result.opponentName}
        myGraduated={result.myGraduated}
        opponentGraduated={result.opponentGraduated}
        endingLabel={getEndingLabel(result.myCredits)}
        resultPath="/result?mode=online"
      />
    );
  }

  // CPU対戦モード
  const result = getLastResult();
  if (!result) {
    return (
      <ImageBackground source={BG} className="flex-1 items-center justify-center" style={{ backgroundColor: "#8B7355" }}>
        <Pressable onPress={() => router.replace("/")} className="rounded-xl px-8 py-4" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <Text style={{ color: "#F5E6C8", fontSize: 18, fontWeight: "bold" }}>タイトルに戻る</Text>
        </Pressable>
      </ImageBackground>
    );
  }
  return (
    <ResultContent
      won={result.playerWon}
      myCredits={result.playerCredits}
      opponentCredits={result.cpuCredits}
      opponentLabel="CPU"
      myGraduated={result.playerGraduated}
      opponentGraduated={result.cpuGraduated}
      endingLabel={getEndingLabel(result.playerCredits)}
      resultPath="/result"
    />
  );
}
