import test from "node:test";
import assert from "node:assert/strict";
import {
  countdownDuration,
  countdownRemaining,
} from "../../desktop/countdown.cts";

test("older and malformed capture choices retain the default countdown", () => {
  for (const value of [undefined, null, "0", NaN, -1, 2, 100])
    assert.equal(countdownDuration(value), 3);
  assert.equal(countdownDuration(0), 0);
  assert.equal(countdownDuration(10), 10);
});
test("countdown follows elapsed time after a delayed event loop", () => {
  const deadline = 15000;
  assert.equal(countdownRemaining(deadline, 10000), 5);
  assert.equal(countdownRemaining(deadline, 13250), 2);
  assert.equal(countdownRemaining(deadline, 14999), 1);
  assert.equal(countdownRemaining(deadline, 15000), 0);
  assert.equal(countdownRemaining(deadline, 17500), 0);
});
