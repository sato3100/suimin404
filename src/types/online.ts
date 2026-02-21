import { Card } from "@/data/cards";

export type Action = { type: "use"; cardIndex: number } | { type: "pass" };

export type LobbyStatus = "waiting" | "matched" | "playing" | "ended";

export interface OnlinePlayer {
  userId: string;
  name: string;
  rating: number;
}

export interface Lobby {
  id: string;
  status: LobbyStatus;
  player1: OnlinePlayer;
  player2: OnlinePlayer | null;
  gameId: string | null;
}

export interface OnlineGameState {
  gameId: string;
  myPlayerId: string;
  opponentName: string;
  myHand: Card[];
  opponentHandCount: number;
  myCredits: number;
  opponentCredits: number;
  currentTurn: number;
  isMyTurn: boolean;
  status: "playing" | "ended";
  winnerId: string | null;
  log: string[];
}

export interface FirestoreGame {
  lobbyId: string;
  player1Id: string;
  player2Id: string;
  deckSeed: number;
  currentTurn: number;
  player1Hand: Card[];
  player2Hand: Card[];
  player1BonusCredits: number;
  player2BonusCredits: number;
  player1UsedVolunteer: boolean;
  player2UsedVolunteer: boolean;
  status: "playing" | "ended";
  winnerId: string | null;
  log: string[];
}
