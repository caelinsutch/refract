import { useEffect, useState } from "react";

export function Countdown() {
  const [seconds, setSeconds] = useState(
    () => Number(new URLSearchParams(location.search).get("seconds")) || 3,
  );
  useEffect(() => {
    const off = window.refract?.onCountdownTick(setSeconds);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void window.refract?.countdownCancel();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      off?.();
      window.removeEventListener("keydown", key);
    };
  }, []);
  return (
    <main className="countdown-overlay">
      <div className="countdown-content">
        <div className="countdown-number" role="timer" aria-live="polite">
          {seconds}
        </div>
        <p>Get ready. Recording will start soon.</p>
        <button
          autoFocus
          onClick={() => void window.refract?.countdownCancel()}
        >
          Cancel <kbd>esc</kbd>
        </button>
      </div>
    </main>
  );
}
