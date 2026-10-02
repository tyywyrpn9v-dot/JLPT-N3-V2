import type { ReactNode } from "react";

const PATTERN = /(\p{Script=Han}+)（([ぁ-んー]+)）/gu;

export function RubyText({ text, className }: { text: string; className?: string }) {
  const nodes: ReactNode[] = [];
  const re = new RegExp(PATTERN);
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      <ruby key={`${match.index}-${match[1]}`}>
        {match[1]}
        <rt>{match[2]}</rt>
      </ruby>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <span className={className}>{nodes}</span>;
}
