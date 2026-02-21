import { Pressable, Text, View } from "react-native";

interface ChalkboardButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function ChalkboardButton({
  label,
  onPress,
  disabled = false,
}: ChalkboardButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <View
        style={{
          backgroundColor: "#15803d",
          paddingVertical: 14,
          paddingHorizontal: 32,
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
        }}
      >
        <Text
          style={{
            color: "#ffffff",
            fontSize: 18,
            fontWeight: "900",
            textAlign: "center",
            letterSpacing: 1,
          }}
        >
          {label}
        </Text>
      </View>
      {/* チョーク受け */}
      <View
        style={{
          backgroundColor: "#92400e",
          height: 10,
          borderBottomLeftRadius: 10,
          borderBottomRightRadius: 10,
        }}
      />
    </Pressable>
  );
}
