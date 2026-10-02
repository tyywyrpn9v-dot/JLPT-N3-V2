import type { Item, Level, Opt } from "./types";

export const o = (
  text: string,
  meaning: string,
  connection: string,
  why: string,
  example: string,
  zh: string,
): Opt => ({ text, meaning, connection, why, example, zh });

export function g(
  id: string,
  point: string,
  group: string,
  difficulty: 1 | 2 | 3 | 4 | 5,
  stem: string,
  gloss: string,
  answer: string,
  options: [Opt, Opt, Opt, Opt],
  level: Level = "N3",
): Item {
  return { id, kind: "grammar", point, group, difficulty, stem, gloss, answer, options, level };
}

export function v(
  id: string,
  point: string,
  group: string,
  difficulty: 1 | 2 | 3 | 4 | 5,
  stem: string,
  gloss: string,
  answer: string,
  options: [Opt, Opt, Opt, Opt],
  level: Level = "N3",
): Item {
  return { id, kind: "vocab", point, group, difficulty, stem, gloss, answer, options, level };
}
