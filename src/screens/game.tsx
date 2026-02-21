import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Modal } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSound } from "./_layout"; // ★ 追加
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

// ─── カラー定数 ─────────────────────────────────────────────────────────────
const COLORS = {
  bg: "#0f172a",
  panel: "#1e293b",
  border: "#334155",
  muted: "#64748b",
  text: "#e2e8f0",
  subtle: "#94a3b8",
  accent: "#4ade80",
  accentDark: "#14532d",
  danger: "#dc2626",
  cardBack: "#7f1d1d",
  graduated: "#16a34a",
  graduatedBorder: "#4ade80",
  graduatedLight: "#bbf7d0",
} as const;

// ─── カードサイズ定数 ────────────────────────────────────────────────────────
const CARD = { width: 80, height: 110, radius: 10 } as const;
const MINI_CARD = { width: 44, height: 60, radius: 6 } as const;

// ─── バトルフラッシュ（カード使用時の画面フラッシュエフェクト） ──────────────
function BattleFlash({ visible }: { visible: boolean }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withSequence(
        withTiming(0.7, { duration: 60 }),
        withTiming(0, { duration: 250 }),
      );
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "#fff",
          zIndex: 100,
        },
        style,
      ]}
    />
  );
}

// ─── フィールドカード（ドロー時にスライドインするカード表示） ────────────────
function FieldCard({ card }: { card: Card | null }) {
  const translateX = useSharedValue(80);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (card) {
      translateX.value = 80;
      opacity.value = 0;
      rotate.value = 0;
      translateX.value = withSpring(0, { damping: 12, stiffness: 90 });
      rotate.value = withSpring(-12, { damping: 8, stiffness: 60 });
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      opacity.value = withTiming(0, { duration: 100 });
    }
  }, [card?.uid]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  if (!card) {
    return (
      <View
        style={{
          width: CARD.width,
          height: CARD.height,
          borderRadius: CARD.radius,
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: "rgba(255,255,255,0.15)",
        }}
      />
    );
  }

  return (
    <Animated.View
      style={[
        {
          width: CARD.width,
          height: CARD.height,
          borderRadius: CARD.radius,
          backgroundColor: "#fff",
          padding: 8,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 6,
        },
        animStyle,
      ]}
    >
      {/* TODO: card.image が追加されたら <Image> に差し替え */}
      <Text style={{ fontSize: 28 }}>{card.emoji}</Text>
      <Text
        style={{ marginTop: 4, fontSize: 10, fontWeight: "700", color: "#333" }}
        numberOfLines={1}
      >
        {card.name}
      </Text>
      <Text style={{ fontSize: 10, color: "#666", marginTop: 2 }}>
        {card.keepValue}単位
      </Text>
    </Animated.View>
  );
}

// ─── 山札（重なり表現付き） ─────────────────────────────────────────────────
function DeckPile({ count }: { count: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ position: "relative", width: CARD.width, height: CARD.height }}>
        {/* 奥のカード2枚でスタック感を演出 */}
        <View style={{ position: "absolute", top: -4, left: -3, width: CARD.width, height: CARD.height, backgroundColor: "#374155", borderRadius: CARD.radius }} />
        <View style={{ position: "absolute", top: -2, left: -1, width: CARD.width, height: CARD.height, backgroundColor: "#475569", borderRadius: CARD.radius }} />
        <View style={{ width: CARD.width, height: CARD.height, backgroundColor: COLORS.muted, borderRadius: CARD.radius, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.text }}>
            山札
          </Text>
        </View>
      </View>
      <Text style={{ marginTop: 6, fontSize: 11, color: COLORS.subtle }}>
        {count}枚
      </Text>
    </View>
  );
}

