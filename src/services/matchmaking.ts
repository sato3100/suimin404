import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  addDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { Lobby, OnlinePlayer } from "@/types/online";

export async function findOrCreateLobby(
  userId: string,
  name: string,
  rating: number,
): Promise<string> {
  // 既存の waiting ロビーを探す
  const q = query(
    collection(db, "lobbies"),
    where("status", "==", "waiting"),
    limit(5),
  );
  const snap = await getDocs(q);

  // 自分が作ったロビーは除外してjoin
  for (const lobbyDoc of snap.docs) {
    const data = lobbyDoc.data();
    if (data.player1?.userId !== userId) {
      try {
        await joinLobby(lobbyDoc.id, userId, name, rating);
        return lobbyDoc.id;
      } catch {
        // 競合した場合は次のロビーを試す
      }
    }
  }

  // 空きがなければ新規作成
  const player1: OnlinePlayer = { userId, name, rating };
  const lobbyRef = await addDoc(collection(db, "lobbies"), {
    status: "waiting",
    player1,
    player2: null,
    createdAt: serverTimestamp(),
    gameId: null,
  });
  return lobbyRef.id;
}

export async function joinLobby(
  lobbyId: string,
  userId: string,
  name: string,
  rating: number,
): Promise<void> {
  const player2: OnlinePlayer = { userId, name, rating };
  await runTransaction(db, async (tx) => {
    const lobbyRef = doc(db, "lobbies", lobbyId);
    const lobbySnap = await tx.get(lobbyRef);
    if (!lobbySnap.exists() || lobbySnap.data().status !== "waiting") {
      throw new Error("Lobby not available");
    }
    tx.update(lobbyRef, { player2, status: "matched" });
  });
}

export function subscribeLobby(
  lobbyId: string,
  callback: (lobby: Lobby) => void,
): () => void {
  return onSnapshot(doc(db, "lobbies", lobbyId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...(snap.data() as Omit<Lobby, "id">) });
    }
  });
}
