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

/** Wrap at words, with grapheme-safe breaks for URLs and scripts without spaces. */
export function wrapCaption(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] {
  const lines: string[] = [];
  const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      if (measure(word) <= maxWidth) {
        line = word;
        continue;
      }
      for (const { segment } of graphemes.segment(word)) {
        if (line && measure(line + segment) > maxWidth) {
          lines.push(line);
          line = "";
        }
        line += segment;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Fit every line inside the frame without dropping text or changing its timing. */
export function layoutCaption(
  text: string,
  width: number,
  height: number,
  measure: (text: string, fontSize: number) => number,
) {
  const baseScale = width / 1280;
  const bottom = Math.min(33 * baseScale, height * 0.1);
  const maxHeight = height - bottom * 2;
  const at = (factor: number) => {
    const scale = baseScale * factor;
    const fontSize = 30 * scale;
    const lines = wrapCaption(text, width * 0.84 - 36 * scale, (line) =>
      measure(line, fontSize),
    );
    const textWidth = Math.max(
      0,
      ...lines.map((line) => measure(line, fontSize)),
    );
    const lineHeight = 38 * scale;
    const boxHeight = lines.length * lineHeight + 14 * scale;
    return {
      lines,
      fontSize,
      scale,
      textWidth,
      lineHeight,
      boxHeight,
      bottom,
      top: height - bottom - boxHeight,
    };
  };
  let layout = at(1);
  if (
    layout.boxHeight <= maxHeight &&
    layout.textWidth + 36 * layout.scale <= width * 0.84
  )
    return layout;
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 18; iteration++) {
    const factor = (low + high) / 2;
    const candidate = at(factor);
    if (
      candidate.boxHeight <= maxHeight &&
      candidate.textWidth + 36 * candidate.scale <= width * 0.84
    ) {
      low = factor;
      layout = candidate;
    } else high = factor;
  }
  return layout;
}
