import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { getLastResult, getLastOnlineResult } from "@/game/store";

// ─── LINE風カラー定数 ────────────────────────────────────────────────────────
const LINE = {
  headerBg: "#385B73",
  chatBg: "#7494A5",
  sentBubble: "#8CE62C",
  receivedBubble: "#FFFFFF",
  sentText: "#111111",
  receivedText: "#111111",
  timestamp: "#5A7A8A",
  inputBg: "#FFFFFF",
  sendActive: "#58BE41",
  sendInactive: "#B5C4CF",
} as const;

// ─── チャットメッセージ型 ────────────────────────────────────────────────────
interface ChatMessage {
  sender: "player" | "mom";
  text: string;
  isSticker?: boolean;
  isRead?: boolean;
}

// ─── エンディング別チャットメッセージ生成 ────────────────────────────────────
function getChatMessages(
  ending: string,
  credits: number,
  onlineWon?: boolean,
): ChatMessage[] {
  const suffix =
    onlineWon !== undefined
      ? onlineWon
        ? "（対戦も勝ったよ！）"
        : "（対戦は負けちゃったけど）"
      : "";

  switch (ending) {
    case "perfect":
      return [
        { sender: "mom", text: "成績発表あったんでしょ？どうだったの" },
        { sender: "player", text: `お母さん、聞いて！${suffix}` },
        { sender: "player", text: `${credits}単位ピッタリで卒業！` },
        { sender: "mom", text: "天才か" },
        { sender: "mom", text: "🎓✨🎉", isSticker: true },
      ];
    case "employed":
      return [
        { sender: "mom", text: "成績発表あったんでしょ？どうだったの" },
        { sender: "player", text: `お母さん、報告があるんだけど${suffix}` },
        { sender: "player", text: "卒業できた！しかも超優良企業から内定出た！" },
        { sender: "mom", text: "ボランティアの経験が活きたのね😭" },
        { sender: "mom", text: "👏👏👏", isSticker: true },
      ];
    case "nerd":
      return [
        { sender: "mom", text: "成績発表あったんでしょ？どうだったの" },
        { sender: "player", text: `お母さん、卒業したよ${suffix}` },
        { sender: "mom", text: "何単位だったの？" },
        { sender: "player", text: `${credits}単位！` },
        { sender: "mom", text: "すごいけど...友達は？" },
        { sender: "player", text: "..." },
        { sender: "mom", text: "😔", isSticker: true },
      ];
    case "graduate":
      return [
        { sender: "mom", text: "成績発表あったんでしょ？どうだったの" },
        { sender: "player", text: `お母さん、卒業できたよ${suffix}` },
        { sender: "mom", text: "おめでとう！何単位だったの？" },
        { sender: "player", text: `${credits}単位で卒業！` },
        { sender: "mom", text: "まぁ及第点ね" },
        { sender: "mom", text: "🎓", isSticker: true },
      ];
    case "repeat":
      return [
        { sender: "mom", text: "成績発表あったんでしょ？どうだったの" },
        { sender: "player", text: "お母さん..." },
        { sender: "mom", text: "どうしたの？" },
        { sender: "player", text: `ごめん、${credits}単位で...もう一年遊べるドン！` },
        { sender: "mom", text: "😡😡😡", isSticker: true },
        { sender: "mom", text: "仕送りカットね" },
      ];
    case "dropout":
      return [
        { sender: "mom", text: "成績発表あったんでしょ？どうだったの" },
        { sender: "player", text: "お母さん" },
        { sender: "mom", text: "何？" },
        { sender: "player", text: "大学辞めてYouTuberになります" },
        { sender: "player", text: "", isRead: true },
      ];
    default:
      return [
        { sender: "mom", text: "成績発表あったんでしょ？どうだったの" },
        { sender: "player", text: `${credits}単位でした${suffix}` },
        { sender: "mom", text: "お疲れ様" },
      ];
  }
}

// ─── タイムスタンプ（固定時刻） ─────────────────────────────────────────────
function Timestamp({ align }: { align: "left" | "right" }) {
  return (
    <Text
      style={{
        fontSize: 10,
        color: LINE.timestamp,
        alignSelf: "flex-end",
        marginBottom: 4,
        ...(align === "left" ? { marginRight: 6 } : { marginLeft: 6 }),
      }}
    >
      18:42
    </Text>
  );
}

