import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Check, RotateCcw, X } from "lucide-react";
import { BANK } from "@/data/bank";
import { GROUP_LABEL } from "@/data/types";
import type { Item } from "@/data/types";
import {
  buildRound,
  commitRound,
  coverage,
  loadStore,
  optionOf,
  saveStore,
  type RoundAnswer,
  type RoundQuestion,
  type Store,
} from "@/lib/drill";
import { RubyText } from "@/components/ruby-text";

type Phase =
  | { name: "home" }
  | {
      name: "quiz";
      questions: RoundQuestion[];
      index: number;
      choice: string | null;
      checked: boolean;
      answers: RoundAnswer[];
      target: number;
    }
  | { name: "result"; answers: RoundAnswer[]; target: number; next: number };

const LETTERS = ["A", "B", "C", "D"];

export function DrillApp() {
  const [store, setStore] = useState<Store>(() => emptyClient());
  const [phase, setPhase] = useState<Phase>({ name: "home" });

  useEffect(() => {
    setStore(loadStore());
  }, []);

  const stats = useMemo(() => coverage(store), [store]);

  const start = () => {
    const target = store.target;
    const questions = buildRound(store);
    setPhase({ name: "quiz", questions, index: 0, choice: null, checked: false, answers: [], target });
  };

  const current = phase.name === "quiz" ? phase.questions[phase.index] : null;

  const choose = (text: string) => {
    if (phase.name !== "quiz" || phase.checked) return;
    setPhase({ ...phase, choice: text });
  };

  const reveal = () => {
    if (phase.name !== "quiz" || !phase.choice || phase.checked || !current) return;
    const correct = phase.choice === current.answer;
    const answers = [
      ...phase.answers,
      { id: current.id, point: current.point, kind: current.kind, choice: phase.choice, correct },
    ];
    setPhase({ ...phase, checked: true, answers });
  };

  const next = () => {
    if (phase.name !== "quiz" || !phase.checked) return;
    if (phase.index + 1 < phase.questions.length) {
      setPhase({ ...phase, index: phase.index + 1, choice: null, checked: false });
      return;
    }
    const updated = commitRound(store, phase.answers, phase.target);
    setStore(updated);
    saveStore(updated);
    setPhase({ name: "result", answers: phase.answers, target: phase.target, next: updated.target });
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-seal">JLPT N3 · 語言知識</p>
          <h1 className="font-serif text-4xl text-balance text-ink">日檢 N3 題庫</h1>
        </div>
        {phase.name !== "home" && (
          <button
            type="button"
            className="min-h-11 rounded-full border border-line bg-card px-4 text-sm text-muted"
            onClick={() => setPhase({ name: "home" })}
          >
            回到範圍
          </button>
        )}
      </header>

      {phase.name === "home" && <Home store={store} stats={stats} onStart={start} />}
      {phase.name === "quiz" && current && (
        <Quiz phase={phase} item={current} onChoose={choose} onReveal={reveal} onNext={next} />
      )}
      {phase.name === "result" && (
        <Result phase={phase} store={store} onAgain={start} onHome={() => setPhase({ name: "home" })} />
      )}
    </div>
  );
}

function emptyClient(): Store {
  return { points: {}, recentIds: [], target: 3, rounds: [] };
}

