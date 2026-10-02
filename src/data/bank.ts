import { contrast } from "./g-contrast";
import { cause } from "./g-cause";
import { condition } from "./g-condition";
import { time } from "./g-time";
import { core } from "./g-core";
import { more } from "./g-more";
import { gap } from "./g-gap";
import { extra } from "./g-extra";
import { near } from "./g-near";
import { baseGrammar } from "./g-base";
import { vocab } from "./vocab";
import { vocabMore } from "./v-more";
import { vocabBase } from "./v-base";
import { vocabNear } from "./v-near";
import type { Item } from "./types";

export const BANK: Item[] = [
  ...contrast,
  ...cause,
  ...condition,
  ...time,
  ...core,
  ...more,
  ...gap,
  ...extra,
  ...near,
  ...baseGrammar,
  ...vocab,
  ...vocabMore,
  ...vocabBase,
  ...vocabNear,
];

export function validateBank(items: Item[] = BANK): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) errors.push(`duplicate id ${item.id}`);
    ids.add(item.id);
    if (!item.stem.includes("＿＿")) errors.push(`${item.id} missing blank`);
    if (item.options.length !== 4) errors.push(`${item.id} option count`);
    const texts = item.options.map((o) => o.text);
    if (new Set(texts).size !== 4) errors.push(`${item.id} duplicate option text`);
    if (!texts.includes(item.answer)) errors.push(`${item.id} answer not in options`);
    for (const opt of item.options) {
      for (const key of ["meaning", "connection", "why", "example", "zh"] as const) {
        if (!opt[key] || opt[key].trim().length < 2) errors.push(`${item.id} ${opt.text} empty ${key}`);
      }
    }
  }
  return errors;
}
