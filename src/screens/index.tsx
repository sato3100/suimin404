import { useState, useCallback } from "react"; // ★ useCallback を追加
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router"; // ★ useFocusEffect を追加
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSound } from "./_layout";
import ChalkboardButton from "@/components/ChalkboardButton";

export default function TitleScreen() {
  const [showHelp, setShowHelp] = useState(false);

  // ★ Contextから playClickSound をもらう
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

  const handleOpenHelp = async () => {
    await playClickSound();
    setShowHelp(true);
  };

  return (
    <LinearGradient colors={["#FEFCE8", "#FEF08A"]} style={{ flex: 1 }}>
      <StatusBar style="dark" />

      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        {/* サブタイトル */}
        <Text
          style={{
            fontSize: 14,
            color: "#374151",
            marginBottom: 4,
            letterSpacing: 2,
          }}
        >
          ～目指せ！省エネ124単位～
        </Text>

        {/* タイトル */}
        <Text
          style={{
            fontSize: 42,
            fontWeight: "900",
            color: "#111827",
            marginBottom: 2,
            textAlign: "center",
            lineHeight: 52,
          }}
        >
          卒業
        </Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "900",
            color: "#111827",
            marginBottom: 40,
            textAlign: "center",
          }}
        >
          チキンレース
        </Text>

        {/* スタートボタン */}
        <ChalkboardButton
          label="4年生スタート"
          onPress={handleStart}
        />

        {/* 補足テキスト */}
        <Text style={{ marginTop: 24, fontSize: 12, color: "#6b7280" }}>
          全8ターン / 約2分 / CPU or 通信対戦
        </Text>
      </View>

      {/* ヘルプボタン（右下の丸ボタン） */}
      <Pressable
        onPress={handleOpenHelp}
        style={{
          position: "absolute",
          bottom: 48,
          right: 24,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "#15803d",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900" }}>?</Text>
      </Pressable>

      {/* ルール説明モーダル */}
      <Modal visible={showHelp} transparent animationType="fade">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 24,
          }}
          onPress={() => setShowHelp(false)}
        >
          <Pressable
            style={{ backgroundColor: "#fff", borderRadius: 16, padding: 24 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: "#111827",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              ゲームのルール
            </Text>
            <ScrollView>
              <Text style={{ fontSize: 14, color: "#374151", lineHeight: 22, marginBottom: 8 }}>
                📚 カードをキープ → 単位として加算
              </Text>
              <Text style={{ fontSize: 14, color: "#374151", lineHeight: 22, marginBottom: 8 }}>
                ⚔️ カードを使用 → 相手を妨害 or 自分UP
              </Text>
              <Text style={{ fontSize: 14, color: "#374151", lineHeight: 22, marginBottom: 8 }}>
                🎯 124単位ピッタリで伝説の省エネ卒業！
              </Text>
              <Text style={{ fontSize: 14, color: "#374151", lineHeight: 22, marginBottom: 16 }}>
                💡 初期単位94 + カードで積み上げよう
              </Text>
            </ScrollView>
            <Pressable
              onPress={() => {
                playClickSound();
                setShowHelp(false);
              }}
              style={{
                backgroundColor: "#15803d",
                borderRadius: 8,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
                閉じる
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}
