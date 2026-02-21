import { View, Text, Pressable, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getLastResult, getLastOnlineResult } from "@/game/store";
import { GRADUATION_CREDITS } from "@/data/cards";

interface ChatMessage {
  sender: "player" | "mom";
  text: string;
  isSticker?: boolean;
  isRead?: boolean;
}

function getChatMessages(ending: string, credits: number): ChatMessage[] {
  switch (ending) {
    case "perfect":
      return [
        { sender: "player", text: "お母さん、成績出たよ" },
        { sender: "mom", text: "で、どうだったの？" },
        { sender: "player", text: `${credits}単位ピッタリで卒業！` },
        { sender: "mom", text: "天才か" },
        { sender: "mom", text: "🎓✨🎉", isSticker: true },
      ];
    case "employed":
      return [
        { sender: "player", text: "お母さん、報告があるんだけど" },
        { sender: "mom", text: "何...？まさか..." },
        { sender: "player", text: "卒業できた！しかも超優良企業から内定出た！" },
        { sender: "mom", text: "ボランティアの経験が活きたのね😭" },
        { sender: "mom", text: "👏👏👏", isSticker: true },
      ];
    case "nerd":
      return [
        { sender: "player", text: "お母さん、卒業したよ" },
        { sender: "mom", text: "何単位だったの？" },
        { sender: "player", text: `${credits}単位！` },
        { sender: "mom", text: "すごいけど...友達は？" },
        { sender: "player", text: "..." },
        { sender: "mom", text: "😔", isSticker: true },
      ];
    case "graduate":
      return [
        { sender: "player", text: "お母さん、卒業できたよ" },
        { sender: "mom", text: "おめでとう！何単位だったの？" },
        { sender: "player", text: `${credits}単位で卒業！` },
        { sender: "mom", text: "まぁ及第点ね" },
        { sender: "mom", text: "🎓", isSticker: true },
      ];
    case "repeat":
      return [
        { sender: "player", text: "お母さん..." },
        { sender: "mom", text: "どうしたの？" },
        { sender: "player", text: `ごめん、${credits}単位で...もう一年遊べるドン！` },
        { sender: "mom", text: "😡😡😡", isSticker: true },
        { sender: "mom", text: "仕送りカットね" },
      ];
    case "dropout":
      return [
        { sender: "player", text: "お母さん" },
        { sender: "mom", text: "何？" },
        { sender: "player", text: "大学辞めてYouTuberになります" },
        { sender: "player", text: "", isRead: true },
      ];
    default:
      return [
        { sender: "player", text: `${credits}単位でした` },
        { sender: "mom", text: "お疲れ様" },
      ];
  }
}

// ─── 通信対戦結果画面 ──────────────────────────────────────────────────────────
function OnlineResultScreen() {
  const result = getLastOnlineResult();

  if (!result) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <Pressable onPress={() => router.replace("/")}>
          <Text className="text-white">タイトルに戻る</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900">
      <StatusBar style="light" />

      <View className="flex-row items-center bg-slate-800 px-4 pb-3 pt-14">
        <Text className="flex-1 text-lg font-bold text-white">対戦結果</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* 勝敗表示 */}
        <View className="mb-6 items-center">
          <Text className="text-6xl">{result.won ? "🏆" : "😢"}</Text>
          <Text
            className={`mt-2 text-4xl font-black ${result.won ? "text-yellow-400" : "text-slate-400"}`}
          >
            {result.won ? "YOU WIN!" : "YOU LOSE..."}
          </Text>
        </View>

        {/* スコア比較 */}
        <View className="mb-6 rounded-2xl bg-slate-800 p-5">
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="mb-1 text-sm text-slate-400">あなた</Text>
              <Text
                className={`text-3xl font-black ${result.myGraduated ? "text-green-400" : "text-red-400"}`}
              >
                {result.myCredits}
              </Text>
              <Text className="text-xs text-slate-500">単位</Text>
              {result.myGraduated && (
                <Text className="mt-1 text-xs text-green-400">卒業！</Text>
              )}
            </View>
            <View className="items-center justify-center">
              <Text className="text-2xl font-black text-slate-600">VS</Text>
              <Text className="mt-1 text-xs text-slate-600">目標: {GRADUATION_CREDITS}</Text>
            </View>
            <View className="items-center">
              <Text className="mb-1 text-sm text-slate-400">
                {result.opponentName}
              </Text>
              <Text
                className={`text-3xl font-black ${result.opponentGraduated ? "text-green-400" : "text-red-400"}`}
              >
                {result.opponentCredits}
              </Text>
              <Text className="text-xs text-slate-500">単位</Text>
              {result.opponentGraduated && (
                <Text className="mt-1 text-xs text-green-400">卒業！</Text>
              )}
            </View>
          </View>
        </View>

        <Pressable
          className="mb-3 rounded-full bg-orange-500 py-4 active:bg-orange-600"
          onPress={() => router.replace("/")}
        >
          <Text className="text-center text-lg font-bold text-white">
            もう一度対戦する
          </Text>
        </Pressable>

        <Pressable
          className="rounded-full border border-slate-600 py-3 active:bg-slate-800"
          onPress={() => router.replace("/")}
        >
          <Text className="text-center text-slate-400">タイトルに戻る</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── CPU対戦結果画面（既存のLINE風）──────────────────────────────────────────
