import { View, Text } from "react-native";

export default function SearchScreen() {
  return (
    <View className="flex-1 bg-slate-50 p-6">
      <View className="rounded-xl bg-white p-6 border border-slate-200 mt-4">
        <Text className="text-lg font-semibold text-slate-800 mb-2">
          検索
        </Text>
        <Text className="text-slate-500">
          検索バーや一覧をここに配置。
        </Text>
      </View>
    </View>
  );
}
