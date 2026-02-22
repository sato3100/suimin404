import "../../global.css";
import { Stack } from "expo-router";
import { useEffect, useRef, createContext, useContext } from "react";
import { Audio } from "expo-av";

export const SoundContext = createContext({
  playClickSound: async () => {},
  playTitleBgm: async () => {},
  playBattleBgm: async () => {},
  playWinBgm: async () => {},
  playLoseBgm: async () => {},
  playMatchSound: async () => {},
  playGameBtnSound: async () => {}, // ★ゲーム画面用ボタン音
  playDrawSound: async () => {},    // ★カードを引く音
  playAttackSound: async () => {},  // ★攻撃（使用）音
  playCreditSound: async () => {},  // ★単位ゲット（パス/キープ）音
  playChatSendSound: async () => {}, // ★チャット送信音
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
        volume: 0.1,
      });
      bgmRef.current = sound;
    } catch (error) {
      console.warn("BGM切り替えエラー:", error);
    }
  };

  // ─── 各BGMを呼び出す専用関数 ───────────────────────────────────────
  // ※ファイル名はご自身の環境に合わせて変更してください（bgm.mp3 / battle-bgm.mp3）
  const playTitleBgm = async () => playBgm(require("../assets/sounds/title-bgm.mp3"));
  const playBattleBgm = async () => playBgm(require("../assets/sounds/battle-bgm.mp3"));
  const playWinBgm = async () => playBgm(require("../assets/sounds/win.mp3"));
  const playLoseBgm = async () => playBgm(require("../assets/sounds/lose.mp3"));

  // ─── アプリ起動時の初期設定 ────────────────────────────────────────
  useEffect(() => {
    // マナーモードでも音を鳴らす（iOS対応）
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

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
      await sound.setVolumeAsync(0.4);
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

  // ─── SE（マッチ効果音）を鳴らす関数 ──────────────────────────────────────
  const playMatchSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/match.mp3") // ※用意したシャキーンのファイル名にしてください
      );
      await sound.setVolumeAsync(1.0);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
      });
    } catch (error) {
      console.warn("SEエラー:", error);
    }
  };

  const playSound = async (source: any) => {
    try {
      const { sound } = await Audio.Sound.createAsync(source);
      await sound.setVolumeAsync(0.2);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
      });
    } catch (error) {
      console.warn("SEエラー:", error);
    }
  };

  const playGameBtnSound = () => playSound(require("../assets/sounds/btn-game.mp3"));
  const playDrawSound = () => playSound(require("../assets/sounds/draw.mp3"));
  const playAttackSound = () => playSound(require("../assets/sounds/attack.mp3"));
  const playCreditSound = () => playSound(require("../assets/sounds/get-credit.mp3"));

  const playChatSendSound = () => playSound(require("../assets/sounds/chat-send.mp3"));

  return (
    <SoundContext.Provider value={{
        playClickSound, 
        playTitleBgm, 
        playBattleBgm, 
        playWinBgm, 
        playLoseBgm, 
        playMatchSound, 
        playGameBtnSound, 
        playDrawSound, 
        playAttackSound, 
        playCreditSound,
        playChatSendSound,
      }}>
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
