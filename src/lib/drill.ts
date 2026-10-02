import { BANK } from "@/data/bank";
import type { Item, Kind, Level } from "@/data/types";

export type PointStat = { correct: number; wrong: number; last: number };

export type Store = {
  points: Record<string, PointStat>;
  recentIds: string[];
  target: number;
  rounds: { correct: number; total: number; target: number; at: number }[];
};

export type RoundQuestion = Item & { order: string[] };

export type RoundAnswer = {
  id: string;
  point: string;
  kind: Kind;
  choice: string;
  correct: boolean;
};

const KEY = "n3-drill-v3";

export const emptyStore = (): Store => ({
  points: {},
  recentIds: [],
  target: 3,
  rounds: [],
});

export function loadStore(): Store {
  if (typeof localStorage === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Store;
    return {
      points: parsed.points ?? {},
      recentIds: parsed.recentIds ?? [],
      target: clamp(parsed.target ?? 3),
      rounds: parsed.rounds ?? [],
    };
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

function clamp(n: number) {
  return Math.min(5, Math.max(2, Math.round(n)));
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleOptions(item: Item, salt: string): string[] {
  const texts = item.options.map((o) => o.text);
  const rand = rng(hash(item.id + salt));
  for (let i = texts.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [texts[i], texts[j]] = [texts[j], texts[i]];
  }
  return texts;
}

export function nextTarget(current: number, correct: number, total: number) {
  const acc = total === 0 ? 0 : correct / total;
  if (acc >= 0.8) return clamp(current + 1);
  if (acc <= 0.4) return clamp(current - 1);
  return clamp(current);
}

export function buildRound(store: Store, salt = String(Date.now())): RoundQuestion[] {
  const recent = new Set(store.recentIds.slice(0, 40));
  const target = store.target;
  const unseenLeft = BANK.some((q) => !store.points[q.point]);

  const scoreOf = (item: Item, reviewSlot: boolean) => {
    const stat = store.points[item.point];
    let score = 0;
    if (!stat) score += 10;
    else if (stat.wrong > stat.correct) score += 4;
    else score += 1;
    if (reviewSlot) {
      score += item.difficulty <= target ? 1 : 0;
      score += hash(item.id) % 5;
    } else {
      const dist = Math.abs(item.difficulty - target);
      score += dist === 0 ? 5 : dist === 1 ? 2 : -4;
    }
    if (recent.has(item.id)) score -= 8;
    return score;
  };

  const picked: Item[] = [];
  const usedPoints = new Set<string>();
  const usedGroups = new Set<string>();
  let weakUsed = 0;

  const pull = (filter: (q: Item) => boolean, ignoreWeakCap = false) => {
    const item = [...BANK]
      .filter((q) => {
        if (usedPoints.has(q.point)) return false;
        if (!filter(q)) return false;
        const stat = store.points[q.point];
        const weak = !!stat && stat.wrong > stat.correct;
        if (!ignoreWeakCap && weak && weakUsed >= 2 && unseenLeft) return false;
        return true;
      })
      .sort((a, b) => {
        const ga = usedGroups.has(a.group) ? -2 : 0;
        const gb = usedGroups.has(b.group) ? -2 : 0;
        return scoreOf(b, ignoreWeakCap) + gb - (scoreOf(a, ignoreWeakCap) + ga) || a.id.localeCompare(b.id);
      })[0];
    if (!item) return false;
    const stat = store.points[item.point];
    if (!ignoreWeakCap && stat && stat.wrong > stat.correct) weakUsed += 1;
    picked.push(item);
    usedPoints.add(item.point);
    usedGroups.add(item.group);
    return true;
  };

  const review = (q: Item) => q.level === "N4" || q.level === "N5";
  pull((q) => review(q) && q.kind === "grammar", true);
  pull((q) => review(q) && q.kind === "vocab", true);
  while (picked.filter((q) => review(q)).length < 2) {
    if (!pull(review, true)) break;
  }

  while (picked.length < 10) {
    const grammar = picked.filter((q) => q.kind === "grammar").length;
    const vocab = picked.filter((q) => q.kind === "vocab").length;
    const prefer: Kind | undefined = grammar < 7 ? "grammar" : vocab < 3 ? "vocab" : undefined;
    if (prefer && pull((q) => q.kind === prefer)) continue;
    if (!pull(() => true)) break;
  }

  return picked.map((item) => ({ ...item, order: shuffleOptions(item, salt) }));
}

export function commitRound(store: Store, answers: RoundAnswer[], targetUsed: number): Store {
  const points = { ...store.points };
  const now = Date.now();
  for (const ans of answers) {
    const prev = points[ans.point] ?? { correct: 0, wrong: 0, last: 0 };
    points[ans.point] = {
      correct: prev.correct + (ans.correct ? 1 : 0),
      wrong: prev.wrong + (ans.correct ? 0 : 1),
      last: now,
    };
  }
  const correct = answers.filter((a) => a.correct).length;
  const next = nextTarget(targetUsed, correct, answers.length);
  const recentIds = [...answers.map((a) => a.id).reverse(), ...store.recentIds].slice(0, 80);
  const rounds = [{ correct, total: answers.length, target: targetUsed, at: now }, ...store.rounds].slice(0, 12);
  return { points, recentIds, target: next, rounds };
}

export function coverage(store: Store) {
  const grammarPoints = uniquePoints("grammar");
  const vocabPoints = uniquePoints("vocab");
  const seen = (list: string[]) => list.filter((p) => store.points[p]).length;
  const weak = Object.entries(store.points)
    .filter(([, s]) => s.wrong > s.correct)
    .map(([point]) => point);
  const levelCount = (level: Level) => {
    const list = [...new Set(BANK.filter((q) => q.level === level).map((q) => q.point))];
    return { seen: seen(list), total: list.length };
  };
  return {
    grammar: { seen: seen(grammarPoints), total: grammarPoints.length },
    vocab: { seen: seen(vocabPoints), total: vocabPoints.length },
    weak,
    bank: BANK.length,
    n3: levelCount("N3"),
    n4: levelCount("N4"),
    n5: levelCount("N5"),
  };
}

function uniquePoints(kind: Kind) {
  return [...new Set(BANK.filter((q) => q.kind === kind).map((q) => q.point))];
}

export function optionOf(item: Item, text: string) {
  return item.options.find((o) => o.text === text)!;
}
