import { useEffect, useState } from "react";
import { ActivityIndicator, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { loadGeminiSettings, saveGeminiSettings, testGeminiKey } from "@/lib/gemini";
import { say } from "@/lib/voice";

export default function SettingsScreen() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadGeminiSettings().then((settings) => {
      setKey(settings.key);
      setEnabled(settings.enabled);
    });
  }, []);

  async function save() {
    setBusy(true);
    try {
      const cleaned = await saveGeminiSettings(key, enabled);
      setKey(cleaned);
      setStatus(enabled ? "Clave guardada. IA activada." : "Clave guardada. IA desactivada.");
      say(enabled ? "Clave guardada. IA activada." : "Clave guardada. IA desactivada.");
    } catch (error) {
      setStatus(`No se pudo guardar: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setStatus("Probando clave...");
    try {
      const model = await testGeminiKey(key);
      setStatus(`Clave válida. Respondió ${model}.`);
      say(`La clave funciona. Modelo ${model}.`, true);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setStatus(`Error: ${detail}`);
      say("La prueba de la clave falló.", true);
      router.push({ pathname: "/ai-error", params: { detail: encodeURIComponent(detail) } } as never);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer className="bg-slate-950">
      <View className="flex-1 gap-5 p-6">
        <Text className="text-3xl font-bold text-white" accessibilityRole="header">CONFIGURACIÓN</Text>
        <Text className="text-base text-slate-300">La clave se guarda solo en este teléfono. No se incluye en el código ni en la APK.</Text>
        <TextInput
          className="rounded-2xl bg-white px-4 py-5 text-lg text-black"
          value={key}
          onChangeText={setKey}
          placeholder="Pegá tu clave API de Gemini"
          placeholderTextColor="#555"
          secureTextEntry
          autoCapitalize="none"
          accessibilityLabel="Clave API de Gemini"
        />
        <View className="flex-row items-center justify-between rounded-2xl bg-slate-900 px-4 py-4">
          <Text className="flex-1 text-lg text-white">Usar IA de Gemini</Text>
          <Switch value={enabled} onValueChange={setEnabled} accessibilityLabel="Usar IA de Gemini" />
        </View>
        <TouchableOpacity className="rounded-2xl bg-blue-800 px-5 py-5" onPress={save} disabled={busy} accessibilityRole="button" accessibilityLabel="Guardar clave y configuración">
          <Text className="text-center text-xl font-bold text-white">GUARDAR</Text>
        </TouchableOpacity>
        <TouchableOpacity className="rounded-2xl bg-amber-700 px-5 py-5" onPress={test} disabled={busy} accessibilityRole="button" accessibilityLabel="Probar clave de Gemini">
          {busy ? <ActivityIndicator color="white" /> : <Text className="text-center text-xl font-bold text-white">PROBAR CLAVE</Text>}
        </TouchableOpacity>
        {!!status && <Text selectable className="text-base text-white" accessibilityLiveRegion="polite">{status}</Text>}
        <TouchableOpacity className="mt-auto rounded-2xl bg-slate-700 px-5 py-5" onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver al menu principal">
          <Text className="text-center text-xl font-bold text-white">VOLVER</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
