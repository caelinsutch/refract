# Export encoder backpressure — 2026-09-08

A frame write previously waited without a deadline if FFmpeg remained alive but stopped reading its input. The writer now rejects after 60 seconds without completing that frame write. This is a per-frame stalled-input deadline, not a total export-duration limit. The existing renderer error path cancels the job and removes its temporary output. Event listeners and the timer are removed on success, error, close, timeout, and synchronous write failure.

Two real child-process checks were added: one process stays alive without reading stdin and must produce the stalled-encoder error; a second drains stdin and accepts its frame normally. The stalled-process check also confirms listener cleanup. Existing cancellation coverage confirms a blocked frame is released and an unresponsive process is terminated. The suite now has 61 passing tests; production build passed.

This closes one confirmed indefinite-wait path. It does not establish the cause of the previously observed intermittent 60 fps export stall, nor does it bound final muxing. Decoding, PNG generation, and finalization remain separate stages to investigate. No new complete video export was run for this change.

## Live export follow-up

A subsequent packaged-app 1080p60 export completed with 327 video frames (5.45 seconds) and AAC audio (5.439875 seconds). The output decoded successfully and retained shortcut overlays. The earlier intermittent stall did not reproduce in this run. This successful run narrows the current evidence but does not establish a root cause or prove the stall is fixed.

## Finalization inactivity watchdog

After the renderer supplies all frames and closes encoder input, the main process now waits through an output-activity watchdog. Size, modification time, or change time updates reset its two-minute inactivity deadline. This permits finalization longer than two minutes while the file continues to change. An unchanged or missing output for the full deadline triggers encoder shutdown, including the existing SIGKILL fallback after one second, before temporary-file cleanup. The original destination is only replaced after successful process completion and the existing nonempty-output checks.

Two real child-process tests cover a stalled finalizer that ignores SIGTERM and a productive finalizer whose total runtime exceeds its shortened test deadline. The former is killed and leaves the existing destination intact; the latter publishes its complete output. The production build and all 87 tests pass. The background-audio verifier now uses the production frame writer, finalization watchdog, and publication helper. Both actual MP4 cases completed and decoded with the expected mixed and music-only tone levels.

The watchdog measures output-file activity, not CPU progress. A legitimate encoder doing more than two minutes of work without updating its output would be stopped; very large/long exports still need workload verification. This closes the indefinite process-completion wait, not every possible media or filesystem stall, and does not explain the earlier intermittent 60 fps renderer seek stall.
