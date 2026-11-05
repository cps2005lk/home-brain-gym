import { describe, expect, it } from "vitest";
import {
  forgetInviteCode,
  inviteLink,
  readInviteCodeFromUrl,
  rememberedInviteCode,
  rememberInviteCode,
} from "./inviteLink";
import { createFakeStorage } from "./storage-fake";

describe("the link to send", () => {
  it("puts the code in the address", () => {
    expect(inviteLink("https://home-brain-gym.vercel.app", "ZDSZQ8XA")).toBe(
      "https://home-brain-gym.vercel.app/?join=ZDSZQ8XA",
    );
  });

  it("does not mind a trailing slash or a dashed code", () => {
    expect(inviteLink("https://home-brain-gym.vercel.app/", "zdsz-q8xa")).toBe(
      "https://home-brain-gym.vercel.app/?join=ZDSZQ8XA",
    );
  });

  it("works for the dev server too", () => {
    expect(inviteLink("http://localhost:5173", "ZDSZQ8XA")).toBe(
      "http://localhost:5173/?join=ZDSZQ8XA",
    );
  });
});

describe("reading a code from the address", () => {
  it("finds it", () => {
    expect(readInviteCodeFromUrl("?join=ZDSZQ8XA")).toBe("ZDSZQ8XA");
  });

  it("tidies up a dashed or lower case code", () => {
    expect(readInviteCodeFromUrl("?join=zdsz-q8xa")).toBe("ZDSZQ8XA");
  });

  it("ignores other things in the address", () => {
    expect(readInviteCodeFromUrl("?kid=2&join=ZDSZQ8XA&x=1")).toBe("ZDSZQ8XA");
    expect(readInviteCodeFromUrl("?kid=2")).toBeNull();
    expect(readInviteCodeFromUrl("")).toBeNull();
  });

  it("refuses something that is not a code", () => {
    expect(readInviteCodeFromUrl("?join=hello")).toBeNull();
    expect(readInviteCodeFromUrl("?join=ZDSZQ8X0")).toBeNull(); // 0 is never used
  });
});

describe("keeping the code while the parent signs in", () => {
  it("survives the trip to Google and back", () => {
    const storage = createFakeStorage();
    rememberInviteCode(storage, "zdsz-q8xa");

    // A new page load reads it back.
    expect(rememberedInviteCode(storage)).toBe("ZDSZQ8XA");
  });

  it("is nothing when none was kept", () => {
    expect(rememberedInviteCode(createFakeStorage())).toBeNull();
  });

  it("is forgotten once it has been used", () => {
    const storage = createFakeStorage();
    rememberInviteCode(storage, "ZDSZQ8XA");
    forgetInviteCode(storage);

    expect(rememberedInviteCode(storage)).toBeNull();
  });

  it("ignores rubbish left in storage", () => {
    const storage = createFakeStorage({ "home-brain-gym/pending-invite": "not a code" });
    expect(rememberedInviteCode(storage)).toBeNull();
  });
});
