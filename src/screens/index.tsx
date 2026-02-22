import { useState, useCallback  } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  ImageBackground,
  Image,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSound } from "./_layout";

export default function TitleScreen() {
  const [showHelp, setShowHelp] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { playClickSound, playTitleBgm } = useSound();

  // ★ 追加: 画面が「フォーカスされた（表示された）」時にタイトルBGMを流す
  useFocusEffect(
    useCallback(() => {
      playTitleBgm();
    }, [])
  );

  const handleStart = async () => {
    await playClickSound();
    router.push("/name");
  };

  const handleHelp = async () => {
    await playClickSound();
    setShowHelp(true);
  };

  // 画像サイズ（見た目）
  const logoW = width * 0.88;
  const logoH = logoW * 0.6;

  const startImgW = width * 0.75;
  const startImgH = startImgW; // ここは画像比率に合わせて調整してOK

  // 当たり判定（見た目は変えずに小さく）
  const startHitW = startImgW * 0.65;
  const startHitH = startImgH * 0.35;

  return (
    <ImageBackground
      source={require("@/assets/images/game/bg-dark.png")}
      className="flex-1"
      resizeMode="cover"
      style={{ backgroundColor: "#1a1008" }}
    >
      <StatusBar style="light" />

      {/* ロゴを中心に、下に「対戦開始」を配置 */}
      <View
        className="flex-1 items-center px-8"
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          justifyContent: "center",
        }}
      >
        {/* ロゴ */}
        <Image
          source={require("@/assets/images/game/title-logo.png")}
          style={{
            width: logoW,
            height: logoH,
            borderRadius: 16,
          }}
          resizeMode="cover"
        />

        {/* ロゴとボタンの距離（ここを変える） */}
        <View style={{ height: 20 }} />

        {/* スタートボタン：見た目は大きいまま / 当たり判定だけ小さく */}
        <View
          style={{
            width: startImgW,
            height: startImgH,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* 見た目 */}
          <Image

            source={require("@/assets/images/game/title-start.png")}
            style={{ width: startImgW, height: startImgH }}
            resizeMode="contain"
          />

          {/* 当たり判定 */}
          <Pressable
            onPress={handleStart}
            style={{
              position: "absolute",
              left: 0,
              top: 100,
              right: 0,
              bottom: 0,
              zIndex: 999,
              elevation: 999,
            }}
          />
        </View>
      </View>

      {/* ヘルプボタン */}
      <Pressable
        onPress={handleHelp}
        className="absolute right-5 w-11 h-11 rounded-full items-center justify-center"
        style={{
          bottom: insets.bottom + 16,
          backgroundColor: "rgba(0,0,0,0.5)",
          borderWidth: 1,
          borderColor: "#A08050",
        }}
      >
        <Text style={{ color: "#F5E6C8", fontSize: 20 }} className="font-black">
          ?
        </Text>
      </Pressable>

      {/* ルールモーダル */}
      <Modal visible={showHelp} transparent animationType="fade">
        <Pressable
          className="flex-1 justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onPress={() => setShowHelp(false)}
        >
          <Pressable
            className="rounded-2xl p-6"
            style={{
              backgroundColor: "#2A1F14",
              borderWidth: 2,
              borderColor: "#A08050",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              className="text-center font-black mb-4"
              style={{ fontSize: 18, color: "#F5E6C8" }}
            >
              ゲームのルール
            </Text>
            <ScrollView>
              {[
                "カードをキープ → 単位として加算",
                "カードを使用 → 効果を発動",
                "124単位ピッタリで伝説の省エネ卒業！",
                "初期24単位 + カードで100単位集めよう",
                "全10ターン / CPU or 通信対戦",
              ].map((t, i) => (
                <Text
                  key={i}
                  className="mb-2"
                  style={{ fontSize: 14, color: "#D4C4A0", lineHeight: 22 }}
                >
                  {t}
                </Text>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setShowHelp(false)}
              className="rounded-lg py-2.5 mt-2"
              style={{ backgroundColor: "#A08050" }}
            >
              <Text className="text-center font-bold" style={{ color: "#1a1a1a" }}>
                閉じる
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ImageBackground>
  );
}