import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  ImageBackground,
  Image,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import {
  GameState,
  createInitialState,
  drawCard,
  useCard,
  passTurn,
  isPlayerTurn,
  getPlayerCredits,
  getCpuCredits,
  determineResult,
} from "@/game/engine";
import { cpuAction } from "@/game/cpu";
import { setLastResult, setLastOnlineResult } from "@/game/store";
import { GRADUATION_CREDITS, STARTING_CREDITS, Card } from "@/data/cards";
import { useOnlineGame } from "@/hooks/useOnlineGame";

// ─── 素材 ────────────────────────────────────────────────────────────────────
const BG = require("@/assets/images/game/bg-dark.png");
const IMG_CREDIT = require("@/assets/images/game/credit-badge.png");
const IMG_TURN = require("@/assets/images/game/turn-badge.png");
const IMG_PASS = require("@/assets/images/game/pass-button.png");
const IMG_SLEEVE = require("@/assets/images/game/card-sleeve.png");
const IMG_CARD = require("@/assets/images/game/card-face-2.png");

// ─── カテゴリ色 ──────────────────────────────────────────────────────────────
const CAT_BG: Record<string, string> = {
  stable: "#2d6a2e",
  minus: "#7a3030",
  chaos: "#5a2d7a",
};
const CAT_LABEL: Record<string, string> = {
  stable: "安定系",
  minus: "マイナス系",
  chaos: "混沌系",
};

// ─── 効果テキスト ────────────────────────────────────────────────────────────
function effectLines(card: Card): string[] {
  const e = card.useEffect;
  const l: string[] = [];
  if (e.selfBonus !== undefined && e.selfBonus !== 0)
    l.push(`自分 ${e.selfBonus > 0 ? "+" : ""}${e.selfBonus}単位`);
  if (e.opponentBonus !== undefined && e.opponentBonus !== 0)
    l.push(`相手 ${e.opponentBonus > 0 ? "+" : ""}${e.opponentBonus}単位`);
  if (e.gamble) l.push(`50%で+${e.gamble.win} / 50%で${e.gamble.lose}単位`);
  if (e.drawCards) l.push(`${e.drawCards}枚ドロー`);
  if (e.extraActions) l.push(`行動回数+${e.extraActions}`);
  if (e.skipNextDraw) l.push("次ターン ドロースキップ");
  if (e.discardSelf) l.push(`自分の手札${e.discardSelf}枚除外`);
  if (e.discardOpponent) l.push(`相手の手札${e.discardOpponent}枚除外`);
  return l;
}

// ═══════════════ サブコンポーネント ═══════════════════════════════════════════

function BattleFlash({ visible }: { visible: boolean }) {
  const op = useSharedValue(0);
  useEffect(() => {
    if (visible) op.value = withSequence(withTiming(0.7, { duration: 60 }), withTiming(0, { duration: 250 }));
  }, [visible]);
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute inset-0 z-50"
      style={[{ backgroundColor: "#fff" }, useAnimatedStyle(() => ({ opacity: op.value }))]}
    />
  );
}

