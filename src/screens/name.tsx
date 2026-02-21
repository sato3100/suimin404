import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import ChalkboardButton from "@/components/ChalkboardButton";

type Mode = "cpu" | "online";

export default function NameScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("cpu");

  const isValid = name.trim().length > 0;

  const handleStart = () => {
    if (!isValid) return;
    router.push({
      pathname: "/matching",
      params: { name: name.trim(), mode },
    });
  };

  return (
    <LinearGradient colors={["#FEFCE8", "#FEF08A"]} style={{ flex: 1 }}>
      <StatusBar style="dark" />

      {/* 戻るボタン（左上に固定表示） */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          zIndex: 10,
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 6,
          paddingHorizontal: 8,
          borderRadius: 20,
          backgroundColor: "rgba(0,0,0,0.06)",
        }}
      >
        <Text style={{ fontSize: 18, color: "#15803d", fontWeight: "600" }}>
          ‹
        </Text>
        <Text style={{ fontSize: 14, color: "#15803d", fontWeight: "600", marginLeft: 2 }}>
          戻る
        </Text>
      </Pressable>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "900",
              color: "#111827",
              marginBottom: 32,
            }}
          >
            プレイヤー情報
          </Text>

          {/* 名前入力 */}
          <View style={{ width: "100%", maxWidth: 320, marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#374151",
                marginBottom: 8,
              }}
            >
              プレイヤー名
            </Text>
            <TextInput
              style={{
                borderWidth: 2,
                borderColor: "#15803d",
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.7)",
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: "#111827",
              }}
              placeholder="名前を入力（最大10文字）"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={(t) => setName(t.slice(0, 10))}
              returnKeyType="go"
              onSubmitEditing={handleStart}
              autoFocus
            />
          </View>

          {/* モード選択トグル */}
          <View style={{ width: "100%", maxWidth: 320, marginBottom: 32 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#374151",
                marginBottom: 8,
              }}
            >
              対戦モード
            </Text>
            <View
              style={{
                flexDirection: "row",
                borderRadius: 12,
                borderWidth: 2,
                borderColor: "#15803d",
                overflow: "hidden",
              }}
            >
              <Pressable
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: "center",
                  backgroundColor: mode === "cpu" ? "#15803d" : "rgba(255,255,255,0.7)",
                }}
                onPress={() => setMode("cpu")}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    color: mode === "cpu" ? "#fff" : "#374151",
                    fontSize: 14,
                  }}
                >
                  🤖 CPU対戦
                </Text>
              </Pressable>
              <Pressable
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: "center",
                  backgroundColor: mode === "online" ? "#15803d" : "rgba(255,255,255,0.7)",
                }}
                onPress={() => setMode("online")}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    color: mode === "online" ? "#fff" : "#374151",
                    fontSize: 14,
                  }}
                >
                  👥 通信対戦
                </Text>
              </Pressable>
            </View>
          </View>

          {/* スタートボタン */}
          <ChalkboardButton
            label="対戦開始！"
            onPress={handleStart}
            disabled={!isValid}
          />
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
