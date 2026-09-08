# Export encoder backpressure — 2026-09-08

A frame write previously waited without a deadline if FFmpeg remained alive but stopped reading its input. The writer now rejects after 60 seconds without completing that frame write. This is a per-frame stalled-input deadline, not a total export-duration limit. The existing renderer error path cancels the job and removes its temporary output. Event listeners and the timer are removed on success, error, close, timeout, and synchronous write failure.

Two real child-process checks were added: one process stays alive without reading stdin and must produce the stalled-encoder error; a second drains stdin and accepts its frame normally. The stalled-process check also confirms listener cleanup. Existing cancellation coverage confirms a blocked frame is released and an unresponsive process is terminated. The suite now has 61 passing tests; production build passed.

This closes one confirmed indefinite-wait path. It does not establish the cause of the previously observed intermittent 60 fps export stall, nor does it bound final muxing. Decoding, PNG generation, and finalization remain separate stages to investigate. No new complete video export was run for this change.

## Live export follow-up

A subsequent packaged-app 1080p60 export completed with 327 video frames (5.45 seconds) and AAC audio (5.439875 seconds). The output decoded successfully and retained shortcut overlays. The earlier intermittent stall did not reproduce in this run. This successful run narrows the current evidence but does not establish a root cause or prove the stall is fixed.
