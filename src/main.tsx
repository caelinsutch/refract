import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Recorder, { AreaPicker } from "./Recorder";
import "./theme.css";
import "./reset.css";
import "./motion.css";
import "./camera-timeline.css";
if (location.hash === "#recorder" || location.hash === "#area")
  document.documentElement.classList.add("recorder-surface");
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {location.hash === "#recorder" ? (
      <Recorder />
    ) : location.hash === "#area" ? (
      <AreaPicker />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
