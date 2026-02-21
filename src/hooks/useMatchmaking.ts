import { useState, useEffect, useRef } from "react";
import { Lobby } from "@/types/online";
import { createUser } from "@/services/userService";
import {
  findOrCreateLobby,
  subscribeLobby,
} from "@/services/matchmaking";
import { startGame } from "@/services/gameService";

export type MatchmakingStatus =
  | "idle"
  | "creating"
  | "waiting"
  | "matched"
  | "starting"
  | "ready"
  | "error";

export interface MatchmakingState {
  status: MatchmakingStatus;
  lobby: Lobby | null;
  userId: string | null;
  gameId: string | null;
  errorMessage: string | null;
}

export function useMatchmaking(name: string) {
  const [state, setState] = useState<MatchmakingState>({
    status: "idle",
    lobby: null,
    userId: null,
    gameId: null,
    errorMessage: null,
  });

  const unsubRef = useRef<(() => void) | null>(null);
  const userIdRef = useRef<string | null>(null);
  const lobbyIdRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  const startMatchmaking = async () => {
    if (state.status !== "idle") return;
    setState((s) => ({ ...s, status: "creating" }));

    try {
      const user = await createUser(name);
      userIdRef.current = user.userId;
      setState((s) => ({ ...s, userId: user.userId, status: "waiting" }));

      const lobbyId = await findOrCreateLobby(
        user.userId,
        user.name,
        user.rating,
      );
      lobbyIdRef.current = lobbyId;

      // ロビーをリアルタイム監視
      unsubRef.current = subscribeLobby(lobbyId, async (lobby) => {
        setState((s) => ({ ...s, lobby }));

        if (lobby.status === "matched" && !startedRef.current) {
          // player1だけがstartGameを呼ぶ
          if (lobby.player1.userId === userIdRef.current) {
            startedRef.current = true;
            setState((s) => ({ ...s, status: "starting" }));
            try {
              const gameId = await startGame(
                lobbyId,
                lobby.player1.userId,
                lobby.player2!.userId,
              );
              setState((s) => ({ ...s, status: "ready", gameId }));
            } catch {
              setState((s) => ({
                ...s,
                status: "error",
                errorMessage: "ゲーム開始に失敗しました",
              }));
            }
          } else {
            setState((s) => ({ ...s, status: "matched" }));
          }
        }

        if (lobby.status === "playing" && lobby.gameId) {
          setState((s) => ({
            ...s,
            status: "ready",
            gameId: lobby.gameId,
          }));
        }
      });
    } catch (e) {
      setState((s) => ({
        ...s,
        status: "error",
        errorMessage: "マッチングに失敗しました",
      }));
    }
  };

  const cancel = () => {
    unsubRef.current?.();
    setState({
      status: "idle",
      lobby: null,
      userId: null,
      gameId: null,
      errorMessage: null,
    });
  };

  useEffect(() => {
    return () => {
      unsubRef.current?.();
    };
  }, []);

  return { state, startMatchmaking, cancel };
}
