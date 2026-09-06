export type Activity = 'fruit' | 'wash' | 'water';
export type Screen = 'home' | 'ride' | 'activity' | 'reward' | 'garden';
export type Trip = {
  id: string;
  activity: Activity;
  step: number;
  hits: number[];
  variant: number;
};
export type Game = {
  version: 1;
  trips: number;
  animal: number;
  car: number;
  screen: Screen;
  trip: Trip | null;
  lastReward: number;
  gardenTaps: number[];
  gardenPositions: { x: number; y: number; moved?: boolean }[];
  weather: number;
  settings: { sound: boolean; motion: boolean };
};
export const SAVE_KEY = 'outing-garage-v1';
export const ANIMALS = ['くま', 'うさぎ', 'きつね', 'ぞう'];
export const CARS = [
  'きいろのくるま',
  'みどりのジープ',
  'オレンジのトラック',
  'あおいバス',
];
export const ACTIVITIES: Activity[] = ['fruit', 'wash', 'water'];
export const REWARDS = [
  { sprite: 11, name: 'おはなのプランター' },
  { sprite: 2, name: 'きつねのおともだち' },
  { sprite: 6, name: 'オレンジのトラック' },
  { sprite: 3, name: 'ぞうのおともだち' },
  { sprite: 13, name: 'すべりだい' },
  { sprite: 7, name: 'あおいバス' },
  { sprite: 14, name: 'あそびのテント' },
  { sprite: 15, name: 'にじのアーチ' },
];
export function freshGame(): Game {
  return {
    version: 1,
    trips: 0,
    animal: 0,
    car: 0,
    screen: 'home',
    trip: null,
    lastReward: -1,
    gardenTaps: Array(8).fill(0),
    gardenPositions: defaultGardenPositions(),
    weather: 0,
    settings: { sound: true, motion: true },
  };
}
export function defaultGardenPositions() {
  return Array.from({ length: 8 }, (_, i) => ({
    x: (i % 3) / 2,
    y: Math.floor(i / 3) / 2,
  }));
}
export const animalCount = (g: Game) =>
  2 + Number(g.trips >= 2) + Number(g.trips >= 4);
export const carCount = (g: Game) =>
  2 + Number(g.trips >= 3) + Number(g.trips >= 6);
export const targetCount = (a: Activity) => (a === 'wash' ? 5 : 3);
export const targetGoal = (a: Activity) => (a === 'water' ? 2 : 1);
export const growthLevel = (g: Game, i: number) =>
  g.trips <= i ? 0 : Math.min(3, 1 + Math.floor((g.trips - i - 1) / 8));
export type Action =
  | { type: 'animal' | 'car' | 'poke'; index: number }
  | { type: 'start'; activity: Activity; id: string }
  | { type: 'move' }
  | { type: 'hit'; index: number }
  | { type: 'place'; index: number; x: number; y: number }
  | { type: 'tidy' }
  | { type: 'home' | 'garden' | 'weather' | 'resume' }
  | { type: 'setting'; key: 'sound' | 'motion'; value: boolean };
