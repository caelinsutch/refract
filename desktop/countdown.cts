export function countdownDuration(value: unknown): 0 | 3 | 5 | 10 {
  return value === 0 || value === 5 || value === 10 ? value : 3;
}

export function countdownRemaining(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
