import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";

export default function AiErrorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ detail?: string }>();
  const detail = params.detail ? decodeURIComponent(params.detail) : "No se recibió detalle.";
  return (
    <ScreenContainer className="bg-slate-950">
      <View className="flex-1 gap-5 p-6">
        <Text className="text-3xl font-bold text-white" accessibilityRole="header">ERROR DE IA</Text>
        <Text className="text-lg text-slate-300">El juego puede continuar con la IA local.</Text>
        <ScrollView className="flex-1 rounded-2xl bg-slate-900 p-4" accessibilityRole="text">
          <Text selectable className="text-base text-white">{detail}</Text>
        </ScrollView>
        <TouchableOpacity className="rounded-2xl bg-blue-800 px-5 py-5" onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver">
          <Text className="text-center text-xl font-bold text-white">VOLVER</Text>
        </TouchableOpacity>
        <TouchableOpacity className="rounded-2xl bg-amber-700 px-5 py-5" onPress={() => router.replace("/settings" as never)} accessibilityRole="button" accessibilityLabel="Configurar clave de Gemini">
          <Text className="text-center text-xl font-bold text-white">CONFIGURAR CLAVE</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
