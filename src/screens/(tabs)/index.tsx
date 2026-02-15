import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-slate-50 p-6">
      <View className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 mt-4">
        <Text className="text-2xl font-bold text-indigo-600 mb-2">
          suimin404
        </Text>
        <Text className="text-slate-500">ホーム画面</Text>
      </View>
    </View>
  );
}
