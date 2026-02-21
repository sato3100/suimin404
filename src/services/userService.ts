import { db } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";

export interface UserData {
  userId: string;
  name: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function createUser(name: string): Promise<UserData> {
  const userId = generateId();
  const userData: UserData = {
    userId,
    name,
    rating: 1000,
    gamesPlayed: 0,
    wins: 0,
  };
  await setDoc(doc(db, "users", userId), userData);
  return userData;
}
