import { GameState, useCard, passTurn, getPlayerCredits, getCpuCredits } from "./engine";
import { GRADUATION_CREDITS, TOTAL_TURNS } from "@/data/cards";

/**
 * CPU AI
 * - スコア差・残りターン数・卒業閾値を考慮した判断
 * - 攻撃/妨害カードを優先
 * - 高ボーナスカードを次に優先
 */
export function cpuAction(state: GameState): GameState {
  const hand = state.cpuHand;
  if (hand.length === 0) return passTurn(state);

  const playerCredits = getPlayerCredits(state);
  const cpuCredits = getCpuCredits(state);
  const turnsLeft = TOTAL_TURNS - state.turn;
  const diff = playerCredits - cpuCredits; // 正 = プレイヤーがリード

  // 使用確率をゲーム状況で調整
  let useProbability = 0.65;

  // 大幅に負けていてターンが少ない → 積極的にカードを使う
  if (diff > 20 && turnsLeft <= 3) useProbability = 0.90;
  // リードしていて卒業ライン超えている → 保守的に
  else if (cpuCredits >= GRADUATION_CREDITS && diff < 0) useProbability = 0.30;
  // 卒業ラインに近い → 積極的に
  else if (cpuCredits < GRADUATION_CREDITS && GRADUATION_CREDITS - cpuCredits <= 20) useProbability = 0.80;
  // 相手が卒業ライン超えていて自分はまだ → 妨害優先で積極的
  else if (playerCredits >= GRADUATION_CREDITS && cpuCredits < GRADUATION_CREDITS) useProbability = 0.85;

  if (Math.random() < useProbability) {
    // 相手を妨害するカードを優先
    const attackIdx = hand.findIndex(
      (c) =>
        (c.useEffect.opponentBonus !== undefined && c.useEffect.opponentBonus < 0) ||
        c.useEffect.discardOpponent !== undefined,
    );
    // 高ボーナスカードを次に優先
    const boostIdx = hand.findIndex(
      (c) => (c.useEffect.selfBonus ?? 0) >= 10,
    );
    // 卒業ラインに近い時は中ボーナスカードも使う
    const smallBoostIdx = turnsLeft <= 2
      ? hand.findIndex((c) => (c.useEffect.selfBonus ?? 0) > 0)
      : -1;

    const idx =
      attackIdx >= 0
        ? attackIdx
        : boostIdx >= 0
          ? boostIdx
          : smallBoostIdx >= 0
            ? smallBoostIdx
            : Math.floor(Math.random() * hand.length);
    return useCard(state, idx);
  }

  return passTurn(state);
}
