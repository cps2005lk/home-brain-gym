import { isLikelyInviteCode, normaliseInviteCode } from "./invites";
import type { KeyValueStorage } from "./localRepository";

/** The part added to the address: .../?join=ZDSZQ8XA */
export const INVITE_PARAM = "join";

/**
 * Where a code waits while the parent goes off to Google and comes back.
 *
 * The sign-in sends the browser to Google and then back to the plain address,
 * so anything in the link is gone by the time they return. Keeping the code on
 * the device is what makes a one-tap invite link possible.
 */
export const PENDING_INVITE_KEY = "home-brain-gym/pending-invite";

/** The link to send: the app's address with the code attached. */
export function inviteLink(origin: string, code: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/?${INVITE_PARAM}=${normaliseInviteCode(code)}`;
}

/** The code in an address, or null if there is none or it is not a code. */
export function readInviteCodeFromUrl(search: string): string | null {
  const raw = new URLSearchParams(search).get(INVITE_PARAM);
  if (!raw) return null;
  const clean = normaliseInviteCode(raw);
  return isLikelyInviteCode(clean) ? clean : null;
}

export function rememberInviteCode(storage: KeyValueStorage, code: string): void {
  storage.setItem(PENDING_INVITE_KEY, normaliseInviteCode(code));
}

/** The code we were keeping, or null. */
export function rememberedInviteCode(storage: KeyValueStorage): string | null {
  const saved = storage.getItem(PENDING_INVITE_KEY);
  if (!saved) return null;
  return isLikelyInviteCode(saved) ? saved : null;
}

/** Once it has been used - or refused - stop keeping it. */
export function forgetInviteCode(storage: KeyValueStorage): void {
  storage.setItem(PENDING_INVITE_KEY, "");
}
