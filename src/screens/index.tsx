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

  return (
    <ImageBackground
      source={require("@/assets/images/game/bg-dark.png")}
      className="flex-1"
      resizeMode="cover"
      style={{ backgroundColor: "#1a1008" }}
    >
      <StatusBar style="light" />

      <View className="flex-1 items-center px-8">
        {/* タイトルロゴ（中央） */}
        <View className="flex-1 items-center justify-center">
          <Image
            source={require("@/assets/images/game/title-logo.jpg")}
            style={{
              width: width * 0.88,
              height: width * 0.88 * 0.6,
              borderRadius: 16,
            }}
            resizeMode="cover"
          />
        </View>

        {/* スタートボタン（start-button.png 画像のみ） */}
        <Pressable
          onPress={handleStart}
          className="mb-16"
          style={({ pressed }) => ({
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}
        >
          <Image
            source={require("@/assets/images/game/start-button.png")}
            style={{ width: width * 0.75 * 4, height: width * 0.75 * 0.28 * 4}}
            resizeMode="contain"
          />
        </Pressable>
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
            style={{ backgroundColor: "#2A1F14", borderWidth: 2, borderColor: "#A08050" }}
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
