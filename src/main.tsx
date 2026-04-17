import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { DisplayPreferencesProvider } from "@/components/display-preferences-provider";
import { TextScaleProvider } from "@/components/text-scale-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "./index.css";
import { isMac } from "./lib/platform";
import { isTauriRuntime } from "./lib/tauri-env";

if (isTauriRuntime()) {
  document.documentElement.classList.add("tauri-app");
  if (isMac()) {
    document.documentElement.classList.add("tauri-macos");
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <TextScaleProvider>
        <DisplayPreferencesProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </DisplayPreferencesProvider>
      </TextScaleProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
