/** Rank opaque colors from the two perimeter rings of the cropped source frame. */
export function insetColors(edges: ArrayLike<number>[], limit = 24): string[] {
  const counts = new Map<string, number>();
  for (const pixels of edges) {
    for (let i = 0; i + 3 < pixels.length; i += 4) {
      if (pixels[i + 3] < 255) continue;
      const color =
        "#" +
        [pixels[i], pixels[i + 1], pixels[i + 2]]
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("");
      counts.set(color, (counts.get(color) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([color]) => color);
}