function Home({
  store,
  stats,
  onStart,
}: {
  store: Store;
  stats: ReturnType<typeof coverage>;
  onStart: () => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, { point: string; kind: string }[]>();
    for (const item of BANK) {
      const list = map.get(item.group) ?? [];
      if (!list.some((row) => row.point === item.point)) list.push({ point: item.point, kind: item.kind });
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, []);

  const last = store.rounds[0];

  return (
    <main className="space-y-6">
      <section className="rounded-card border border-line bg-card p-5 sm:p-7">
        <p className="max-w-xl text-pretty text-base leading-relaxed text-ink">
          一輪十題，只考文法同語彙。其中約兩題係 N4 或 N5：N3 語言知識會再考初級，用來墊穩。其餘跟最近一輪走：八成以上會出更易混淆的接續，四成以下回到核心句型。答完先睇每個選項的接續同點解啱、點解錯，先至下一題。同一文法唔會連續霸佔題目。
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-night px-5 text-base font-medium text-paper"
          >
            開始本輪
            <ArrowRight className="size-4" aria-hidden />
          </button>
          <p className="text-sm text-muted">
            現時難度 {store.target} / 5
            {last ? ` · 上一輪 ${last.correct}/${last.total}` : " · 尚未作答"}
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="文法點" value={`${stats.grammar.seen}/${stats.grammar.total}`} hint="碰過 / 題庫" />
        <Stat label="語彙點" value={`${stats.vocab.seen}/${stats.vocab.total}`} hint="含漢字讀音" />
        <Stat label="題目" value={String(stats.bank)} hint="每題四個選項都有解釋" />
      </section>
      <p className="text-sm text-muted">
        N3 {stats.n3.seen}/{stats.n3.total} · N4 {stats.n4.seen}/{stats.n4.total} · N5 {stats.n5.seen}/{stats.n5.total}
        。程度係題目標記，唔係官方分數。
      </p>

      {stats.weak.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">尚未站穩</h2>
          <ul className="flex flex-wrap gap-2">
            {stats.weak.slice(0, 8).map((point) => (
              <li key={point} className="rounded-full bg-seal-soft px-3 py-1 text-sm text-seal">
                {point}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-serif text-2xl">
          <BookOpen className="size-5 text-seal" aria-hidden />
          覆蓋範圍
        </h2>
        <div className="space-y-2">
          {groups.map(([group, points]) => {
            const seen = points.filter((p) => store.points[p.point]).length;
            return (
              <details key={group} className="rounded-card border border-line bg-card px-4 py-3">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3">
                  <span className="font-medium">{GROUP_LABEL[group] ?? group}</span>
                  <span className="text-sm tabular-nums text-muted">
                    {seen}/{points.length}
                  </span>
                </summary>
                <ul className="mt-3 flex flex-wrap gap-2 pb-1">
                  {points.map((p) => {
                    const stat = store.points[p.point];
                    const tone = !stat ? "bg-paper text-muted" : stat.wrong > stat.correct ? "bg-seal-soft text-seal" : "bg-moss-soft text-moss";
                    return (
                      <li key={p.point} className={`rounded-full px-3 py-1 text-sm ${tone}`}>
                        {p.point}
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-card border border-line bg-card px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-serif text-3xl tabular-nums">{value}</p>
      <p className="text-sm text-muted">{hint}</p>
    </div>
  );
}

function Quiz({
  phase,
  item,
  onChoose,
  onReveal,
  onNext,
}: {
  phase: Extract<Phase, { name: "quiz" }>;
  item: RoundQuestion;
  onChoose: (text: string) => void;
  onReveal: () => void;
  onNext: () => void;
}) {
  const last = phase.index + 1 === phase.questions.length;
  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="tabular-nums">
          {phase.index + 1} / {phase.questions.length}
        </span>
        <span>
          {item.level} · {item.kind === "grammar" ? "文法" : "語彙"} · 難度 {item.difficulty}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full bg-seal" style={{ width: `${((phase.index + (phase.checked ? 1 : 0)) / phase.questions.length) * 100}%` }} />
      </div>
      <p className="text-sm text-muted">{phase.checked ? item.gloss : "選出最自然的一項。答完先睇接續，先至下一題。"}</p>
      <h2 className="font-serif text-2xl leading-relaxed text-balance sm:text-3xl">
        <RubyText text={item.stem} />
      </h2>
      <div className="grid gap-3">
        {item.order.map((text, i) => {
          const selected = phase.choice === text;
          const isAnswer = text === item.answer;
          let tone = "border-line bg-card";
          if (phase.checked && isAnswer) tone = "border-moss bg-moss-soft";
          else if (phase.checked && selected && !isAnswer) tone = "border-seal bg-seal-soft";
          else if (selected) tone = "border-night bg-card";
          return (
            <button
              key={text}
              type="button"
              disabled={phase.checked}
              onClick={() => onChoose(text)}
              className={`flex min-h-14 items-center gap-3 rounded-card border px-4 py-3 text-left text-lg ${tone}`}
            >
              <span className="w-6 font-medium text-muted">{LETTERS[i]}</span>
              <span>{text}</span>
            </button>
          );
        })}
      </div>
      {!phase.checked ? (
        <button
          type="button"
          disabled={!phase.choice}
          onClick={onReveal}
          className="min-h-12 w-full rounded-full bg-night px-5 text-base font-medium text-paper disabled:opacity-40"
        >
          睇解釋
        </button>
      ) : (
        <>
          <p className={`text-base font-medium ${phase.choice === item.answer ? "text-moss" : "text-seal"}`}>
            {phase.choice === item.answer ? "啱。" : `唔啱。正解係「${item.answer}」。`}
            <span className="ml-2 font-normal text-muted">{item.point}</span>
          </p>
          <div className="space-y-3">
            {item.order.map((text) => (
              <Explain key={text} item={item} text={text} picked={phase.choice} />
            ))}
          </div>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-night px-5 text-base font-medium text-paper"
          >
            {last ? "本輪結果" : "下一題"}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </>
      )}
    </main>
  );
}

function Explain({ item, text, picked }: { item: Item; text: string; picked: string | null }) {
  const opt = optionOf(item, text);
  const right = text === item.answer;
  const mine = text === picked;
  return (
    <article className={`rounded-card border p-4 ${right ? "border-moss bg-moss-soft" : "border-line bg-card"}`}>
      <header className="mb-2 flex items-center gap-2">
        {right ? <Check className="size-4 text-moss" aria-hidden /> : <X className="size-4 text-seal" aria-hidden />}
        <h3 className="font-serif text-xl">{opt.text}</h3>
        <span className="text-sm text-muted">{right ? "正解" : mine ? "你的選擇" : "其他選項"}</span>
      </header>
      <dl className="space-y-2 text-sm leading-relaxed">
        <Row term="意思" value={opt.meaning} />
        <Row term="接續" value={opt.connection} />
        <Row term={right ? "點解啱" : "點解唔啱"} value={opt.why} />
        <Row term="例句" value={opt.example} />
        <Row term="譯文" value={opt.zh} />
      </dl>
    </article>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-muted">{term}</dt>
      <dd className="min-w-0 flex-1">{value}</dd>
    </div>
  );
}

function Result({
  phase,
  store,
  onAgain,
  onHome,
}: {
  phase: Extract<Phase, { name: "result" }>;
  store: Store;
  onAgain: () => void;
  onHome: () => void;
}) {
  const correct = phase.answers.filter((a) => a.correct).length;
  const missed = phase.answers.filter((a) => !a.correct);
  const moved = phase.next > phase.target ? "下一輪會難一點，多考易混淆的接續。" : phase.next < phase.target ? "下一輪會回到核心句型。" : "下一輪維持這個難度，但會換未考過的文法。";
  return (
    <main className="space-y-5">
      <section className="rounded-card border border-line bg-card p-6">
        <p className="text-sm text-muted">本輪</p>
        <p className="font-serif text-5xl tabular-nums">
          {correct}
          <span className="text-2xl text-muted">/{phase.answers.length}</span>
        </p>
        <p className="mt-3 text-pretty leading-relaxed">{moved}</p>
        <p className="mt-1 text-sm text-muted">
          難度 {phase.target} → {store.target}。每一輪仍會夾約兩題 N4／N5。這是練習指標，不是官方日檢分數。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={onAgain} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-night px-5 font-medium text-paper">
            <RotateCcw className="size-4" aria-hidden />
            再來一輪
          </button>
          <button type="button" onClick={onHome} className="min-h-12 rounded-full border border-line bg-card px-5">
            看覆蓋範圍
          </button>
        </div>
      </section>
      {missed.length > 0 && (
        <section>
          <h2 className="mb-2 font-serif text-2xl">呢輪錯過</h2>
          <ul className="space-y-2">
            {missed.map((a) => (
              <li key={a.id} className="rounded-card border border-line bg-card px-4 py-3 text-sm">
                <span className="font-medium">{a.point}</span>
                <span className="text-muted"> · 你選了「{a.choice}」</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