// ─── 既読マーク ─────────────────────────────────────────────────────────────
function ReadReceipt() {
  return (
    <View style={{ alignItems: "flex-end", paddingRight: 8, marginTop: -2, marginBottom: 8 }}>
      <Text style={{ fontSize: 10, color: LINE.timestamp }}>既読</Text>
    </View>
  );
}

// ─── チャット吹き出し ───────────────────────────────────────────────────────
function Bubble({ msg, visible }: { msg: ChatMessage; visible: boolean }) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(12);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      ty.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  // 既読表示のみ
  if (msg.isRead) {
    return (
      <Animated.View style={anim}>
        <ReadReceipt />
      </Animated.View>
    );
  }

  const isPlayer = msg.sender === "player";

  return (
    <Animated.View
      style={[
        {
          marginBottom: 6,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: isPlayer ? "flex-end" : "flex-start",
        },
        anim,
      ]}
    >
      {/* お母さんアイコン */}
      {!isPlayer && (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "#fce7f3",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          <Text style={{ fontSize: 18 }}>👩</Text>
        </View>
      )}

      {/* 送信側: 時刻を左に */}
      {isPlayer && <Timestamp align="right" />}

      {/* 吹き出し本体 */}
      <View
        style={{
          maxWidth: "68%",
          borderRadius: 16,
          borderBottomLeftRadius: isPlayer ? 16 : 2,
          borderBottomRightRadius: isPlayer ? 2 : 16,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: isPlayer ? LINE.sentBubble : LINE.receivedBubble,
        }}
      >
        <Text
          style={{
            fontSize: msg.isSticker ? 32 : 14,
            textAlign: msg.isSticker ? "center" : "left",
            lineHeight: msg.isSticker ? 40 : 20,
            color: isPlayer ? LINE.sentText : LINE.receivedText,
          }}
        >
          {msg.text}
        </Text>
      </View>

      {/* 受信側: 時刻を右に */}
      {!isPlayer && <Timestamp align="left" />}
    </Animated.View>
  );
}

