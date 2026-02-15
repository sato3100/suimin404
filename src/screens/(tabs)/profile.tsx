import { View, Text } from "react-native";

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-slate-50 p-6">
      <View className="rounded-xl bg-white p-6 border border-slate-200 mt-4">
        <View className="w-16 h-16 rounded-full bg-indigo-100 items-center justify-center mb-4">
          <Text className="text-2xl text-indigo-600">👤</Text>
        </View>
        <Text className="text-lg font-semibold text-slate-800 mb-1">
          マイページ
        </Text>
        <Text className="text-slate-500">
          アカウント情報をここに配置。
        </Text>
      </View>
    </View>
  );
}
