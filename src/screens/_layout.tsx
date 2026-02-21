import "../../global.css";
import { Stack } from "expo-router";
import { useEffect, useRef, createContext, useContext } from "react";
import { Audio } from "expo-av";

export const SoundContext = createContext({
  playClickSound: async () => {},
  playTitleBgm: async () => {},
  playBattleBgm: async () => {},
});

export default function RootLayout() {

  const bgmRef = useRef<Audio.Sound | null>(null);

  // ─── BGMを安全に切り替える共通関数 ─────────────────────────────────
  const playBgm = async (source: any) => {
    try {
      // 今流れているBGMがあれば止めて解放する
      if (bgmRef.current) {
        await bgmRef.current.unloadAsync();
        bgmRef.current = null;
      }
      // 新しいBGMをセットして再生
      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: true,
        isLooping: true, // ループ再生
      });
      bgmRef.current = sound;
    } catch (error) {
      console.warn("BGM切り替えエラー:", error);
    }
  };

  // ─── 各BGMを呼び出す専用関数 ───────────────────────────────────────
  // ※ファイル名はご自身の環境に合わせて変更してください（bgm.mp3 / battle-bgm.mp3）
  const playTitleBgm = async () => playBgm(require("../assets/sounds/title-bgm.mp3"));
  const playBattleBgm = async () => {};

  // ─── アプリ起動時の初期設定 ────────────────────────────────────────
  useEffect(() => {
    // マナーモードでも音を鳴らす（iOS対応）
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    
    // アプリ起動時はタイトルBGMを鳴らす
    playTitleBgm();

    // アプリ終了時にBGMを解放
    return () => {
      if (bgmRef.current) bgmRef.current.unloadAsync();
    };
  }, []);

  // ─── SE（効果音）を鳴らす関数 ──────────────────────────────────────
  const playClickSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/click.mp3") // ※ファイル名は適宜変更してください
      );
      await sound.playAsync();
      
      // 再生が終わったら自動でメモリから消す
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.warn("SEエラー:", error);
    }
  };

  return (
    <SoundContext.Provider value={{ playClickSound, playTitleBgm, playBattleBgm }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="name" />
        <Stack.Screen name="matching" />
        <Stack.Screen name="game" />
        <Stack.Screen name="battle-result" />
        <Stack.Screen name="result" />
      </Stack>
    </SoundContext.Provider>
  );
}

// ─── 他の画面から簡単に呼び出すための便利フック ───────────────────────
export const useSound = () => useContext(SoundContext);