// ─── LINE風チャット画面 ─────────────────────────────────────────────────────
function LineScreen({
  messages,
  endingTitle,
}: {
  messages: ChatMessage[];
  endingTitle: string;
}) {
  const insets = useSafeAreaInsets();
  const [visibleCount, setVisibleCount] = useState(0);
  const [allShown, setAllShown] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  // メッセージを1通ずつ段階表示
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= messages.length) {
        clearInterval(timer);
        setAllShown(true);
      }
    }, 800);
    return () => clearInterval(timer);
  }, []);

  // メッセージ追加時に自動スクロール
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, [visibleCount, sentMessages.length]);

  // ユーザーメッセージ送信
  const handleSend = () => {
    const txt = inputText.trim();
    if (!txt) return;
    setSentMessages((prev) => [...prev, txt]);
    setInputText("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: LINE.chatBg }}>
      <StatusBar style="light" />

      {/* ── ヘッダー（LINE風） ── */}
      <View
        style={{
          backgroundColor: LINE.headerBg,
          paddingTop: insets.top + 4,
          paddingBottom: 10,
          paddingHorizontal: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* 戻るボタン */}
          <Pressable
            onPress={() => router.replace("/")}
            hitSlop={12}
            style={{
              paddingVertical: 6,
              paddingRight: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "300" }}>
              {"‹"}
            </Text>
          </Pressable>

          <View style={{ flex: 1 }} />

          {/* プロフィール */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: "#fce7f3",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
            >
              <Text style={{ fontSize: 18 }}>👩</Text>
            </View>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              お母さん
            </Text>
          </View>

          <View style={{ flex: 1 }} />

          {/* ダミーアイコン群（LINE風装飾） */}
          <View style={{ flexDirection: "row", gap: 16 }}>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 16 }}>📞</Text>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 16 }}>☰</Text>
          </View>
        </View>
      </View>

      {/* ── チャットエリア ── */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 14 }}
      >
        {/* 日付バッジ */}
        <View style={{ alignItems: "center", marginBottom: 14 }}>
          <View
            style={{
              backgroundColor: "rgba(0,0,0,0.15)",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 11, color: "#fff" }}>今日</Text>
          </View>
        </View>

        {/* 定型メッセージ */}
        {messages.slice(0, visibleCount).map((msg, i) => (
          <Bubble key={i} msg={msg} visible />
        ))}

        {/* ユーザーが追加送信したメッセージ */}
        {sentMessages.map((txt, i) => (
          <View
            key={`sent-${i}`}
            style={{
              marginBottom: 6,
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "flex-end",
            }}
          >
            <Timestamp align="right" />
            <View
              style={{
                maxWidth: "68%",
                borderRadius: 16,
                borderBottomRightRadius: 2,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: LINE.sentBubble,
              }}
            >
              <Text style={{ fontSize: 14, color: LINE.sentText, lineHeight: 20 }}>
                {txt}
              </Text>
            </View>
          </View>
        ))}

        {/* エンディングタイトル表示 */}
        {allShown && (
          <View style={{ alignItems: "center", marginTop: 20 }}>
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.2)",
                borderRadius: 14,
                paddingHorizontal: 18,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontSize: 12, color: "#fff", fontWeight: "700" }}>
                {endingTitle}
              </Text>
            </View>
            <Pressable
              onPress={() => router.replace("/")}
              style={{ marginTop: 16 }}
            >
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                タイトルに戻る
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* ── 入力欄（LINE風） ── */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View
          style={{
            backgroundColor: LINE.headerBg,
            paddingHorizontal: 10,
            paddingVertical: 8,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          {/* カメラアイコン（装飾） */}
          <Text style={{ fontSize: 20, color: "rgba(255,255,255,0.5)" }}>📷</Text>

          {/* テキスト入力 */}
          <TextInput
            style={{
              flex: 1,
              backgroundColor: LINE.inputBg,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 8,
              fontSize: 14,
              color: "#111",
              maxHeight: 80,
            }}
            placeholder="メッセージを入力"
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            multiline
          />

          {/* 送信ボタン */}
          <Pressable
            onPress={handleSend}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: inputText.trim() ? LINE.sendActive : LINE.sendInactive,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>▶</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── CPU対戦結果（LINE表示） ────────────────────────────────────────────────
function CpuResultScreen() {
  const result = getLastResult();
  if (!result) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: LINE.chatBg }}>
        <Pressable onPress={() => router.replace("/")}>
          <Text style={{ color: "#fff", fontSize: 15 }}>タイトルに戻る</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <LineScreen
      messages={getChatMessages(result.ending, result.playerCredits)}
      endingTitle={result.endingTitle}
    />
  );
}

// ─── 通信対戦結果（LINE表示） ───────────────────────────────────────────────
function OnlineResultScreen() {
  const result = getLastOnlineResult();
  const cpuResult = getLastResult();

  if (!result && !cpuResult) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: LINE.chatBg }}>
        <Pressable onPress={() => router.replace("/")}>
          <Text style={{ color: "#fff", fontSize: 15 }}>タイトルに戻る</Text>
        </Pressable>
      </View>
    );
  }

  const myCredits = result?.myCredits ?? cpuResult?.playerCredits ?? 94;
  const won = result?.won;

  // 単位数に応じたエンディング判定
  let ending: string;
  let endingTitle: string;
  if (myCredits === 124) {
    ending = "perfect";
    endingTitle = "伝説の省エネ卒業";
  } else if (myCredits >= 131) {
    ending = "nerd";
    endingTitle = "ガリ勉・友達ゼロ";
  } else if (myCredits >= 124) {
    ending = "graduate";
    endingTitle = "卒業";
  } else if (myCredits >= 94) {
    ending = "repeat";
    endingTitle = "留年";
  } else {
    ending = "dropout";
    endingTitle = "中退・家出";
  }

  return (
    <LineScreen
      messages={getChatMessages(ending, myCredits, won)}
      endingTitle={endingTitle}
    />
  );
}

// ─── ルートコンポーネント ───────────────────────────────────────────────────
export default function ResultScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  if (mode === "online") return <OnlineResultScreen />;
  return <CpuResultScreen />;
}
