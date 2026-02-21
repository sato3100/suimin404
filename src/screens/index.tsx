import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function TitleScreen() {
  const [name, setName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);

  const handleOnlineBattle = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    router.push({ pathname: "/matching", params: { name: trimmed } });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-900"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 items-center justify-center px-6">
        <StatusBar style="light" />

        <Text className="mb-2 text-5xl">🎲</Text>
        <Text className="mb-1 text-4xl font-black text-orange-400">卒業</Text>
        <Text className="mb-2 text-2xl font-bold text-slate-300">
          チキンレース
        </Text>
        <Text className="mb-8 text-sm text-slate-500">
          ～目指せ！省エネ124単位～
        </Text>

        <View className="mb-8 w-full max-w-xs rounded-2xl bg-slate-800 p-5">
          <Text className="mb-1 text-sm leading-6 text-slate-400">
            📚 カードをキープ → 単位として加算
          </Text>
          <Text className="mb-1 text-sm leading-6 text-slate-400">
            ⚔️ カードを使用 → 相手を妨害 or 自分UP
          </Text>
          <Text className="text-sm leading-6 text-slate-400">
            🎯 124単位ピッタリで伝説の省エネ卒業！
          </Text>
        </View>

        {/* CPU対戦ボタン */}
        <Pressable
          className="mb-3 w-full max-w-xs rounded-full bg-indigo-600 py-4 active:bg-indigo-700"
          onPress={() => router.push("/game")}
        >
          <Text className="text-center text-lg font-bold text-white">
            🤖 CPU対戦
          </Text>
        </Pressable>

        {/* 通信対戦ボタン */}
        <Pressable
          className="w-full max-w-xs rounded-full border-2 border-orange-500 py-4 active:bg-orange-950"
          onPress={() => setShowNameInput(true)}
        >
          <Text className="text-center text-lg font-bold text-orange-400">
            👥 通信対戦
          </Text>
        </Pressable>

        <Text className="mt-3 text-xs text-slate-600">
          全8ターン / 約2分 / CPU or 通信対戦
        </Text>

        {/* 名前入力モーダル */}
        {showNameInput && (
          <View className="absolute inset-0 items-center justify-center bg-black/70 px-6">
            <View className="w-full max-w-xs rounded-2xl bg-slate-800 p-6">
              <Text className="mb-4 text-center text-lg font-bold text-white">
                プレイヤー名を入力
              </Text>
              <TextInput
                className="mb-4 rounded-xl bg-slate-700 px-4 py-3 text-white"
                placeholder="名前を入力（最大10文字）"
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={(t) => setName(t.slice(0, 10))}
                autoFocus
                returnKeyType="go"
                onSubmitEditing={handleOnlineBattle}
              />
              <Pressable
                className={`mb-3 rounded-full py-3 ${
                  name.trim() ? "bg-orange-500 active:bg-orange-600" : "bg-slate-600"
                }`}
                onPress={handleOnlineBattle}
                disabled={!name.trim()}
              >
                <Text className="text-center font-bold text-white">GO！</Text>
              </Pressable>
              <Pressable
                className="rounded-full py-3"
                onPress={() => setShowNameInput(false)}
              >
                <Text className="text-center text-slate-500">キャンセル</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
