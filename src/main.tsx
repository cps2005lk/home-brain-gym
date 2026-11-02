import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";

/**
 * The entry point. getElementById returns `HTMLElement | null`, so strict mode
 * makes us handle the missing case - we cannot just hope it is there.
 */
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("index.html is missing the #root element");

createRoot(rootElement).render(
  <StrictMode>
    <div className="wrap">
      <App />
    </div>
  </StrictMode>,
);
