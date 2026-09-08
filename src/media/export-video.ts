/** Wait for the decoded frame to reach Chromium's compositor before sampling it. */
export async function seekExportVideo(video: HTMLVideoElement, target: number) {
  if (Math.abs(video.currentTime - target) < 0.0001) return;
  await new Promise<void>((resolve, reject) => {
    let sought = false;
    let presented = false;
    const finish = () => {
      if (!sought || !presented) return;
      cleanup();
      resolve();
    };
    const onSeeked = () => {
      sought = true;
      finish();
    };
    const frame = video.requestVideoFrameCallback(() => {
      presented = true;
      finish();
    });
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        Error(
          `Video frame decoding timed out near ${target.toFixed(2)} seconds. Try exporting again.`,
        ),
      );
    }, 10000);
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener("seeked", onSeeked);
      video.cancelVideoFrameCallback(frame);
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = target;
  });
}