function FieldCard({ card, cardW, cardH }: { card: Card | null; cardW: number; cardH: number }) {
  const tx = useSharedValue(80);
  const op = useSharedValue(0);
  const rot = useSharedValue(0);
  useEffect(() => {
    if (card) {
      tx.value = 80; op.value = 0; rot.value = 0;
      tx.value = withSpring(0, { damping: 12, stiffness: 90 });
      rot.value = withSpring(-12, { damping: 8, stiffness: 60 });
      op.value = withTiming(1, { duration: 150 });
    } else {
      op.value = withTiming(0, { duration: 100 });
    }
  }, [card?.uid]);
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { rotate: `${rot.value}deg` }],
    opacity: op.value,
  }));

  if (!card)
    return (
      <View
        className="rounded-lg"
        style={{ width: cardW, height: cardH, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.15)" }}
      />
    );

  return (
    <Animated.View style={[{ width: cardW, height: cardH, borderRadius: 10, overflow: "hidden" }, anim]}>
      <ImageBackground source={IMG_CARD} className="flex-1 items-center justify-center p-2" resizeMode="cover">
        <View className="rounded-lg px-3 py-2 items-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <Text className="font-black text-white" style={{ fontSize: 14 }} numberOfLines={1}>{card.name}</Text>
          <Text style={{ fontSize: 12, color: "#D4C4A0" }}>{card.keepValue}単位</Text>
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

function DeckPile({ count, w, h }: { count: number; w: number; h: number }) {
  return (
    <View className="items-center">
      <View style={{ width: w, height: h, position: "relative" }}>
        {count > 2 && <Image source={IMG_SLEEVE} style={{ position: "absolute", top: -3, left: -2, width: w, height: h, borderRadius: 10, opacity: 0.5 }} resizeMode="cover" />}
        {count > 1 && <Image source={IMG_SLEEVE} style={{ position: "absolute", top: -1, left: -1, width: w, height: h, borderRadius: 10, opacity: 0.7 }} resizeMode="cover" />}
        <Image source={IMG_SLEEVE} style={{ width: w, height: h, borderRadius: 10 }} resizeMode="cover" />
      </View>
    </View>
  );
}

function CreditBadge({ value, bonus, size = 100 }: { value: number; bonus: number; size?: number }) {
  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Image source={IMG_CREDIT} className="absolute" style={{ width: size, height: size }} resizeMode="contain" />
      <View className="flex-row items-baseline">
        <Text className="font-black" style={{ fontSize: size * 0.32, color: "#1a1a1a" }}>{value}</Text>
        {bonus > 0 && <Text className="font-bold" style={{ fontSize: size * 0.16, color: "#5a4020" }}>+{bonus}</Text>}
      </View>
    </View>
  );
}

function TurnBadge({ text, width: w }: { text: string; width: number }) {
  return (
    <View className="items-center justify-center" style={{ width: w, height: w * 0.36 }}>
      <Image source={IMG_TURN} className="absolute w-full h-full" resizeMode="contain" />
      <Text className="font-black" style={{ fontSize: 14, color: "#2a1a0a" }}>{text}</Text>
    </View>
  );
}

function FaceDownCard({ visible, w, h }: { visible: boolean; w: number; h: number }) {
  return (
    <View className="rounded-lg overflow-hidden" style={{ width: w, height: h }}>
      {visible ? (
        <Image source={IMG_SLEEVE} className="w-full h-full" resizeMode="cover" />
      ) : (
        <View className="flex-1" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
      )}
    </View>
  );
}

function HandCard({ card, isSelected, onPress, disabled, w, h }: {
  card: Card; isSelected: boolean; onPress: () => void; disabled: boolean; w: number; h: number;
}) {
  const ty = useSharedValue(0);
  useEffect(() => { ty.value = withTiming(isSelected ? -14 : 0, { duration: 120 }); }, [isSelected]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <Animated.View
        style={[
          {
            width: w, height: h, borderRadius: 10, overflow: "hidden",
            borderWidth: isSelected ? 3 : 0,
            borderColor: isSelected ? "#4ade80" : "transparent",
            opacity: disabled ? 0.4 : 1,
          },
          anim,
        ]}
      >
        <ImageBackground source={IMG_CARD} className="flex-1 p-1.5 justify-between" resizeMode="cover">
          <View className="self-end rounded-md px-1.5 py-0.5" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
            <Text className="font-black text-white" style={{ fontSize: 12 }}>{card.keepValue}単位</Text>
          </View>
          <View className="rounded-md px-1.5 py-1.5" style={{ backgroundColor: CAT_BG[card.category], opacity: 0.92 }}>
            <Text className="font-extrabold text-white text-center" style={{ fontSize: 10 }} numberOfLines={1}>{card.name}</Text>
          </View>
        </ImageBackground>
      </Animated.View>
    </Pressable>
  );
}

function CardDetailPopup({ card, visible, onUse, onKeep, onClose }: {
  card: Card | null; visible: boolean; onUse: () => void; onKeep: () => void; onClose: () => void;
}) {
  if (!card) return null;
  const lines = effectLines(card);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        className="flex-1 justify-center items-center p-6"
        style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        onPress={onClose}
      >
        <Pressable
          className="w-full rounded-2xl p-6 items-center"
          style={{ maxWidth: 320, backgroundColor: "#2A1F14", borderWidth: 2, borderColor: "#A08050" }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* カテゴリタグ */}
          <View className="rounded-full px-3 py-1 mb-2" style={{ backgroundColor: CAT_BG[card.category] }}>
            <Text className="text-white font-bold" style={{ fontSize: 11 }}>{CAT_LABEL[card.category]}</Text>
          </View>
          <Text className="font-black" style={{ fontSize: 22, color: "#F5E6C8" }}>{card.name}</Text>
          <Text className="text-center mt-2" style={{ fontSize: 13, color: "#D4C4A0", lineHeight: 20 }}>{card.description}</Text>

          {/* ステータス */}
          <View className="flex-row justify-center mt-4 mb-2" style={{ gap: 20 }}>
            <View className="items-center">
              <Text style={{ fontSize: 11, color: "#8B7355" }}>キープ値</Text>
              <Text className="font-bold" style={{ fontSize: 20, color: "#4ade80" }}>+{card.keepValue}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#A08050" }} />
            <View className="items-center">
              <Text style={{ fontSize: 11, color: "#8B7355" }}>使用効果</Text>
              {lines.map((l, i) => (
                <Text key={i} className="font-bold mt-0.5" style={{ fontSize: 12, color: "#eab308" }}>{l}</Text>
              ))}
            </View>
          </View>

          {/* ボタン */}
          <View className="flex-row w-full mt-4" style={{ gap: 12 }}>
            <Pressable onPress={onUse} className="flex-1 rounded-xl py-3.5 items-center" style={{ backgroundColor: "#dc2626" }}>
              <Text className="text-white font-bold" style={{ fontSize: 16 }}>使う</Text>
            </Pressable>
            <Pressable
              onPress={onKeep}
              className="flex-1 rounded-xl py-3.5 items-center"
              style={{ backgroundColor: "rgba(160,128,80,0.4)", borderWidth: 1, borderColor: "#A08050" }}
            >
              <Text className="font-bold" style={{ fontSize: 16, color: "#F5E6C8" }}>パス</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ═══════════════ CPU対戦画面 ═════════════════════════════════════════════════

function CpuGameScreen({ playerName }: { playerName: string }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = width * 0.24;
  const cardH = cardW * 1.4;
  const miniW = width * 0.17;
  const miniH = miniW * 1.4;
  const badgeSize = 110;
  const turnW = width * 0.48;

  const [state, setState] = useState<GameState>(createInitialState);
  const [sel, setSel] = useState<number | null>(null);
  const [drawn, setDrawn] = useState<Card | null>(null);
  const [flash, setFlash] = useState(false);

  const pt = isPlayerTurn(state.turn);
  const canAct = pt && state.phase === "action";
  const pCommit = STARTING_CREDITS + state.playerBonusCredits;
  const pHand = state.playerHand.reduce((s, c) => s + c.keepValue, 0);
  const cCommit = STARTING_CREDITS + state.cpuBonusCredits;
  const cHand = state.cpuHand.reduce((s, c) => s + c.keepValue, 0);
  const selected = sel !== null ? state.playerHand[sel] : null;

  useEffect(() => {
    if (state.phase === "action" && pt && state.playerHand.length > 0)
      setDrawn(state.playerHand[state.playerHand.length - 1]);
    else setDrawn(null);
  }, [state.turn, state.phase]);

  useEffect(() => {
    if (state.phase === "ended") {
      setLastResult(determineResult(state));
      const t = setTimeout(() => router.replace("/battle-result"), 800);
      return () => clearTimeout(t);
    }
    if (state.phase === "draw") {
      const t = setTimeout(() => setState((s) => drawCard(s)), 400);
      return () => clearTimeout(t);
    }
    if (state.phase === "action" && !pt) {
      const t = setTimeout(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 300);
        setState((s) => {
          let n = cpuAction(s);
          while (n.phase === "action" && !isPlayerTurn(n.turn) && n.actionsRemaining > 0) n = cpuAction(n);
          return n;
        });
      }, 900);
      return () => clearTimeout(t);
    }
  }, [state.phase, state.turn, pt]);

  const onUse = useCallback((idx: number) => {
    setFlash(true); setTimeout(() => setFlash(false), 300);
    setState((s) => useCard(s, idx)); setSel(null);
  }, []);

  const onPass = useCallback(() => { setState((s) => passTurn(s)); setSel(null); }, []);

  return (
    <ImageBackground source={BG} className="flex-1" resizeMode="cover" style={{ backgroundColor: "#1a1008" }}>
      <StatusBar style="light" />
      <BattleFlash visible={flash} />

      {/* ─── 相手エリア ─── */}
      <View className="px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
        {/* 相手の手札（裏面） */}
        <View className="flex-row justify-center mb-3" style={{ gap: 6 }}>
          {Array.from({ length: state.cpuHand.length || 3 }).map((_, i) => (
            <FaceDownCard key={i} visible={state.cpuHand.length > 0} w={miniW} h={miniH} />
          ))}
        </View>
        {/* 相手名前 + ターン + 単位数 */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="font-bold mb-1" style={{ fontSize: 12, color: "#D4C4A0" }}>
              {playerName ? "CPU" : "相手の名前"}
            </Text>
            <TurnBadge text={`ターン数 ${state.turn}/10`} width={turnW} />
          </View>
          <View className="items-center">
            <Text style={{ fontSize: 11, color: "#D4C4A0" }}>単位数</Text>
            <CreditBadge value={cCommit} bonus={cHand} size={badgeSize} />
          </View>
        </View>
      </View>

      {/* ─── フィールド（中央） ─── */}
      <View className="flex-1 flex-row items-center justify-center" style={{ gap: 28 }}>
        <FieldCard card={drawn} cardW={cardW} cardH={cardH} />
        <DeckPile count={state.deck.length} w={cardW} h={cardH} />
      </View>

      {/* ─── 自分エリア ─── */}
      <View className="flex-row items-center px-4 py-2">
        <View className="items-center">
          <Text style={{ fontSize: 11, color: "#D4C4A0" }}>単位数</Text>
          <CreditBadge value={pCommit} bonus={pHand} size={badgeSize} />
        </View>
        {canAct && state.actionsRemaining > 1 && (
          <View className="ml-2 rounded-lg px-2 py-0.5" style={{ backgroundColor: "rgba(234,179,8,0.3)" }}>
            <Text className="font-bold" style={{ fontSize: 11, color: "#eab308" }}>残{state.actionsRemaining}回</Text>
          </View>
        )}
        <View className="flex-1" />
        {canAct && (
          <Pressable onPress={onPass} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
            <View className="items-center justify-center" style={{ width: 130, height: 56 }}>
              <Image source={IMG_PASS} className="absolute w-full h-full" resizeMode="contain" />
              <Text className="font-black" style={{ fontSize: 18, color: "#2a1a0a" }}>パス</Text>
            </View>
          </Pressable>
        )}
        {!pt && state.phase !== "ended" && (
          <Text className="italic" style={{ fontSize: 14, color: "#8B7355" }}>相手のターン...</Text>
        )}
      </View>

      {/* ─── 手札 ─── */}
      <View className="px-2 pt-2" style={{ paddingBottom: insets.bottom + 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}>
          {state.playerHand.map((c, i) => (
            <HandCard key={c.uid} card={c} isSelected={sel === i} disabled={!canAct} onPress={() => canAct && setSel(sel === i ? null : i)} w={cardW} h={cardH} />
          ))}
        </ScrollView>
      </View>

      <CardDetailPopup card={selected} visible={selected !== null} onUse={() => sel !== null && onUse(sel)} onKeep={onPass} onClose={() => setSel(null)} />
    </ImageBackground>
  );
}

// ═══════════════ 通信対戦画面 ═════════════════════════════════════════════════

function OnlineGameScreen({ gameId, playerId, opponentName }: { gameId: string; playerId: string; opponentName: string }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = width * 0.24;
  const cardH = cardW * 1.4;
  const miniW = width * 0.17;
  const miniH = miniW * 1.4;
  const badgeSize = 110;
  const turnW = width * 0.48;

  const { game, isMyTurn, myHand, opponentHandCount, opponentCredits, timeLeft, loading, submitAction } = useOnlineGame(gameId, playerId);
  const [sel, setSel] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!game || game.status !== "ended") return;
    const isP1 = playerId === game.player1Id;
    const myH = isP1 ? game.player1Hand : game.player2Hand;
    const oppH = isP1 ? game.player2Hand : game.player1Hand;
    const myB = isP1 ? game.player1BonusCredits : game.player2BonusCredits;
    const oppB = isP1 ? game.player2BonusCredits : game.player1BonusCredits;
    const myC = STARTING_CREDITS + myH.reduce((s, c) => s + c.keepValue, 0) + myB;
    const oppC = STARTING_CREDITS + oppH.reduce((s, c) => s + c.keepValue, 0) + oppB;
    setLastOnlineResult({ myCredits: myC, opponentCredits: oppC, myName: "あなた", opponentName, won: game.winnerId === playerId, myGraduated: myC >= GRADUATION_CREDITS, opponentGraduated: oppC >= GRADUATION_CREDITS });
    const t = setTimeout(() => router.replace("/battle-result?mode=online"), 800);
    return () => clearTimeout(t);
  }, [game?.status]);

  if (loading || !game) {
    return (
      <ImageBackground source={BG} className="flex-1 items-center justify-center" resizeMode="cover" style={{ backgroundColor: "#1a1008" }}>
        <Text style={{ color: "#D4C4A0", fontSize: 16 }}>読み込み中...</Text>
      </ImageBackground>
    );
  }

  const selected = sel !== null ? myHand[sel] : null;
  const timerColor = timeLeft > 30 ? "#D4C4A0" : timeLeft > 10 ? "#d97706" : "#dc2626";
  const myB = game.player1Id === playerId ? game.player1BonusCredits : game.player2BonusCredits;
  const commit = STARTING_CREDITS + myB;
  const handVal = myHand.reduce((s, c) => s + c.keepValue, 0);

  return (
    <ImageBackground source={BG} className="flex-1" resizeMode="cover" style={{ backgroundColor: "#1a1008" }}>
      <StatusBar style="light" />
      <BattleFlash visible={flash} />

      {/* 相手 */}
      <View className="px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row justify-center mb-3" style={{ gap: 6 }}>
          {Array.from({ length: opponentHandCount || 3 }).map((_, i) => (
            <FaceDownCard key={i} visible={opponentHandCount > 0} w={miniW} h={miniH} />
          ))}
        </View>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="font-bold mb-1" style={{ fontSize: 12, color: "#D4C4A0" }}>{opponentName}</Text>
            <TurnBadge text={`ターン数 ${game.currentTurn}/10`} width={turnW} />
          </View>
          <View className="items-center">
            <Text style={{ fontSize: 11, color: "#D4C4A0" }}>単位数</Text>
            <CreditBadge value={opponentCredits} bonus={0} size={badgeSize} />
          </View>
        </View>
      </View>

      {/* タイマー */}
      <View className="flex-1 items-center justify-center">
        {isMyTurn ? (
          <Text className="font-black" style={{ fontSize: 32, color: timerColor }}>{timeLeft}s</Text>
        ) : (
          <Text className="italic" style={{ fontSize: 16, color: "#8B7355" }}>相手の行動を待っています...</Text>
        )}
      </View>

      {/* 自分 */}
      <View className="flex-row items-center px-4 py-2">
        <View className="items-center">
          <Text style={{ fontSize: 11, color: "#D4C4A0" }}>単位数</Text>
          <CreditBadge value={commit} bonus={handVal} size={badgeSize} />
        </View>
        <View className="flex-1" />
        {isMyTurn && (
          <Pressable
            onPress={() => { submitAction({ type: "pass" }); setSel(null); }}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}
          >
            <View className="items-center justify-center" style={{ width: 130, height: 56 }}>
              <Image source={IMG_PASS} className="absolute w-full h-full" resizeMode="contain" />
              <Text className="font-black" style={{ fontSize: 18, color: "#2a1a0a" }}>パス</Text>
            </View>
          </Pressable>
        )}
      </View>

      {/* 手札 */}
      <View className="px-2 pt-2" style={{ paddingBottom: insets.bottom + 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}>
          {(myHand as Card[]).map((c, i) => (
            <HandCard key={c.uid} card={c} isSelected={sel === i} disabled={!isMyTurn} onPress={() => isMyTurn && setSel(sel === i ? null : i)} w={cardW} h={cardH} />
          ))}
        </ScrollView>
      </View>

      <CardDetailPopup
        card={selected} visible={selected !== null}
        onUse={() => { if (sel !== null) { setFlash(true); setTimeout(() => setFlash(false), 300); submitAction({ type: "use", cardIndex: sel }); setSel(null); } }}
        onKeep={() => { submitAction({ type: "pass" }); setSel(null); }}
        onClose={() => setSel(null)}
      />
    </ImageBackground>
  );
}

// ═══════════════ ルート ══════════════════════════════════════════════════════

export default function GameScreen() {
  const { mode, gameId, playerId, opponentName, playerName } = useLocalSearchParams<{
    mode?: string; gameId?: string; playerId?: string; opponentName?: string; playerName?: string;
  }>();

  if (mode === "online" && gameId && playerId)
    return <OnlineGameScreen gameId={gameId} playerId={playerId} opponentName={opponentName ?? "相手"} />;
  return <CpuGameScreen playerName={playerName ?? ""} />;
}
