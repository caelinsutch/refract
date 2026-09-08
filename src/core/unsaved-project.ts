/** A delayed dialog/save may authorize replacement only of the same edit snapshot. */
export async function confirmProjectReplacement<T>(options: {
  snapshot: T;
  current: () => T;
  choose: () => Promise<"save" | "discard" | "cancel">;
  save: () => Promise<string | null>;
}): Promise<{ proceed: boolean; saved: boolean }> {
  const decision = await options.choose();
  if (options.current() !== options.snapshot || decision === "cancel")
    return { proceed: false, saved: false };
  if (decision === "discard") return { proceed: true, saved: false };
  const destination = await options.save();
  const saved = !!destination && options.current() === options.snapshot;
  return { proceed: saved, saved };
}
