# プロジェクト構造と使い方

Expo + React Native + NativeWind + Expo Router を使った suimin404 の構成です。

---

## ディレクトリ構造

```
suimin404/
├── src/
│   ├── assets/           # 画像・フォントなど静的なファイル
│   │   └── images/       # icon.png, favicon.png, splash-icon.png, Andアプリのアイコンなど
│   └── screens/          # 画面＝ルート（Expo Router の「app」に相当）
│       ├── _layout.tsx   # ルートレイアウト（Stack）
│       └── (tabs)/       # タブグループ
│           ├── _layout.tsx   # タブレイアウト
│           ├── index.tsx     # ホーム（/）
│           ├── search.tsx    # 検索（/search）
│           └── profile.tsx   # マイページ（/profile）
├── global.css            # Tailwind（NativeWind）のエントリ
├── app.json              # Expo アプリの設定ファイル
├── package.json          # 依存パッケージとスクリプト
├── tsconfig.json         # TypeScript 設定（@/* → src/* のエイリアス）
├── tailwind.config.js    # Tailwind（NativeWind）の設定
├── metro.config.js       # Metro バンドラーの設定
├── babel.config.cjs      # Babel の設定
├── eslint.config.js      # ESLint の設定
├── .prettierrc.mjs       # Prettier の設定
├── expo-env.d.ts         # Expo の型定義（自動生成）
├── nativewind-env.d.ts   # NativeWind の型定義（自動生成）
└── app-example/          # Expo のサンプルアプリ（参考用）
```

---

## どこで何を管理するか

| 役割 | 置き場所 | 例 |
|------|----------|-----|
| **画面（ルート）** | `src/screens/` | 各ファイルが URL に対応 |
| **ルートレイアウト** | `src/screens/_layout.tsx` | Stack ナビゲーション、`global.css` の読み込み |
| **タブレイアウト** | `src/screens/(tabs)/_layout.tsx` | タブバーの設定 |
| **タブ画面** | `src/screens/(tabs)/` | `index.tsx` → `/`, `search.tsx` → `/search` など |
| **画像・アイコン** | `src/assets/images/` | icon.png, favicon.png, splash-icon.png, Android用アイコンなど |
| **スタイルのベース** | `global.css` | `@tailwind base/components/utilities`|

### 今後追加が想定されるディレクトリ

| 役割 | 置き場所 | 用途 |
|------|----------|------|
| **再利用コンポーネント** | `src/components/` | ボタン、カード、フォーム部品など |
| **汎用 UI 部品** | `src/components/ui/` | デザインシステム的な小さな部品 |
| **カスタムフック** | `src/hooks/` | useTheme, useAuth など |
| **定数・テーマ** | `src/constants/` | 色、フォントサイズ、API URL など |
| **API・ビジネスロジック** | `src/services/` | サーバーとの通信処理、データ加工など |

---

## コンポーネントの使い方

### 1. コンポーネントを置く

例: 共通ボタンを作る場合

```
src/components/ui/Button.tsx
```

```tsx
import { Pressable, Text } from "react-native";

type Props = {
  title: string;
  onPress: () => void;
  className?: string;
};

export function Button({ title, onPress, className = "" }: Props) {
  return (
    <Pressable onPress={onPress} className={`rounded-lg bg-blue-500 px-4 py-2 ${className}`}>
      <Text className="text-white font-medium">{title}</Text>
    </Pressable>
  );
}
```

### 2. 画面からインポートする（パスエイリアス `@/`）

`tsconfig.json` で `@/*` が `src/*` に対応しているので、次のように書けます。

```tsx
// src/screens/(tabs)/index.tsx
import { View, Text } from "react-native";
import { Button } from "@/components/ui/Button";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold">suimin404</Text>
      <Button title="押す" onPress={() => {}} />
    </View>
  );
}
```

### 3. 新しい画面を追加する

- **タブに追加**: `src/screens/(tabs)/` に `〇〇.tsx` を追加し、`(tabs)/_layout.tsx` の `<Tabs>` にも `<Tabs.Screen>` を追加
- **タブ外の画面**: `src/screens/` に `〇〇.tsx` を追加 → URL は `/〇〇`
- **グループ化**: `src/screens/(groups)/〇〇.tsx` のように `()` でグループ化（URL には `(groups)` は出ない）

---

## スタイル（NativeWind / Tailwind）

- コンポーネントでは **`className`** に Tailwind のクラスを指定します。
- `style` と混在しても動きますが、統一するなら `className` 中心がおすすめです。

```tsx
<View className="flex-1 items-center justify-center bg-gray-100">
  <Text className="text-xl font-bold text-gray-900">見出し</Text>
</View>
```

- クラスを増やしたい場合は `tailwind.config.js` の `theme.extend` で拡張できます。

---

## 現在の構造で気をつけること

1. **ルートは `src/screens`**
   `app.json` の `expo-router` プラグインで `"root": "./src/screens"` を指定しているため、**画面用のファイルは必ず `src/screens/` 以下**に置いてください。
2. **`_layout.tsx`**
   レイアウト用の特別なファイルです。`src/screens/_layout.tsx` で `global.css` の読み込みと Stack ナビゲーションを、`(tabs)/_layout.tsx` でタブバーの設定を行っています。
3. **`index.tsx`**
   フォルダの「トップ」＝そのパスのルートになります。`src/screens/(tabs)/index.tsx` が `/` に対応します。
4. **`()` 付きフォルダ**
   `(tabs)` のように括弧で囲んだフォルダ名は URL パスに影響しません。グループ化のためだけに使います。

---

## コンソールのメッセージについて

- **GET http://localhost:8081/ 404**
  ブラウザがルート `/` や favicon などを取得しようとして 404 になることがあります。favicon のパスは `app.json` で `./src/assets/images/favicon.png` に修正済みです。それでも 404 が出る場合は、キャッシュ削除や再起動で解消することがあります。
- **props.pointerEvents is deprecated. Use style.pointerEvents**
  React Native Web 側の非推奨警告です。アプリの動作には通常影響しません。ライブラリの更新で解消されることがあります。
- **Download the React DevTools**
  開発用の案内です。入れるとデバッグがしやすくなります。
