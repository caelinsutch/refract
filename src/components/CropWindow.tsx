import { useEffect, useState } from "react";
import CropEditor from "./CropEditor";
import type { CropRect } from "../core/crop";
export function CropWindow() {
  const [data, setData] = useState<{
    width: number;
    height: number;
    initial?: CropRect;
    image: HTMLImageElement;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    window.refract
      ?.cropState()
      .then(async (state) => {
        const image = new Image();
        image.src = state.image;
        await image.decode();
        if (!cancelled) setData({ ...state, image });
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const finish = (crop: CropRect | null) => {
    void window.refract?.cropFinish(crop).catch((e) => setError(String(e)));
  };
  return data ? (
    <CropEditor
      nativeWindow
      width={data.width}
      height={data.height}
      initial={data.initial}
      video={data.image}
      onConfirm={finish}
      onCancel={() => finish(null)}
    />
  ) : (
    <div role="status" style={{ padding: 80 }}>
      {error || "Loading crop preview…"}
    </div>
  );
}
