import { db } from "@/firebase";
import { doc, runTransaction } from "firebase/firestore";

const K = 32; // Eloレーティングのに係数

function expectedScore(myRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - myRating) / 400));
}

export async function updateRating(
  userId: string,
  won: boolean,
  opponentRating: number,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    const currentRating: number = data.rating ?? 1000;
    const gamesPlayed: number = data.gamesPlayed ?? 0;
    const wins: number = data.wins ?? 0;

    const expected = expectedScore(currentRating, opponentRating);
    const actual = won ? 1 : 0;
    const newRating = Math.round(currentRating + K * (actual - expected));

    tx.update(userRef, {
      rating: Math.max(100, newRating), // 最低100
      gamesPlayed: gamesPlayed + 1,
      wins: won ? wins + 1 : wins,
    });
  });
}
