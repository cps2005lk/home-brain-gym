import { describe, expect, it } from "vitest";
import {
  daysLeft,
  formatInviteCode,
  inviteStatus,
  invitesLeft,
  isLikelyInviteCode,
  MAX_OPEN_INVITES,
  normaliseInviteCode,
  openInvites,
  type FamilyInvite,
} from "./invites";

const now = "2026-11-05T12:00:00.000Z";

const invite = (over: Partial<FamilyInvite> = {}): FamilyInvite => ({
  id: "i1",
  code: "K7P42RMX",
  email: null,
  createdAt: "2026-11-05T10:00:00.000Z",
  expiresAt: "2026-11-12T10:00:00.000Z",
  acceptedAt: null,
  revokedAt: null,
  ...over,
});

describe("tidying up a typed code", () => {
  it("accepts lower case", () => {
    expect(normaliseInviteCode("k7p42rmx")).toBe("K7P42RMX");
  });

  it("drops the dashes and spaces people add", () => {
    expect(normaliseInviteCode("K7P4-2RMX")).toBe("K7P42RMX");
    expect(normaliseInviteCode(" k7p4 2rmx ")).toBe("K7P42RMX");
  });

  it("shows a code in two halves", () => {
    expect(formatInviteCode("K7P42RMX")).toBe("K7P4-2RMX");
    expect(formatInviteCode("k7p4-2rmx")).toBe("K7P4-2RMX");
  });

  it("leaves something that is not a code alone", () => {
    expect(formatInviteCode("ABC")).toBe("ABC");
  });
});

describe("spotting a typo before asking the server", () => {
  it("accepts a real code", () => {
    expect(isLikelyInviteCode("K7P4-2RMX")).toBe(true);
    expect(isLikelyInviteCode("k7p42rmx")).toBe(true);
  });

  it("refuses the wrong length", () => {
    expect(isLikelyInviteCode("K7P42RM")).toBe(false);
    expect(isLikelyInviteCode("K7P42RMXX")).toBe(false);
    expect(isLikelyInviteCode("")).toBe(false);
  });

  it("refuses the letters we never use", () => {
    // O, 0, I and 1 are left out on purpose, so they cannot be confused
    expect(isLikelyInviteCode("K7P42RM0")).toBe(false);
    expect(isLikelyInviteCode("K7P42RMO")).toBe(false);
    expect(isLikelyInviteCode("K7P42RM1")).toBe(false);
    expect(isLikelyInviteCode("K7P42RMI")).toBe(false);
  });
});

describe("what an invite looks like now", () => {
  it("is open when it is fresh", () => {
    expect(inviteStatus(invite(), now)).toBe("open");
  });

  it("is used once someone joined with it", () => {
    expect(inviteStatus(invite({ acceptedAt: "2026-11-05T11:00:00.000Z" }), now)).toBe("used");
  });

  it("is cancelled when the parent took it back", () => {
    expect(inviteStatus(invite({ revokedAt: "2026-11-05T11:00:00.000Z" }), now)).toBe("cancelled");
  });

  it("is expired after seven days", () => {
    expect(inviteStatus(invite({ expiresAt: "2026-11-05T11:59:00.000Z" }), now)).toBe("expired");
  });

  it("reads as cancelled when it was cancelled and then expired", () => {
    const both = invite({
      revokedAt: "2026-11-05T11:00:00.000Z",
      expiresAt: "2026-11-05T11:30:00.000Z",
    });
    expect(inviteStatus(both, now)).toBe("cancelled");
  });

  it("counts the days left, rounded up", () => {
    expect(daysLeft(invite({ expiresAt: "2026-11-12T10:00:00.000Z" }), now)).toBe(7);
    expect(daysLeft(invite({ expiresAt: "2026-11-05T12:30:00.000Z" }), now)).toBe(1);
    expect(daysLeft(invite({ expiresAt: "2026-11-04T12:00:00.000Z" }), now)).toBe(0);
  });
});

describe("how many invites may still be made", () => {
  it("counts only the open ones", () => {
    const invites = [
      invite({ id: "a" }),
      invite({ id: "b", acceptedAt: now }),
      invite({ id: "c", revokedAt: now }),
      invite({ id: "d", expiresAt: "2026-11-01T10:00:00.000Z" }),
    ];

    expect(openInvites(invites, now).map((item) => item.id)).toEqual(["a"]);
    expect(invitesLeft(invites, now)).toBe(MAX_OPEN_INVITES - 1);
  });

  it("stops at zero", () => {
    const many = Array.from({ length: MAX_OPEN_INVITES + 2 }, (_, index) =>
      invite({ id: `i${index}` }),
    );
    expect(invitesLeft(many, now)).toBe(0);
  });

  it("allows the full number when there are none", () => {
    expect(invitesLeft([], now)).toBe(MAX_OPEN_INVITES);
  });
});
