// main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// ---- SW registration with dev-friendly control handoff ----
if ("serviceWorker" in navigator) {
  const registerSW = async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      console.log("SW registered:", reg.scope);

      // Log SW state changes (useful while testing)
      const track = (sw) => {
        if (!sw) return;
        console.log("SW state:", sw.state);
        sw.addEventListener("statechange", () =>
          console.log("SW state:", sw.state),
        );
      };
      track(reg.installing || reg.waiting || reg.active);

      // If this page isn't controlled yet, wait for controllerchange once.
      if (!navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => {
            console.log("SW now controlling this page");
            // Optional: auto-reload ONCE in dev so the controller is present
            if (import.meta.env.DEV) location.reload();
          },
          { once: true },
        );
      }
    } catch (err) {
      console.warn("SW registration failed:", err);
    }
  };

  // If the page already loaded, register immediately; otherwise on load
  if (document.readyState === "complete") registerSW();
  else window.addEventListener("load", registerSW, { once: true });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
