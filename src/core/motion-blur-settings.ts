type Settings = {
  motionBlurAmount?: number;
  cursorMotionBlur?: number;
  screenMoveBlur?: number;
  screenZoomBlur?: number;
};
/** Factor old independent strengths without changing their effective exposure. */
export function normalizeMotionBlur(a: Settings = {}) {
  for (const value of [
    a.motionBlurAmount,
    a.cursorMotionBlur,
    a.screenMoveBlur,
    a.screenZoomBlur,
  ]) {
    if (
      value !== undefined &&
      (!Number.isFinite(value) || value < 0 || value > 1)
    )
      throw new Error("Invalid motion blur strength.");
  }
  const values = [
    a.cursorMotionBlur ?? 0,
    a.screenMoveBlur ?? 0,
    a.screenZoomBlur ?? 0,
  ];
  if (a.motionBlurAmount !== undefined)
    return {
      motionBlurAmount: a.motionBlurAmount,
      cursorMotionBlur: a.cursorMotionBlur ?? 1,
      screenMoveBlur: a.screenMoveBlur ?? 1,
      screenZoomBlur: a.screenZoomBlur ?? 1,
    };
  const amount = Math.max(...values);
  return {
    motionBlurAmount: amount,
    cursorMotionBlur: amount ? values[0] / amount : 1,
    screenMoveBlur: amount ? values[1] / amount : 1,
    screenZoomBlur: amount ? values[2] / amount : 1,
  };
}
