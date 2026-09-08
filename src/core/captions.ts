import type { Caption } from "./project.js";
export type TimedWord = { text: string; start: number; end: number };

/** Group recognized source-time words without retiming them to an edited timeline. */
export function captionsFromWords(
  words: TimedWord[],
  duration: number,
): Caption[] {
  const captions: Caption[] = [];
  const clean = words
    .filter(
      (w) =>
        typeof w.text === "string" &&
        w.text.trim() &&
        Number.isFinite(w.start) &&
        Number.isFinite(w.end) &&
        w.end > w.start &&
        w.end > 0 &&
        w.start < duration,
    )
    .map((w) => ({
      ...w,
      text: w.text.trim(),
      start: Math.max(0, w.start),
      end: Math.min(duration, w.end),
    }))
    .sort((a, b) => a.start - b.start);
  let group: TimedWord[] = [];
  const text = () =>
    group
      .map((w) => w.text)
      .join(" ")
      .replace(/\s+([,.!?;:])/g, "$1");
  const flush = () => {
    if (!group.length) return;
    captions.push({
      id: `speech-${captions.length}-${Math.round(group[0].start)}`,
      start: group[0].start,
      end: Math.max(...group.map((w) => w.end)),
      text: text(),
    });
    group = [];
  };
  for (const word of clean) {
    if (
      group.length &&
      (word.start - group.at(-1)!.end > 500 ||
        word.end - group[0].start > 3200 ||
        text().length + word.text.length + 1 > 42)
    )
      flush();
    group.push(word);
    if (/[.!?]$/.test(word.text)) flush();
  }
  flush();
  return captions;
}
