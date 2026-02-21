import { GameState, useCard, passTurn } from "./engine";

/**
 * CPU AI
 * - 攻撃/妨害カードを優先
 * - 手札が多いときは使用寄り、少ないときはキープ寄り
 */
export function cpuAction(state: GameState): GameState {
  const hand = state.cpuHand;
  if (hand.length === 0) return passTurn(state);

  // 65%の確率でカードを使う
  if (Math.random() < 0.65) {
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

    const idx =
      attackIdx >= 0
        ? attackIdx
        : boostIdx >= 0
          ? boostIdx
          : Math.floor(Math.random() * hand.length);
    return useCard(state, idx);
  }

  return passTurn(state);
}
