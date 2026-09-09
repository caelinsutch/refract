import test from "node:test";
import assert from "node:assert/strict";
import { ClickAudition } from "./click-audition";

function audioFixture() {
  const resumes: { resolve: () => void; reject: (error: Error) => void }[] = [];
  const sources: {
    started: boolean;
    stopped: boolean;
    disconnected: boolean;
    onended: null | (() => void);
  }[] = [];
  const gains: { gain: { value: number }; disconnected: boolean }[] = [];
  const context = {
    sampleRate: 48000,
    destination: {},
    resume: () =>
      new Promise<void>((resolve, reject) => resumes.push({ resolve, reject })),
    createBuffer: (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
    createBufferSource: () => {
      const node = {
        started: false,
        stopped: false,
        disconnected: false,
        onended: null as null | (() => void),
        connect() {},
        start() {
          this.started = true;
        },
        stop() {
          this.stopped = true;
        },
        disconnect() {
          this.disconnected = true;
        },
      };
      sources.push(node);
      return node;
    },
    createGain: () => {
      const gain = {
        gain: { value: 1 },
        disconnected: false,
        connect() {},
        disconnect() {
          this.disconnected = true;
        },
      };
      gains.push(gain);
      return gain;
    },
  } as unknown as AudioContext;
  return { context, resumes, sources, gains };
}

test("only the latest audition plays when audio resume completes out of order", async () => {
  const audio = audioFixture(),
    audition = new ClickAudition();
  const old = audition.play(audio.context, "soft", 0.25);
  const latest = audition.play(audio.context, "mechanical", 0.6);
  audio.resumes[1].resolve();
  await latest;
  audio.resumes[0].resolve();
  await old;
  assert.equal(audio.sources.length, 1);
  assert.equal(audio.sources[0].started, true);
  assert.equal(audio.gains[0].gain.value, 0.6);
  audition.stop();
  assert.equal(audio.sources[0].stopped, true);
  assert.equal(audio.sources[0].disconnected, true);
  assert.equal(audio.gains[0].disconnected, true);
});

test("leaving a project cancels pending auditions and ignores stale resume errors", async () => {
  for (const reject of [false, true]) {
    const audio = audioFixture(),
      audition = new ClickAudition();
    const pending = audition.play(audio.context, "soft", 0.25);
    audition.stop();
    if (reject) audio.resumes[0].reject(Error("context closed"));
    else audio.resumes[0].resolve();
    await pending;
    assert.equal(audio.sources.length, 0);
  }
});

test("changing audition volume stops the previous sound and uses the requested gain", async () => {
  const audio = audioFixture(),
    audition = new ClickAudition();
  const first = audition.play(audio.context, "soft", 0.25);
  audio.resumes[0].resolve();
  await first;
  const second = audition.play(audio.context, "soft", 0.5);
  assert.equal(audio.sources[0].stopped, true);
  audio.resumes[1].resolve();
  await second;
  assert.equal(audio.gains[1].gain.value, 0.5);
  audio.sources[1].onended?.();
  assert.equal(audio.sources[1].disconnected, true);
  assert.equal(audio.gains[1].disconnected, true);
  audition.stop();
  assert.equal(
    audio.sources[1].stopped,
    false,
    "Ended sources are already released",
  );
});
