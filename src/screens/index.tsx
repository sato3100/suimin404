import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import ChalkboardButton from "@/components/ChalkboardButton";
import { useSound } from "./_layout";

export default function TitleScreen() {
  const [showHelp, setShowHelp] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require("@/assets/images/game/bg-dark.png")}
      className="flex-1"
      resizeMode="cover"
    >
      <StatusBar style="light" />

      <View className="flex-1 items-center justify-center px-8">
        {/* タイトル */}
        <Text
          className="text-center font-black mb-1"
          style={{
            fontSize: 26,
            color: "#F5E6C8",
            textShadowColor: "rgba(0,0,0,0.9)",
            textShadowOffset: { width: 1, height: 2 },
            textShadowRadius: 8,
          }}
        >
          卒業チキンレース
        </Text>

        {/* サブタイトル */}
        <Text
          className="text-center mb-12"
          style={{
            fontSize: 13,
            color: "#D4C4A0",
            letterSpacing: 1,
            textShadowColor: "rgba(0,0,0,0.9)",
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 4,
          }}
        >
          ～ 目指せ！省エネ124単位 ～
        </Text>

        {/* スタートボタン */}
        <ChalkboardButton
          label="4年生スタート"
          onPress={() => router.push("/name")}
        />

        {/* 補足テキスト */}
        <Text style={{ marginTop: 24, fontSize: 12, color: "#6b7280" }}>
          全8ターン / 約2分 / CPU or 通信対戦
        </Text>
      </View>

      {/* ヘルプボタン */}
      <Pressable
        onPress={() => setShowHelp(true)}
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
              style={{
                backgroundColor: "#15803d",
                borderRadius: 8,
                paddingVertical: 10,
              }}
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
