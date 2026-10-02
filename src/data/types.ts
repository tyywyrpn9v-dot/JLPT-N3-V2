export type Kind = "grammar" | "vocab";
export type Level = "N5" | "N4" | "N3";

export type Opt = {
  text: string;
  meaning: string;
  connection: string;
  why: string;
  example: string;
  zh: string;
};

export type Item = {
  id: string;
  kind: Kind;
  point: string;
  group: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  stem: string;
  gloss: string;
  answer: string;
  level: Level;
  options: [Opt, Opt, Opt, Opt];
};

export const GROUP_LABEL: Record<string, string> = {
  cause: "原因・結果",
  contrast: "逆接・對比",
  condition: "條件",
  time: "時間・順序",
  change: "變化",
  decision: "決定・規則",
  modal: "推量・樣態",
  degree: "程度・限定",
  purpose: "目的",
  aspect: "動作狀態",
  voice: "受身・使役・敬語",
  tendency: "傾向",
  stance: "立場・基準",
  addition: "附加・範圍",
  "v-adv": "副詞語感",
  "v-verb": "自他・搭配",
  "v-noun": "名詞用法",
  kanji: "漢字讀音",
  giving: "授受",
  speech: "引用・傳遞",
  advice: "建議",
};