// ─── 単位バッジ（丸型の単位表示） ───────────────────────────────────────────
function CreditBadge({
  committed,
  handValue,
  graduated,
}: {
  committed: number;
  handValue: number;
  graduated: boolean;
}) {
  return (
    <View
      style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: graduated ? COLORS.graduated : COLORS.panel,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: graduated ? COLORS.graduatedBorder : COLORS.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: "#fff" }}>
          {committed}
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: graduated ? COLORS.graduatedLight : COLORS.accent,
          }}
        >
          +{handValue}
        </Text>
      </View>
    </View>
  );
}

// ─── 相手の裏向きカード1枚 ──────────────────────────────────────────────────
function FaceDownCard({ visible }: { visible: boolean }) {
  return (
    <View
      style={{
        width: MINI_CARD.width,
        height: MINI_CARD.height,
        borderRadius: MINI_CARD.radius,
        backgroundColor: visible ? COLORS.cardBack : COLORS.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {visible && <Text style={{ fontSize: 14 }}>🃏</Text>}
    </View>
  );
}

// ─── 手札カード（選択時に浮き上がるアニメーション付き） ─────────────────────
function HandCard({
  card,
  isSelected,
  onPress,
  disabled,
}: {
  card: Card;
  isSelected: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  const ty = useSharedValue(0);

  useEffect(() => {
    ty.value = withTiming(isSelected ? -12 : 0, { duration: 120 });
  }, [isSelected]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <Animated.View
        style={[
          {
            width: CARD.width,
            height: CARD.height,
            borderRadius: CARD.radius,
            borderWidth: isSelected ? 3 : 1,
            borderColor: isSelected ? COLORS.accent : COLORS.border,
            backgroundColor: isSelected ? COLORS.accentDark : COLORS.panel,
            padding: 8,
            alignItems: "center",
            justifyContent: "center",
            opacity: disabled ? 0.4 : 1,
          },
          anim,
        ]}
      >
        {/* TODO: card.image が追加されたら <Image> に差し替え */}
        <Text style={{ fontSize: 28 }}>{card.emoji}</Text>
        <Text
          style={{
            marginTop: 4,
            fontSize: 10,
            fontWeight: "700",
            color: COLORS.text,
            textAlign: "center",
          }}
          numberOfLines={1}
        >
          {card.name}
        </Text>
        <Text style={{ fontSize: 10, color: COLORS.subtle, marginTop: 2 }}>
          {card.keepValue}単位
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── カード詳細ポップアップ（使う / パス の選択UI） ─────────────────────────
function CardDetailPopup({
  card,
  visible,
  onUse,
  onKeep,
  onClose,
}: {
  card: Card | null;
  visible: boolean;
  onUse: () => void;
  onKeep: () => void;
  onClose: () => void;
}) {
  if (!card) return null;

  const isAttack = card.effectType === "attack";
  const effectLabel = isAttack
    ? `相手 ${card.effectValue}単位`
    : `自分 +${card.effectValue}単位`;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            width: "100%",
            maxWidth: 320,
            backgroundColor: COLORS.panel,
            borderRadius: 16,
            padding: 24,
            alignItems: "center",
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={{ fontSize: 52 }}>{card.emoji}</Text>
          <Text style={{ fontSize: 20, fontWeight: "900", color: "#fff", marginTop: 10 }}>
            {card.name}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: COLORS.subtle,
              marginTop: 8,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            {card.description}
          </Text>

          {/* ステータス比較 */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 24, marginTop: 16 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: COLORS.muted }}>キープ</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.accent }}>
                +{card.keepValue}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: COLORS.border }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: COLORS.muted }}>使用効果</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: isAttack ? "#f87171" : "#60a5fa",
                }}
              >
                {effectLabel}
              </Text>
            </View>
          </View>

          {/* アクションボタン */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 20, width: "100%" }}>
            <Pressable
              onPress={onUse}
              style={{
                flex: 1,
                backgroundColor: COLORS.danger,
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>使う</Text>
            </Pressable>
            <Pressable
              onPress={onKeep}
              style={{
                flex: 1,
                backgroundColor: COLORS.border,
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: COLORS.subtle, fontWeight: "700", fontSize: 15 }}>パス</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── 相手エリア（裏向き手札 + 名前 + 単位） ────────────────────────────────
function OpponentArea({
  name,
  handCount,
  displayTurn,
  creditBadge,
  paddingTop,
}: {
  name: string;
  handCount: number;
  displayTurn: number;
  creditBadge: React.ReactNode;
  paddingTop: number;
}) {
  const cards = handCount > 0
    ? Array.from({ length: handCount })
    : Array.from({ length: 4 });

  return (
    <View style={{ backgroundColor: COLORS.panel, paddingTop, paddingHorizontal: 16, paddingBottom: 14 }}>
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
        {cards.map((_, i) => (
          <FaceDownCard key={i} visible={handCount > 0} />
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text }}>{name}</Text>
          <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
            ターン {displayTurn}/8
          </Text>
        </View>
        {creditBadge}
      </View>
    </View>
  );
}

// ─── 自分エリア（名前 + 単位 + パスボタン） ─────────────────────────────────
function PlayerInfoBar({
  playerName,
  creditBadge,
  canAct,
  isOpponentTurn,
  onPass,
}: {
  playerName: string;
  creditBadge: React.ReactNode;
  canAct: boolean;
  isOpponentTurn: boolean;
  onPass: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10 }}>
      <View>
        <Text style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>
          {playerName || "あなた"}
        </Text>
        {creditBadge}
      </View>
      <View style={{ flex: 1 }} />
      {canAct && (
        <Pressable
          onPress={onPass}
          style={{
            backgroundColor: COLORS.border,
            borderRadius: 20,
            paddingHorizontal: 24,
            paddingVertical: 12,
          }}
        >
          <Text style={{ fontWeight: "700", color: COLORS.subtle, fontSize: 15 }}>パス</Text>
        </Pressable>
      )}
      {isOpponentTurn && (
        <Text style={{ fontSize: 13, color: "#475569", fontStyle: "italic" }}>
          相手のターン...
        </Text>
      )}
    </View>
  );
}

// ─── 手札エリア（横スクロール） ─────────────────────────────────────────────
function HandArea({
  hand,
  selectedCard,
  canAct,
  onSelect,
  paddingBottom,
}: {
  hand: Card[];
  selectedCard: number | null;
  canAct: boolean;
  onSelect: (index: number | null) => void;
  paddingBottom: number;
}) {
  return (
    <View
      style={{
        backgroundColor: COLORS.panel,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingHorizontal: 8,
        paddingTop: 12,
        paddingBottom: paddingBottom + 12,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}
      >
        {hand.map((card, i) => (
          <HandCard
            key={card.uid}
            card={card}
            isSelected={selectedCard === i}
            disabled={!canAct}
            onPress={() => canAct && onSelect(selectedCard === i ? null : i)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CPU対戦画面
// ═════════════════════════════════════════════════════════════════════════════
function CpuGameScreen({ playerName }: { playerName: string }) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<GameState>(createInitialState);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [showFlash, setShowFlash] = useState(false);

  // 派生データ
  const playerTurn = isPlayerTurn(state.turn);
  const playerCredits = getPlayerCredits(state);
  const cpuCredits = getCpuCredits(state);
  const displayTurn = Math.ceil(state.turn / 2);
  const committed = STARTING_CREDITS + state.playerBonusCredits;
  const handValue = state.playerHand.reduce((s, c) => s + c.keepValue, 0);
  const cpuCommitted = STARTING_CREDITS + state.cpuBonusCredits;
  const cpuHandValue = state.cpuHand.reduce((s, c) => s + c.keepValue, 0);
  const selected = selectedCard !== null ? state.playerHand[selectedCard] : null;
  const canAct = playerTurn && state.phase === "action";

  // ドローしたカードをフィールドに表示
  useEffect(() => {
    if (state.phase === "action" && playerTurn && state.playerHand.length > 0) {
      setDrawnCard(state.playerHand[state.playerHand.length - 1]);
    } else {
      setDrawnCard(null);
    }
  }, [state.turn, state.phase]);

  // ゲーム進行の自動処理（ドロー・CPU行動・終了判定）
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
    if (state.phase === "action" && !playerTurn) {
      const t = setTimeout(() => {
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 300);
        setState((s) => cpuAction(s));
      }, 900);
      return () => clearTimeout(t);
    }
  }, [state.phase, state.turn, playerTurn]);

  // カード使用ハンドラ
  const handleUse = useCallback((idx: number) => {
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 300);
    setState((s) => useCard(s, idx));
    setSelectedCard(null);
  }, []);

  // パスハンドラ
  const handlePass = useCallback(() => {
    setState((s) => passTurn(s));
    setSelectedCard(null);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar style="light" />
      <BattleFlash visible={showFlash} />

      <OpponentArea
        name="🤖 CPU"
        handCount={state.cpuHand.length}
        displayTurn={displayTurn}
        paddingTop={insets.top + 8}
        creditBadge={
          <CreditBadge
            committed={cpuCommitted}
            handValue={cpuHandValue}
            graduated={cpuCredits >= GRADUATION_CREDITS}
          />
        }
      />

      {/* フィールド（ドローカード + 山札） */}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 48, paddingHorizontal: 24 }}>
        <FieldCard card={drawnCard} />
        <DeckPile count={state.deck.length} />
      </View>

      <PlayerInfoBar
        playerName={playerName}
        canAct={canAct}
        isOpponentTurn={!playerTurn && state.phase !== "ended"}
        onPass={handlePass}
        creditBadge={
          <CreditBadge
            committed={committed}
            handValue={handValue}
            graduated={playerCredits >= GRADUATION_CREDITS}
          />
        }
      />

      <HandArea
        hand={state.playerHand}
        selectedCard={selectedCard}
        canAct={canAct}
        onSelect={setSelectedCard}
        paddingBottom={insets.bottom}
      />

      <CardDetailPopup
        card={selected}
        visible={selected !== null}
        onUse={() => selectedCard !== null && handleUse(selectedCard)}
        onKeep={handlePass}
        onClose={() => setSelectedCard(null)}
      />
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 通信対戦画面
// ═════════════════════════════════════════════════════════════════════════════
function OnlineGameScreen({
  gameId,
  playerId,
  opponentName,
}: {
  gameId: string;
  playerId: string;
  opponentName: string;
}) {
  const insets = useSafeAreaInsets();
  const {
    game, isMyTurn, myHand, opponentHandCount,
    myCredits, opponentCredits, timeLeft, loading, submitAction,
  } = useOnlineGame(gameId, playerId);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);

  // ゲーム終了時に結果を保存して遷移
  useEffect(() => {
    if (!game || game.status !== "ended") return;

    const isPlayer1 = playerId === game.player1Id;
    const myHandData = isPlayer1 ? game.player1Hand : game.player2Hand;
    const opponentHandData = isPlayer1 ? game.player2Hand : game.player1Hand;
    const myBonus = isPlayer1 ? game.player1BonusCredits : game.player2BonusCredits;
    const opponentBonus = isPlayer1 ? game.player2BonusCredits : game.player1BonusCredits;
    const myC = STARTING_CREDITS + myHandData.reduce((s, c) => s + c.keepValue, 0) + myBonus;
    const oppC = STARTING_CREDITS + opponentHandData.reduce((s, c) => s + c.keepValue, 0) + opponentBonus;

    setLastOnlineResult({
      myCredits: myC,
      opponentCredits: oppC,
      myName: "あなた",
      opponentName,
      won: game.winnerId === playerId,
      myGraduated: myC >= GRADUATION_CREDITS,
      opponentGraduated: oppC >= GRADUATION_CREDITS,
    });

    const t = setTimeout(() => router.replace("/battle-result?mode=online"), 800);
    return () => clearTimeout(t);
  }, [game?.status]);

  if (loading || !game) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg }}>
        <Text style={{ color: COLORS.muted }}>読み込み中...</Text>
      </View>
    );
  }

  const selected = selectedCard !== null ? myHand[selectedCard] : null;
  const timerColor = timeLeft > 30 ? COLORS.muted : timeLeft > 10 ? "#d97706" : COLORS.danger;
  const myBonus = game.player1Id === playerId ? game.player1BonusCredits : game.player2BonusCredits;
  const committed = STARTING_CREDITS + myBonus;
  const handValue = myHand.reduce((s, c) => s + c.keepValue, 0);
  const displayTurn = Math.ceil(game.currentTurn / 2);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar style="light" />
      <BattleFlash visible={showFlash} />

      <OpponentArea
        name={`🎓 ${opponentName}`}
        handCount={opponentHandCount}
        displayTurn={displayTurn}
        paddingTop={insets.top + 8}
        creditBadge={
          <CreditBadge
            committed={opponentCredits}
            handValue={0}
            graduated={opponentCredits >= GRADUATION_CREDITS}
          />
        }
      />

      {/* フィールド（タイマー表示） */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {isMyTurn ? (
          <Text style={{ fontSize: 28, fontWeight: "900", color: timerColor }}>
            ⏱ {timeLeft}s
          </Text>
        ) : (
          <Text style={{ fontSize: 15, color: "#475569", fontStyle: "italic" }}>
            相手の行動を待っています...
          </Text>
        )}
      </View>

      {/* 自分情報 + パス */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10 }}>
        <CreditBadge
          committed={committed}
          handValue={handValue}
          graduated={myCredits >= GRADUATION_CREDITS}
        />
        <View style={{ flex: 1 }} />
        {isMyTurn && (
          <Pressable
            onPress={() => {
              submitAction({ type: "pass" });
              setSelectedCard(null);
            }}
            style={{
              backgroundColor: COLORS.border,
              borderRadius: 20,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            <Text style={{ fontWeight: "700", color: COLORS.subtle, fontSize: 15 }}>パス</Text>
          </Pressable>
        )}
      </View>

      <HandArea
        hand={myHand as Card[]}
        selectedCard={selectedCard}
        canAct={isMyTurn}
        onSelect={setSelectedCard}
        paddingBottom={insets.bottom}
      />

      <CardDetailPopup
        card={selected}
        visible={selected !== null}
        onUse={() => {
          if (selectedCard !== null) {
            setShowFlash(true);
            setTimeout(() => setShowFlash(false), 300);
            submitAction({ type: "use", cardIndex: selectedCard });
            setSelectedCard(null);
          }
        }}
        onKeep={() => {
          submitAction({ type: "pass" });
          setSelectedCard(null);
        }}
        onClose={() => setSelectedCard(null)}
      />
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ルートコンポーネント（モードに応じてCPU/通信対戦を切り替え）
// ═════════════════════════════════════════════════════════════════════════════
export default function GameScreen() {
  const { mode, gameId, playerId, opponentName, playerName } = useLocalSearchParams<{
    mode?: string;
    gameId?: string;
    playerId?: string;
    opponentName?: string;
    playerName?: string;
  }>();

  //ContextからバトルBGM再生用の関数をもらう
  const { playBattleBgm } = useSound();

  //この画面（ゲーム画面）が表示された時にバトルBGMに切り替える
  useEffect(() => {
    playBattleBgm();
  }, []);

  if (mode === "online" && gameId && playerId) {
    return (
      <OnlineGameScreen
        gameId={gameId}
        playerId={playerId}
        opponentName={opponentName ?? "相手"}
      />
    );
  }
  return <CpuGameScreen playerName={playerName ?? ""} />;
}
