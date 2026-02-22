import { useEffect } from "react";
import { Text, Pressable, ImageBackground } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { getLastResult, getLastOnlineResult } from "@/game/store";
import { useSound } from "./_layout";

// 結果画像素材（テキスト・フレームすべて画像に焼き込み済み）
const IMG_GRADUATE_WIN = require("@/assets/images/対戦終了_卒業_勝利.png");
const IMG_GRADUATE_LOSE = require("@/assets/images/対戦終了_卒業_敗北.png");
const IMG_REPEAT_WIN = require("@/assets/images/対戦終了_留年_勝利.png");
const IMG_REPEAT_LOSE = require("@/assets/images/対戦終了_留年_敗北.png");

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

// ─── 結果表示コンテンツ ─────────────────────────────────────────────────────
function ResultContent({
  won,
  myCredits,
  opponentCredits,
  opponentLabel,
  resultPath,
}: {
  won: boolean;
  myCredits: number;
  opponentCredits: number;
  opponentLabel: string;
  resultPath: string;
}) {
  const resultImage = getResultImage(myCredits, won);
  const { playWinBgm, playLoseBgm } = useSound();

  useEffect(() => {
    if (won) playWinBgm();
    else playLoseBgm();
    // 8秒後にLINE報告画面へ自動遷移
    const t = setTimeout(() => router.replace(resultPath as any), 8000);
    return () => clearTimeout(t);
  }, []);

  const textOpacity = useSharedValue(0);
  const hintOpacity = useSharedValue(0);

  useEffect(() => {
    textOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
    hintOpacity.value = withDelay(2000, withTiming(1, { duration: 600 }));
  }, []);

  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));

  // 勝利=暗褐色、敗北=青みがかった暗色
  const scoreColor = won ? "#5a3a10" : "#2a4a6a";

  return (
    <Pressable style={{ flex: 1 }} onPress={() => router.replace(resultPath as any)}>
      <ImageBackground source={resultImage} style={{ flex: 1 }} resizeMode="stretch">
        <StatusBar style={won ? "dark" : "light"} />

        {/* 敗北時: 上部中央「相手の名前」フレームに実名を表示 */}
        {!won && (
          <Animated.View
            style={[
              { position: "absolute", top: "8%", left: 0, right: 0, alignItems: "center" },
              textStyle,
            ]}
          >
            <Text style={{ color: "#8ab8d8", fontSize: 15, fontWeight: "bold" }}>
              {opponentLabel}
            </Text>
          </Animated.View>
        )}

        {/* 勝利時: 上部左「最終取得」フレームに自分のスコア */}
        {won && (
          <Animated.View
            style={[
              { position: "absolute", top: "29%", left: "9%" },
              textStyle,
            ]}
          >
            <Text style={{ color: scoreColor, fontSize: 14, fontWeight: "600" }}>
              あなた: {myCredits}単位
            </Text>
          </Animated.View>
        )}

        {/* 下部「最終取得」フレームにスコア表示 */}
        {/* 勝利=相手のスコア / 敗北=自分のスコア */}
        <Animated.View
          style={[
            { position: "absolute", bottom: "12%", left: "9%" },
            textStyle,
          ]}
        >
          <Text style={{ color: scoreColor, fontSize: 14, fontWeight: "600" }}>
            {won
              ? `${opponentLabel}: ${opponentCredits}単位`
              : `あなた: ${myCredits}単位`}
          </Text>
        </Animated.View>

        {/* タップヒント */}
        <Animated.View
          style={[
            { position: "absolute", bottom: "3%", left: 0, right: 0, alignItems: "center" },
            hintStyle,
          ]}
        >
          <Text style={{ color: won ? "#8B7355" : "#5070A0", fontSize: 12 }}>
            タップでLINE報告へ
          </Text>
        </Animated.View>
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
        <ImageBackground
          source={IMG_REPEAT_LOSE}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          resizeMode="stretch"
        >
          <Pressable
            onPress={() => router.replace("/")}
            style={{ backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 12, paddingHorizontal: 32, paddingVertical: 16 }}
          >
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
        resultPath="/result?mode=online"
      />
    );
  }

  // CPU対戦モード
  const result = getLastResult();
  if (!result) {
    return (
      <ImageBackground
        source={IMG_REPEAT_LOSE}
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        resizeMode="stretch"
      >
        <Pressable
          onPress={() => router.replace("/")}
          style={{ backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 12, paddingHorizontal: 32, paddingVertical: 16 }}
        >
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
      resultPath="/result"
    />
  );
}
