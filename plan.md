# Zombie Audio Survival

## Objetivo
Crear un juego Android accesible en tiempo real, pensado para personas ciegas, con controles grandes, lectura compatible con TalkBack y Jieshuo, orientación sonora y una primera mecánica de supervivencia.

## Primera versión aprobada
La primera versión será un juego en tiempo real con botones accesibles. Incluirá menú principal, partida nueva, movimiento, giro, disparo, recarga, vida, munición, enemigo básico y registro hablado de eventos.

## Diseño
- Movimiento: interfaz de alto contraste, botones grandes y orden lógico vertical.
- Audio: todos los eventos importantes también aparecerán como texto accesible para el lector de pantalla.
- Interacción: cada acción tendrá etiqueta, descripción y respuesta hablada mediante `accessibilityLiveRegion`.
- Identidad: estilo oscuro de supervivencia, con rojo para peligro y azul para acciones.

## Estructura
- `app/(tabs)/index.tsx`: menú principal.
- `app/game.tsx`: partida en tiempo real y estado del jugador.
- `assets/audio/`: sonidos del juego cuando sean entregados o generados.
- `app.config.ts`: identidad y configuración Android.

## Evolución posterior
Después de validar la primera partida, se incorporarán audio ambiente, pasos, zombies, disparos, recarga, balance espacial izquierda/derecha, inventario y guardado.

## Versión 0.5
- Pantalla en horizontal. Movimiento con deslizamientos: arriba avanza, abajo retrocede, izquierda y derecha se desplazan. Doble toque dispara. Dos dedos recargan. Mantener pulsado dice el estado.
- Sin giro: el jugador siempre mira adelante. El disparo acierta solo en la misma columna, sin paredes en medio.
- Zombies con IA sin conexión (lib/ai.ts): buscan camino, oyen pasos y disparos, dudan, se desvían y los acechadores flanquean.
- Director de oleadas: cantidad y tipo de zombies según la oleada y la puntería.
- Gemidos cortos y poco frecuentes, con balance izquierda/derecha y versión apagada cuando el zombie está detrás.
- Sonidos de prueba generados con scripts/generar_sonidos.py. Los originales están en assets/audio/zombies-originales.