function CpuResultScreen() {
  const result = getLastResult();

  if (!result) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <Pressable onPress={() => router.replace("/")}>
          <Text className="text-white">タイトルに戻る</Text>
        </Pressable>
      </View>
    );
  }

  const messages = getChatMessages(result.ending, result.playerCredits);

  return (
    <View className="flex-1 bg-[#7494C0]">
      <StatusBar style="light" />
      <View className="flex-row items-center bg-[#5B7A9E] px-4 pb-3 pt-14">
        <Text className="flex-1 text-lg font-bold text-white">お母さん</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        <View className="mb-4 items-center">
          <View className="rounded-full bg-black/20 px-3 py-1">
            <Text className="text-xs text-white">今日</Text>
          </View>
        </View>

        {messages.map((msg, i) => {
          if (msg.isRead) {
            return (
              <View key={i} className="mt-2 items-end pr-2">
                <Text className="text-xs text-slate-300">既読</Text>
              </View>
            );
          }
          const isPlayer = msg.sender === "player";
          return (
            <View
              key={i}
              className={`mb-3 flex-row ${isPlayer ? "justify-end" : "justify-start"}`}
            >
              {!isPlayer && (
                <View className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-pink-200">
                  <Text className="text-lg">👩</Text>
                </View>
              )}
              <View
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                  isPlayer ? "bg-[#82D455]" : "bg-white"
                }`}
              >
                <Text
                  className={`${msg.isSticker ? "text-center text-3xl" : "text-sm leading-5"} ${
                    isPlayer ? "text-slate-900" : "text-slate-800"
                  }`}
                >
                  {msg.text}
                </Text>
              </View>
            </View>
          );
        })}

        <View className="mt-6 rounded-2xl bg-white/90 p-5">
          <Text className="mb-3 text-center text-lg font-black text-slate-800">
            {result.playerWon ? "🏆 勝利！" : "😢 敗北..."}
          </Text>
          <Text className="mb-1 text-center text-2xl font-black text-indigo-600">
            {result.endingTitle}
          </Text>

          <View className="mt-4 flex-row justify-around">
            <View className="items-center">
              <Text className="text-sm text-slate-500">あなた</Text>
              <Text
                className={`text-2xl font-black ${result.playerGraduated ? "text-green-600" : "text-red-500"}`}
              >
                {result.playerCredits}
              </Text>
              <Text className="text-xs text-slate-400">単位</Text>
            </View>
            <View className="items-center">
              <Text className="text-sm text-slate-500">目標</Text>
              <Text className="text-2xl font-black text-slate-400">
                {GRADUATION_CREDITS}
              </Text>
              <Text className="text-xs text-slate-400">単位</Text>
            </View>
            <View className="items-center">
              <Text className="text-sm text-slate-500">CPU</Text>
              <Text
                className={`text-2xl font-black ${result.cpuGraduated ? "text-green-600" : "text-red-500"}`}
              >
                {result.cpuCredits}
              </Text>
              <Text className="text-xs text-slate-400">単位</Text>
            </View>
          </View>

          <Pressable
            className="mt-5 rounded-full bg-indigo-600 py-3 active:bg-indigo-700"
            onPress={() => router.replace("/")}
          >
            <Text className="text-center font-bold text-white">
              もう一度遊ぶ
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── メインエクスポート ─────────────────────────────────────────────────────────
export default function ResultScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  if (mode === "online") {
    return <OnlineResultScreen />;
  }
  return <CpuResultScreen />;
}
