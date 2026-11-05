import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { readInviteCodeFromUrl, rememberedInviteCode, rememberInviteCode } from "./data/inviteLink";
import "./styles/global.css";

/**
 * The entry point. getElementById returns `HTMLElement | null`, so strict mode
 * makes us handle the missing case - we cannot just hope it is there.
 */
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("index.html is missing the #root element");

/**
 * An invite link looks like .../?join=ZDSZQ8XA
 *
 * Signing in sends the browser to Google and back to the plain address, so the
 * code would be lost on the way. We put it on the device first, then tidy it
 * out of the address bar so it does not sit in the history or get shared by
 * accident. Doing this here, before React starts, keeps the components pure -
 * they only ever receive the answer as a prop.
 */
const fromLink = readInviteCodeFromUrl(window.location.search);
if (fromLink) {
  rememberInviteCode(window.localStorage, fromLink);
  window.history.replaceState({}, "", window.location.pathname);
}
const pendingInvite = rememberedInviteCode(window.localStorage);

createRoot(rootElement).render(
  <StrictMode>
    <div className="wrap">
      <App pendingInvite={pendingInvite} />
    </div>
  </StrictMode>,
);
