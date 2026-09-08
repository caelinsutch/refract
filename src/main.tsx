import { CropWindow } from "./components/CropWindow";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Recorder, { AreaPicker } from "./Recorder";
import "./theme.css";
import "./reset.css";
import "./motion.css";
import "./camera-timeline.css";
import "./shortcut-timeline.css";
// Tab navigation asks for a focus indicator; pointer actions and command
// shortcuts keep the native-style default-action appearance quiet.
document.documentElement.dataset.focusMode = "quiet";
document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Tab")
      document.documentElement.dataset.focusMode = "keyboard";
  },
  true,
);
document.addEventListener(
  "pointerdown",
  () => {
    document.documentElement.dataset.focusMode = "quiet";
  },
  true,
);
if (location.hash === "#recorder" || location.hash === "#area")
  document.documentElement.classList.add("recorder-surface");
if (location.hash === "#crop")
  document.documentElement.classList.add("native-window");
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {location.hash === "#crop" ? (
      <CropWindow />
    ) : location.hash === "#recorder" ? (
      <Recorder />
    ) : location.hash === "#area" ? (
      <AreaPicker />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
