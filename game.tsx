import { useEffect, useRef, useState } from "react";
import { AppState, PanResponder, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { ScreenContainer } from "@/components/screen-container";
import {
  LOOP_MS,
  createInitialState,
  createMap,
  move,
  shoot,
  startReload,
  statusText,
  tick,
  type EngineEvent,
  type GameState,
  type Move,
} from "@/lib/engine";
import { playSfx, playZombieAt, prepareGameAudio, releaseGameAudio } from "@/lib/audio";
import { say, stopVoice } from "@/lib/voice";
import { loadGeminiSettings, planNextWave, type WavePlan } from "@/lib/gemini";

const map = createMap();
const SWIPE_MIN = 50;
const TAP_MAX = 24;
const DOUBLE_TAP_MS = 400;
const HOLD_MS = 700;
const HEALTH_ALERTS = [60, 30, 15];

export default function GameScreen() {
  const router = useRouter();
  useKeepAwake();

  const [initial] = useState(() => createInitialState(Date.now()));
  const gameRef = useRef<GameState>(initial);
  const [game, setGame] = useState<GameState>(initial);
  const pausedRef = useRef(false);
  const lastTap = useRef(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdFired = useRef(false);
  const maxTouches = useRef(1);
  const lastSaid = useRef<Record<string, number>>({});
  const exitArmedAt = useRef(0);
  const moved = useRef({ izquierda: 0, derecha: 0, adelante: 0, atras: 0 });
  const saidOffline = useRef(false);

  function commit(next: GameState) {
    gameRef.current = next;
    setGame(next);
  }

  // Habla un mensaje, pero no lo repite si ya se dijo hace poco.
  function sayOnce(text: string, gapMs = 2500, critical = false) {
    const now = Date.now();
    if (now - (lastSaid.current[text] ?? 0) < gapMs) return;
    lastSaid.current[text] = now;
    say(text, critical);
  }

  function handleEvents(events: EngineEvent[], healthBefore: number, healthAfter: number) {
    for (const e of events) {
      switch (e.type) {
        case "moved":
          playSfx("paso", 0.5);
          break;
        case "wall":
          playSfx("pared", 0.8);
          sayOnce(e.by === "pared" ? "Pared." : "Un zombie te bloquea.");
          break;
        case "shot":
          playSfx("disparo");
          if (e.hit) {
            playSfx(e.killed ? "caida" : "impacto", 0.9);
          }
          break;
        case "empty":
          playSfx("sin_balas");
          sayOnce("Sin balas. Recargá.", 3000);
          break;
        case "busy":
          sayOnce("Recargando.", 3000);
          break;
        case "reload":
          playSfx(e.phase === 1 ? "recarga_1" : e.phase === 2 ? "recarga_2" : "recarga_3");
          break;
        case "reloaded":
          sayOnce("Lista.", 1000);
          break;
        case "damage":
          playSfx("dano");
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case "growl":
          playZombieAt(e.dx, e.ahead, e.distance);
          break;
        case "wave-start":
          playSfx("ola");
          say(`Oleada ${e.wave}.`);
          break;
        case "wave-clear":
          say(`Oleada ${e.wave} superada. Munición repuesta.`);
          break;
        case "game-over":
          break;
      }
    }
    for (const threshold of HEALTH_ALERTS) {
      if (healthBefore > threshold && healthAfter <= threshold && healthAfter > 0) {
        say(`Vida ${healthAfter}.`, true);
        break;
      }
    }
  }

  function movePlayer(direction: Move) {
    moved.current[direction] += 1;
    const before = gameRef.current;
    const result = move(before, map, direction);
    commit(result.state);
    handleEvents(result.events, before.health, result.state.health);
  }

  function fire() {
    const before = gameRef.current;
    const result = shoot(before, map, Date.now());
    if (result.events.length === 0) return;
    commit(result.state);
    handleEvents(result.events, before.health, result.state.health);
  }

  function reload() {
    const result = startReload(gameRef.current, Date.now());
    if (!result.started) {
      if (!gameRef.current.reloading) sayOnce("No hace falta recargar.", 3000);
      return;
    }
    commit(result.state);
    handleEvents(result.events, result.state.health, result.state.health);
  }

  function announceState() {
    say(statusText(gameRef.current), true);
  }

  function exitGame() {
    const now = Date.now();
    if (now - exitArmedAt.current < 3000) {
      router.back();
      return;
    }
    exitArmedAt.current = now;
    say("Tocá Salir otra vez para abandonar la partida.", true);
  }

  useEffect(() => {
    let cancelled = false;
    void loadGeminiSettings().then(async ({ key, enabled }) => {
      if (cancelled || !enabled || !key) {
        if (!saidOffline.current) {
          saidOffline.current = true;
          say("Modo sin IA.");
        }
        return;
      }
      const totalShots = gameRef.current.shotsFired;
      const accuracy = totalShots > 0 ? gameRef.current.shotsHit / totalShots : 0.5;
      const counts = moved.current;
      const mostMoved = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "adelante";
      try {
        const plan = await planNextWave(key, gameRef.current.wave, gameRef.current.health, accuracy, gameRef.current.kills, mostMoved);
        if (cancelled) return;
        const total = plan.composicion.reduce((sum, group) => sum + group.cantidad, 0);
        const current = gameRef.current;
        const next: GameState = { ...current, wavePlan: plan, toSpawn: Math.min(total, current.toSpawn + 2), wavePlanCursor: 0 };
        commit(next);
        say(plan.narracion);
      } catch {
        if (!saidOffline.current) {
          saidOffline.current = true;
          say("Modo sin IA.");
        }
      }
    });
    return () => { cancelled = true; };
  }, [game.wave]);

  useEffect(() => {
    void prepareGameAudio();
    say(
      "Partida iniciada. Deslizá arriba para avanzar, abajo para retroceder, a los lados para moverte. Doble toque para disparar. Dos dedos para recargar. Mantené pulsado para oír el estado.",
    );
    const timer = setInterval(() => {
      if (pausedRef.current || gameRef.current.health <= 0) return;
      const before = gameRef.current.health;
      const result = tick(gameRef.current, map, Date.now());
      commit(result.state);
      if (result.events.length > 0) handleEvents(result.events, before, result.state.health);
    }, LOOP_MS);
    const appState = AppState.addEventListener("change", (status) => {
      pausedRef.current = status !== "active";
    });
    return () => {
      clearInterval(timer);
      appState.remove();
      stopVoice();
      releaseGameAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gameOver = game.health <= 0;
  useEffect(() => {
    if (gameOver) {
      const s = gameRef.current;
      say(`Has caído en la oleada ${s.wave}. Puntaje ${s.score}.`, true);
    }
  }, [gameOver]);

  function clearHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        holdFired.current = false;
        maxTouches.current = evt.nativeEvent.touches.length;
        clearHold();
        holdTimer.current = setTimeout(() => {
          holdFired.current = true;
          announceState();
        }, HOLD_MS);
      },
      onPanResponderMove: (evt, gesture) => {
        maxTouches.current = Math.max(maxTouches.current, evt.nativeEvent.touches.length);
        if (Math.hypot(gesture.dx, gesture.dy) > TAP_MAX) clearHold();
      },
      onPanResponderRelease: (_, gesture) => {
        clearHold();
        if (holdFired.current) return;
        const distance = Math.hypot(gesture.dx, gesture.dy);
        if (distance < TAP_MAX) {
          if (maxTouches.current >= 2) {
            reload();
            return;
          }
          const now = Date.now();
          if (now - lastTap.current < DOUBLE_TAP_MS) {
            lastTap.current = 0;
            fire();
          } else {
            lastTap.current = now;
          }
          return;
        }
        if (Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
          if (gesture.dx > SWIPE_MIN) movePlayer("derecha");
          else if (gesture.dx < -SWIPE_MIN) movePlayer("izquierda");
        } else if (gesture.dy < -SWIPE_MIN) movePlayer("adelante");
        else if (gesture.dy > SWIPE_MIN) movePlayer("atras");
      },
      onPanResponderTerminate: () => clearHold(),
    }),
  ).current;

  if (gameOver) {
    return (
      <ScreenContainer className="bg-slate-950">
        <View className="flex-1 flex-row items-center justify-center gap-6 p-6">
          <View className="flex-1 gap-3">
            <Text className="text-center text-4xl font-bold text-red-500" accessibilityRole="header">
              FIN DE LA PARTIDA
            </Text>
            <Text className="text-center text-xl text-white">
              Oleada {game.wave}. Puntaje: {game.score}. Zombies abatidos: {game.kills}.
            </Text>
          </View>
          <View className="flex-1 gap-4">
            <TouchableOpacity
              className="rounded-2xl bg-red-700 px-6 py-5"
              onPress={() => router.replace("/game" as never)}
              accessibilityRole="button"
              accessibilityLabel="Volver a jugar"
            >
              <Text className="text-center text-2xl font-bold text-white">VOLVER A JUGAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-2xl bg-slate-700 px-6 py-5"
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Volver al menu principal"
            >
              <Text className="text-center text-2xl font-bold text-white">MENÚ PRINCIPAL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-slate-950">
      <View className="flex-1 flex-row gap-3 p-3">
        <View
          {...responder.panHandlers}
          className="flex-1 justify-center rounded-2xl bg-slate-900 p-4"
          accessible
          accessibilityLabel="Área de juego. Deslizá para moverte. Doble toque para disparar. Dos dedos para recargar. Mantené pulsado para oír el estado."
        >
          <Text className="text-center text-2xl font-bold text-white">
            Vida {game.health} · Munición {game.ammo} · Oleada {game.wave}
          </Text>
          <Text className="mt-2 text-center text-lg text-slate-300">Zombies: {game.zombies.length}</Text>
          <Text className="mt-2 text-center text-xl text-white">{game.lastEvent}</Text>
        </View>
        <View className="w-48 gap-3">
          <TouchableOpacity
            className="flex-1 justify-center rounded-2xl bg-red-700 px-3"
            onPress={fire}
            accessibilityRole="button"
            accessibilityLabel="Disparar"
          >
            <Text className="text-center text-xl font-bold text-white">DISPARAR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 justify-center rounded-2xl bg-amber-700 px-3"
            onPress={reload}
            accessibilityRole="button"
            accessibilityLabel="Recargar arma"
          >
            <Text className="text-center text-xl font-bold text-white">RECARGAR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 justify-center rounded-2xl bg-slate-700 px-3"
            onPress={exitGame}
            accessibilityRole="button"
            accessibilityLabel="Salir de la partida"
            accessibilityHint="Tocá dos veces seguidas para abandonar"
          >
            <Text className="text-center text-xl font-bold text-white">SALIR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
