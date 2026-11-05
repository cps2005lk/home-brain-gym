/**
 * Invite codes, as seen by the app. The database makes them; this file only
 * tidies up what a person types and decides what an invite looks like now.
 */

/** The same letters the database uses: no 0/O or 1/I to read out wrongly. */
export const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 8;

/** Matches max_open_invites() in migration 0006. */
export const MAX_OPEN_INVITES = 5;

/** One invite, as the parent area shows it. */
export interface FamilyInvite {
  readonly id: string;
  readonly code: string;
  /** When set, only that signed-in email may use the code. */
  readonly email: string | null;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly acceptedAt: string | null;
  readonly revokedAt: string | null;
}

/** One person who can open this family. */
export interface FamilyParent {
  readonly userId: string;
  readonly email: string | null;
  readonly joinedAt: string;
}

/**
 * Clean up what someone typed: upper case, and drop the spaces or dashes
 * people add while reading a code out loud. "k7p4-2rmx" becomes "K7P42RMX".
 */
export function normaliseInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Show it in two halves, which is much easier to read and to say. */
export function formatInviteCode(code: string): string {
  const clean = normaliseInviteCode(code);
  if (clean.length !== INVITE_CODE_LENGTH) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

/**
 * Could this be one of our codes? Checked before asking the server, so a typo
 * gets an instant answer instead of a round trip.
 */
export function isLikelyInviteCode(raw: string): boolean {
  const clean = normaliseInviteCode(raw);
  if (clean.length !== INVITE_CODE_LENGTH) return false;
  return [...clean].every((letter) => INVITE_ALPHABET.includes(letter));
}

export type InviteStatus = "open" | "used" | "cancelled" | "expired";

/**
 * The order matters: a cancelled invite that also expired reads as cancelled,
 * because that is what the parent did to it.
 */
export function inviteStatus(invite: FamilyInvite, nowIso: string): InviteStatus {
  if (invite.acceptedAt !== null) return "used";
  if (invite.revokedAt !== null) return "cancelled";
  if (new Date(invite.expiresAt).getTime() <= new Date(nowIso).getTime()) return "expired";
  return "open";
}

export const openInvites = (
  invites: readonly FamilyInvite[],
  nowIso: string,
): readonly FamilyInvite[] => invites.filter((invite) => inviteStatus(invite, nowIso) === "open");

/** How many more invites this family may make right now. */
export const invitesLeft = (invites: readonly FamilyInvite[], nowIso: string): number =>
  Math.max(0, MAX_OPEN_INVITES - openInvites(invites, nowIso).length);

/** "6 days left", for the invite list. Rounded up, so it never reads "0 days". */
export function daysLeft(invite: FamilyInvite, nowIso: string): number {
  const ms = new Date(invite.expiresAt).getTime() - new Date(nowIso).getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
