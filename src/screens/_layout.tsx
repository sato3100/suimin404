import "../../global.css";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="name" />
      <Stack.Screen name="matching" />
      <Stack.Screen name="game" />
      <Stack.Screen name="battle-result" />
      <Stack.Screen name="result" />
    </Stack>
  );
}
