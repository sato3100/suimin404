import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ImageBackground,
  Image,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { useSound } from "./_layout";

const BG = require("@/assets/images/game/bg-parchment.png");
const IMG_TURN = require("@/assets/images/game/turn-badge.png");
const IMG_CREDIT = require("@/assets/images/game/credit-badge.png");

const PHOTO_1 = require("@/assets/images/chicken.png");
const PHOTO_2 = require("@/assets/images/chicken2.png");

// ─── 名前プレート（turn-badge + テキスト） ──────────────────────────────────
function NamePlate({ name, width, photoSource }: { name: string; width: number; photoSource: any }) {
  const photoSize = width * 0.55;
  return (
    <View className="items-center">
      <View
        className="items-center justify-center bg-black/20"
        style={{
          width: photoSize,
          height: photoSize,
          borderWidth: 3,
          borderColor: "#A08050",
          marginBottom: 10,
          overflow: "hidden",
        }}
      >
        {photoSource ? (
          <Image source={photoSource} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Wait...</Text>
        )}
      </View>

      <View
        className="items-center justify-center"
        style={{ width, height: width * 0.36 }}
      >
        <Image
          source={IMG_TURN}
          className="absolute w-full h-full"
          resizeMode="contain"
        />
        <Text
          className="font-black"
          style={{ fontSize: 15, color: "#2a1a0a" }}
          numberOfLines={1}
        >
          {name}
        </Text>
      </View>
    </View>
  );
}

