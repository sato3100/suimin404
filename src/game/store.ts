import { GameResult } from "./engine";

let _lastResult: GameResult | null = null;

export function setLastResult(result: GameResult): void {
  _lastResult = result;
}

export function getLastResult(): GameResult | null {
  return _lastResult;
}

// 通信対戦結果
export interface OnlineResult {
  myCredits: number;
  opponentCredits: number;
  myName: string;
  opponentName: string;
  won: boolean;
  myGraduated: boolean;
  opponentGraduated: boolean;
}

let _lastOnlineResult: OnlineResult | null = null;

export function setLastOnlineResult(result: OnlineResult): void {
  _lastOnlineResult = result;
}

export function getLastOnlineResult(): OnlineResult | null {
  return _lastOnlineResult;
}