export function transition(g: Game, a: Action): Game {
  if (a.type === 'tidy')
    return { ...g, gardenPositions: defaultGardenPositions() };
  if (a.type === 'place') {
    if (
      !Number.isInteger(a.index) ||
      a.index < 0 ||
      a.index >= Math.min(8, g.trips) ||
      !Number.isFinite(a.x) ||
      !Number.isFinite(a.y)
    )
      return g;
    return {
      ...g,
      gardenPositions: g.gardenPositions.map((p, i) =>
        i === a.index
          ? {
              x: Math.max(0, Math.min(1, a.x)),
              y: Math.max(0, Math.min(1, a.y)),
              moved: true,
            }
          : p,
      ),
    };
  }
  if (a.type === 'setting')
    return { ...g, settings: { ...g.settings, [a.key]: a.value } };
  if (a.type === 'animal')
    return Number.isInteger(a.index) && a.index >= 0 && a.index < animalCount(g)
      ? { ...g, animal: a.index }
      : g;
  if (a.type === 'car')
    return Number.isInteger(a.index) && a.index >= 0 && a.index < carCount(g)
      ? { ...g, car: a.index }
      : g;
  if (a.type === 'weather') return { ...g, weather: (g.weather + 1) % 3 };
  if (a.type === 'poke') {
    if (
      !Number.isInteger(a.index) ||
      a.index < 0 ||
      a.index >= Math.min(8, g.trips)
    )
      return g;
    return {
      ...g,
      gardenTaps: g.gardenTaps.map((n, i) =>
        i === a.index ? (n + 1) % 1000 : n,
      ),
    };
  }
  if (a.type === 'home' || a.type === 'garden')
    return {
      ...g,
      screen: a.type,
      trip: g.screen === 'reward' ? null : g.trip,
    };
  if (a.type === 'resume')
    return g.trip ? { ...g, screen: g.trip.step < 3 ? 'ride' : 'activity' } : g;
  if (a.type === 'start') {
    if (g.trip) return transition(g, { type: 'resume' });
    if (!ACTIVITIES.includes(a.activity)) return g;
    return {
      ...g,
      screen: 'ride',
      trip: {
        id: a.id,
        activity: a.activity,
        step: 0,
        hits: Array(targetCount(a.activity)).fill(0),
        variant: g.trips % 4,
      },
    };
  }
  if (a.type === 'move' && g.screen === 'ride' && g.trip) {
    const step = Math.min(3, g.trip.step + 1);
    return {
      ...g,
      screen: step === 3 ? 'activity' : 'ride',
      trip: { ...g.trip, step },
    };
  }
  if (a.type === 'hit' && g.screen === 'activity' && g.trip) {
    const trip = g.trip;
    if (
      !Number.isInteger(a.index) ||
      a.index < 0 ||
      a.index >= trip.hits.length ||
      trip.hits[a.index] >= targetGoal(trip.activity)
    )
      return g;
    const hits = trip.hits.map((n, i) => (i === a.index ? n + 1 : n));
    const finished = hits.every((n) => n >= targetGoal(trip.activity));
    return {
      ...g,
      trip: { ...trip, hits },
      screen: finished ? 'reward' : 'activity',
      trips: g.trips + Number(finished),
      lastReward: finished ? g.trips % 8 : g.lastReward,
    };
  }
  return g;
}
function integer(n: unknown, min: number, max: number): n is number {
  return Number.isInteger(n) && (n as number) >= min && (n as number) <= max;
}
export function parseSave(raw: string | null): Game | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Game;
    if (
      !v ||
      v.version !== 1 ||
      !integer(v.trips, 0, 1e9) ||
      !integer(v.animal, 0, 3) ||
      !integer(v.car, 0, 3) ||
      !integer(v.weather, 0, 2) ||
      !integer(v.lastReward, -1, 7)
    )
      return null;
    if (
      !['home', 'ride', 'activity', 'reward', 'garden'].includes(v.screen) ||
      !v.settings ||
      typeof v.settings.sound !== 'boolean' ||
      typeof v.settings.motion !== 'boolean'
    )
      return null;
    if (
      !Array.isArray(v.gardenTaps) ||
      v.gardenTaps.length !== 8 ||
      !v.gardenTaps.every((n) => integer(n, 0, 999))
    )
      return null;
    if (v.animal >= animalCount(v) || v.car >= carCount(v)) return null;
    // Older saves predate movable garden items. Preserve their progress.
    if (v.gardenPositions === undefined)
      v.gardenPositions = defaultGardenPositions();
    if (
      !Array.isArray(v.gardenPositions) ||
      v.gardenPositions.length !== 8 ||
      !v.gardenPositions.every(
        (p) =>
          p &&
          Number.isFinite(p.x) &&
          Number.isFinite(p.y) &&
          p.x >= 0 &&
          p.x <= 1 &&
          p.y >= 0 &&
          p.y <= 1 &&
          (p.moved === undefined || typeof p.moved === 'boolean'),
      )
    )
      return null;
    if (v.trip !== null) {
      const t = v.trip;
      if (
        !t ||
        typeof t.id !== 'string' ||
        !ACTIVITIES.includes(t.activity) ||
        !integer(t.step, 0, 3) ||
        !integer(t.variant, 0, 3) ||
        !Array.isArray(t.hits) ||
        t.hits.length !== targetCount(t.activity) ||
        !t.hits.every((n) => integer(n, 0, targetGoal(t.activity)))
      )
        return null;
      const complete = t.hits.every((n) => n === targetGoal(t.activity));
      if (
        complete !== (v.screen === 'reward') ||
        (v.screen === 'ride' && t.step === 3) ||
        (v.screen === 'activity' && t.step !== 3) ||
        (v.screen === 'reward' &&
          (t.step !== 3 || v.trips < 1 || v.lastReward < 0))
      )
        return null;
    } else if (['ride', 'activity', 'reward'].includes(v.screen)) return null;
    return v;
  } catch {
    return null;
  }
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function loadGame(storage: StorageLike): {
  game: Game;
  recovered: boolean;
  available: boolean;
} {
  try {
    const raw = storage.getItem(SAVE_KEY);
    const current = parseSave(raw);
    if (current) return { game: current, recovered: false, available: true };
    const backup = parseSave(storage.getItem(SAVE_KEY + '-backup'));
    return { game: backup ?? freshGame(), recovered: !!raw, available: true };
  } catch {
    return { game: freshGame(), recovered: false, available: false };
  }
}
export function saveGame(storage: StorageLike, game: Game): boolean {
  try {
    const previous = storage.getItem(SAVE_KEY);
    if (parseSave(previous)) {
      try {
        storage.setItem(SAVE_KEY + '-backup', previous!);
      } catch {
        /* Main save still takes priority. */
      }
    }
    storage.setItem(SAVE_KEY, JSON.stringify(game));
    return true;
  } catch {
    return false;
  }
}
export function resetStoredGame(storage: StorageLike): Game | null {
  const initial = freshGame();
  try {
    // Replace the recovery copy too, so a reset cannot resurrect old progress.
    storage.setItem(SAVE_KEY + '-backup', JSON.stringify(initial));
    storage.setItem(SAVE_KEY, JSON.stringify(initial));
    return initial;
  } catch {
    return null;
  }
}
