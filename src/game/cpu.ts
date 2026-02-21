import { GameState, useCard, passTurn } from "./engine";

/**
 * CPU AI（Phase 1: ランダム行動）
 * - 50%の確率でカードを使用、50%でパス
 * - 攻撃カードを優先的に使う傾向あり
 */
export function cpuAction(state: GameState): GameState {
  const hand = state.cpuHand;
  if (hand.length === 0) return passTurn(state);

  // 60%の確率でカードを使う
  if (Math.random() < 0.6) {
    // 攻撃カードがあれば優先
    const attackIdx = hand.findIndex(
      (c) => c.effectType === "attack" || c.effectType === "gamble",
    );
    const idx = attackIdx >= 0 ? attackIdx : Math.floor(Math.random() * hand.length);
    return useCard(state, idx);
  }

  return passTurn(state);
}
