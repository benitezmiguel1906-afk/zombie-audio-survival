import { ScrollView, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";

export default function InstructionsScreen() {
  const router = useRouter();
  return (
    <ScreenContainer className="bg-slate-950">
      <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
        <Text className="text-3xl font-bold text-white" accessibilityRole="header">
          INSTRUCCIONES
        </Text>
        <Text className="text-lg leading-8 text-slate-200">
          Jugá con auriculares y con el teléfono en horizontal. Los zombies se oyen desde donde están: a la izquierda, a la derecha, adelante o atrás. Si un zombie suena apagado, está detrás de vos.
        </Text>
        <Text className="text-lg leading-8 text-slate-200">
          Movimiento: deslizá un dedo hacia arriba para avanzar, hacia abajo para retroceder, y hacia los lados para moverte a la izquierda o a la derecha. Siempre mirás hacia adelante.
        </Text>
        <Text className="text-lg leading-8 text-slate-200">
          Disparo: doble toque. La bala sale hacia adelante y solo acierta si el zombie está en tu misma columna. Cuando su sonido llega al centro, estás alineado: disparale.
        </Text>
        <Text className="text-lg leading-8 text-slate-200">
          Recarga: tocá con dos dedos a la vez, o usá el botón RECARGAR. Tarda dos segundos y no podés disparar mientras tanto. Estado: mantené un dedo pulsado y el juego te dice vida, munición y dónde está el zombie más cercano.
        </Text>
        <Text className="text-lg leading-8 text-slate-200">
          Los zombies no siempre vienen de frente. Algunos merodean, otros te siguen por el ruido de tus pasos y tus disparos, y los más astutos intentan rodearte. Al superar una oleada se repone tu munición y recuperás un poco de vida. La partida termina cuando tu vida llega a cero.
        </Text>
        <TouchableOpacity
          className="rounded-2xl bg-blue-800 px-5 py-5"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver al menu principal"
        >
          <Text className="text-center text-xl font-bold text-white">VOLVER</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