// ─── マッチング画面（軽量版） ────────────────────────────────────────────────
export default function MatchingScreen() {
  const { name, mode } = useLocalSearchParams<{ name: string; mode?: string }>();
  const isCpu = mode === "cpu";
  const hasNavigated = useRef(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const plateW = width * 0.48;
  const { playMatchSound } = useSound();

  // 画面が開かれた時に「1回だけ」シャキーンを鳴らす
  useEffect(() => {
    const timer = setTimeout(() => {
      playMatchSound();
    }, 400); 

    return () => clearTimeout(timer);
  }, []);

  // シンプルなフェードイン用state
  const [showOpponent, setShowOpponent] = useState(false);
  const [showSelf, setShowSelf] = useState(false);
  const [showVs, setShowVs] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // CPU対戦：ゲーム画面へ遷移
  function navigateToGame() {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.replace({ pathname: "/game", params: { mode: "cpu", playerName: name } });
  }

  // 段階的にフェードイン（setTimeout で軽量に）
  useEffect(() => {
    const t1 = setTimeout(() => setShowOpponent(true), 200);
    const t2 = setTimeout(() => setShowSelf(true), 400);
    const t3 = setTimeout(() => setShowVs(true), 600);
    const t4 = setTimeout(() => setShowInfo(true), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // CPU対戦: 2.5秒後に自動遷移
  useEffect(() => {
    if (!isCpu) return;
    const t = setTimeout(navigateToGame, 2500);
    return () => clearTimeout(t);
  }, [isCpu]);

  // 通信対戦: マッチメイキング開始
  const { state, startMatchmaking, cancel } = useMatchmaking(isCpu ? "" : (name ?? ""));

  useEffect(() => {
    if (isCpu) return;
    startMatchmaking();
  }, []);

  // 通信対戦: マッチ成立時にゲーム画面へ遷移
  useEffect(() => {
    if (isCpu) return;
    if (state.status === "ready" && state.gameId && state.userId && state.lobby) {
      const oppName =
        state.lobby.player1.userId === state.userId
          ? (state.lobby.player2?.name ?? "相手")
          : state.lobby.player1.name;
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      router.replace({
        pathname: "/game",
        params: {
          mode: "online",
          gameId: state.gameId,
          playerId: state.userId,
          opponentName: oppName,
        },
      });
    }
  }, [state.status, state.gameId]);

  // 相手情報の取得
  const opponentInfo = isCpu
    ? { name: "CPU", rating: 1000 }
    : (() => {
        if (!state.userId || !state.lobby) return null;
        const isP1 = state.lobby.player1.userId === state.userId;
        if (isP1 && state.lobby.player2) return state.lobby.player2;
        if (!isP1) return state.lobby.player1;
        return null;
      })();

  // 👇 ここから追加：写真の割り当てロジック
  // 自分が先に入ったプレイヤー(player1)かを判定
  const isPlayer1 = isCpu 
    ? true // CPU戦なら自分が必ずPlayer1
    : (state.lobby ? state.lobby.player1.userId === state.userId : true);

  // 判定結果をもとに、自分と相手の写真を決定
  const myPhoto = isPlayer1 ? PHOTO_1 : PHOTO_2;
  const opponentPhoto = isPlayer1 ? PHOTO_2 : PHOTO_1;    

  return (
    <ImageBackground source={BG} className="flex-1" resizeMode="cover" style={{ backgroundColor: "#8B7355" }}>
      <StatusBar style="light" />

      {/* 上半分: 相手 */}
      <View
        className="flex-1 items-start px-8"
        style={{ justifyContent: "center", paddingTop: insets.top + 20 }}
      >
        <View style={{ opacity: showInfo ? 1 : 0 }}>
          <Text
            className="font-bold mb-1"
            style={{ fontSize: 13, color: "#5a4020" }}
          >
            対戦レート：{opponentInfo?.rating ?? "---"}
          </Text>
        </View>
        <View style={{ opacity: showOpponent ? 1 : 0 }}>
          <NamePlate
            name={opponentInfo?.name ?? "検索中..."}
            width={plateW}
            photoSource={opponentInfo ? opponentPhoto : null}
          />
        </View>
      </View>

      {/* 中央: VS */}
      <View className="h-20 items-center justify-center">
        <View
          style={{
            position: "absolute",
            width: "120%",
            height: 2,
            backgroundColor: "#A08050",
            transform: [{ rotate: "-8deg" }],
            opacity: showVs ? 1 : 0,
          }}
        />
        <View style={{ opacity: showVs ? 1 : 0 }}>
          <View
            className="items-center justify-center"
            style={{ width: 72, height: 72 }}
          >
            <Image
              source={IMG_CREDIT}
              className="absolute w-full h-full"
              resizeMode="contain"
            />
            <Text
              className="font-black"
              style={{ fontSize: 22, color: "#2a1a0a", letterSpacing: 2 }}
            >
              VS
            </Text>
          </View>
        </View>
      </View>

      {/* 下半分: 自分 */}
      <View className="flex-1 items-end px-8 justify-center pb-5">
        <View style={{ opacity: showSelf ? 1 : 0 }}>
          <NamePlate name={name ?? "あなた"} width={plateW} photoSource={myPhoto}/>
        </View>
        <View style={{ opacity: showInfo ? 1 : 0 }}>
          <Text
            className="font-bold mt-1"
            style={{ fontSize: 13, color: "#5a4020" }}
          >
            対戦レート：1000
          </Text>
        </View>
      </View>

      {/* ステータス + キャンセル */}
      <View
        className="items-center"
        style={{ paddingBottom: insets.bottom + 24, opacity: showInfo ? 1 : 0 }}
      >
        <Text className="mb-4" style={{ color: "#8B7355", fontSize: 13 }}>
          {isCpu
            ? "CPU対戦を準備中..."
            : opponentInfo
              ? "対戦開始を待っています..."
              : "マッチング中..."}
        </Text>
        {!isCpu && (
          <Pressable
            className="rounded-full px-7 py-2.5"
            style={{
              borderWidth: 1,
              borderColor: "#A08050",
              backgroundColor: "rgba(0,0,0,0.15)",
            }}
            onPress={() => {
              cancel();
              router.back();
            }}
          >
            <Text style={{ color: "#5a4020", fontSize: 14 }}>キャンセル</Text>
          </Pressable>
        )}
        {!isCpu && state.status === "error" && (
          <Text className="mt-2" style={{ color: "#dc2626", fontSize: 13 }}>
            {state.errorMessage}
          </Text>
        )}
      </View>
    </ImageBackground>
  );
}
