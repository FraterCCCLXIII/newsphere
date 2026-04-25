import "./theme-init";

import { IconContext } from "@phosphor-icons/react";
import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { RootErrorBoundary } from "@/components/root-error-boundary";
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
    <RootErrorBoundary>
      <IconContext.Provider value={{ weight: "regular" }}>
        <ThemeProvider>
          <TextScaleProvider>
            <DisplayPreferencesProvider>
              <BrowserRouter>
                <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden [min-height:100dvh]">
                  <App />
                </div>
              </BrowserRouter>
            </DisplayPreferencesProvider>
          </TextScaleProvider>
        </ThemeProvider>
      </IconContext.Provider>
    </RootErrorBoundary>
  </React.StrictMode>,
);
