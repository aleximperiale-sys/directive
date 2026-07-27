import React from "react";
import ReactDOM from "react-dom/client";
import "@/design-system/globals.css";
import { App } from "@/app/App";
import { Providers } from "@/app/providers";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);
