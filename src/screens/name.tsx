import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ImageBackground,
  Image,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSound } from "./_layout";

type Mode = "cpu" | "online";

export default function NameScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("cpu");
  const { playClickSound } = useSound();
  const isValid = name.trim().length > 0;

  const handleStart = async () => {
    if (!isValid) return;
    await playClickSound();
    router.push({ pathname: "/matching", params: { name: name.trim(), mode } });
  };

  const inputW = width * 0.82;

  return (
    <ImageBackground
      source={require("@/assets/images/game/bg-parchment.png")}
      className="flex-1"
      resizeMode="cover"
      style={{ backgroundColor: "#8B7355" }}
    >
      <StatusBar style="light" />

      {/* 戻るボタン */}
      <Pressable
        onPress={async () => {
          await playClickSound();
          router.back();
        }}
        hitSlop={16}
        className="absolute left-4 z-10 flex-row items-center px-3 py-2 rounded-full"
        style={{ top: insets.top + 8, backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <Text style={{ fontSize: 15, color: "#F5E6C8" }} className="font-bold">
          ‹ 戻る
        </Text>
      </Pressable>

      {/* ここから本体：KeyboardAvoidingView を削除 */}
      <View
        className="flex-1 items-center px-6"
        style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }}
      >
        {/* 上側ブロック（中央寄せ） */}
        <View className="flex-1 items-center justify-center">
          {/* 名前入力フレーム */}
          <View
            className="items-center justify-center"
            style={{ width: inputW, aspectRatio: 2.6 }}
          >
            <Image

              source={require("@/assets/images/game/turn-badge.png")}
              className="absolute w-full h-full"
              resizeMode="contain"
            />
            <TextInput
              className="text-center font-bold"
              style={{
                width: "62%",
                fontSize: 18,
                color: "#2a1a0a",
                paddingVertical: 8,
              }}
              placeholder="自分の名前を入力"
              placeholderTextColor="#8B7355"
              value={name}
              onChangeText={(t) => setName(t.slice(0, 10))}
              returnKeyType="go"
              onSubmitEditing={handleStart}
              autoFocus
            />
          </View>

          {/* モード選択トグル */}
          <View
            className="flex-row rounded-xl overflow-hidden mt-6"
            style={{ width: inputW * 0.85, borderWidth: 2, borderColor: "#A08050" }}
          >
            {(["cpu", "online"] as const).map((m) => (
              <Pressable
                key={m}
                className="flex-1 py-3.5 items-center"
                style={{
                  backgroundColor:
                    mode === m ? "rgba(160,128,80,0.85)" : "rgba(0,0,0,0.4)",
                }}
                onPress={() => setMode(m)}
              >
                <Text
                  className="font-extrabold"
                  style={{
                    fontSize: 15,
                    color: mode === m ? "#1a1a1a" : "#D4C4A0",
                  }}
                >
                  {m === "cpu" ? "CPU対戦" : "通信対戦"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 下側：対戦開始ボタン（固定気味にしたいので flex-1 の外に置く） */}
        <Pressable
          onPress={handleStart}
          disabled={!isValid}
          className="mb-12"
          style={({ pressed }) => ({
            opacity: !isValid ? 0.4 : pressed ? 0.85 : 1,
            transform: [{ scale: pressed && isValid ? 0.96 : 1 }],
          })}
        >
          <Image
            source={require("@/assets/images/game/start-button.png")}
            style={{ width: width * 0.75, height: width * 0.75 }}
            resizeMode="contain"
          />
        </Pressable>
      </View>
    </ImageBackground>
  );
}