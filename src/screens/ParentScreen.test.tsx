// @vitest-environment jsdom
/**
 * Characterization tests: what the parent area shows TODAY in each state.
 * Snapshots were written by running the code (`vitest -u`), then read.
 *
 * The three child sections are replaced by markers, so these tests only
 * record ParentScreen's own choices: which messages and sections appear.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthState } from "../auth/useAuth";
import type { FamilyAdmin } from "../data/familyAdmin";
import type { SyncStatus } from "../data/syncRepository";
import { ParentScreen } from "./ParentScreen";

/** isSupabaseConfigured is a constant in the real module; here a test can switch it. */
const config = vi.hoisted(() => ({ supabase: true }));
vi.mock("../data/supabaseClient", () => ({
  get isSupabaseConfigured() {
    return config.supabase;
  },
}));
vi.mock("./FamilyParents", () => ({ FamilyParents: () => <p>[FamilyParents]</p> }));
vi.mock("./FamilySettings", () => ({ FamilySettings: () => <p>[FamilySettings]</p> }));
vi.mock("./ProgressView", () => ({ ProgressView: () => <p>[ProgressView]</p> }));

const SIGNED_IN = { user: { id: "u1", email: "parent@example.com" } } as unknown as Session;

function auth(overrides: Partial<AuthState> = {}): AuthState {
  return {
    session: null,
    ready: true,
    error: null,
    signInWithGoogle: vi.fn(() => Promise.resolve()),
    signOut: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

function show(
  options: {
    auth?: AuthState;
    syncStatus?: SyncStatus | null;
    syncError?: string | null;
    admin?: FamilyAdmin | null;
    onBack?: () => void;
  } = {},
) {
  render(
    <ParentScreen
      auth={options.auth ?? auth()}
      syncError={options.syncError ?? null}
      syncStatus={options.syncStatus ?? null}
      kids={[]}
      sessions={[]}
      nowIso="2026-11-16T04:00:00.000Z"
      onDeleteSession={vi.fn()}
      onSaveKid={vi.fn()}
      admin={options.admin ?? null}
      onBack={options.onBack ?? vi.fn()}
    />,
  );
}

/** The visible text, one block per line: easy to read in a snapshot. */
function visibleText(): string[] {
  return Array.from(document.body.querySelectorAll("h1, p, button, div.kid-name, span.label"))
    .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .filter((text) => text !== "");
}

describe("ParentScreen (characterization)", () => {
  afterEach(() => {
    cleanup();
    config.supabase = true;
  });

  it("no Supabase settings: device-only note, no sign-in", () => {
    config.supabase = false;
    show();
    expect(visibleText()).toMatchInlineSnapshot(`
      [
        "Parent area",
        "Back",
        "This device has no Supabase settings, so the app is saving on the device only. Everything still works; nothing is synced.",
        "[FamilySettings]",
        "[ProgressView]",
      ]
    `);
  });

  it("Supabase on, sign-in state not known yet: 'Checking…'", () => {
    show({ auth: auth({ ready: false }) });
    expect(visibleText()).toMatchInlineSnapshot(`
      [
        "Parent area",
        "Back",
        "Checking…",
        "[FamilySettings]",
        "[ProgressView]",
      ]
    `);
  });

  it("signed out: offers Google sign-in", () => {
    show();
    expect(visibleText()).toMatchInlineSnapshot(`
      [
        "Parent area",
        "Back",
        "Sign in once on each device to keep the same scores everywhere. Kids never sign in - this is only for you.",
        "Continue with Google",
        "Games keep working when you are signed out or offline. Scores are saved on the device first.",
        "[FamilySettings]",
        "[ProgressView]",
      ]
    `);
  });

  it("signed in and online, in a family: shows the email and the parents section", () => {
    show({
      auth: auth({ session: SIGNED_IN }),
      syncStatus: { online: true, pending: 0, error: null },
      admin: {} as FamilyAdmin,
    });
    expect(visibleText()).toMatchInlineSnapshot(`
      [
        "Parent area",
        "Back",
        "Signed in as",
        "parent@example.com",
        "Scores are saved in your family's database, so the phone, the tablet and this computer all show the same history.",
        "Sign out",
        "[FamilyParents]",
        "[FamilySettings]",
        "[ProgressView]",
      ]
    `);
  });

  it("signed in but offline with 2 changes waiting", () => {
    show({
      auth: auth({ session: SIGNED_IN }),
      syncStatus: { online: false, pending: 2, error: "network" },
    });
    expect(visibleText()).toMatchInlineSnapshot(`
      [
        "Parent area",
        "Back",
        "Signed in as",
        "parent@example.com",
        "Working offline. Games are saved on this device. 2 changes will be sent when the connection is back.",
        "Sign out",
        "[FamilySettings]",
        "[ProgressView]",
      ]
    `);
  });

  // Found by mutation testing: this case was only covered by accident.
  it("signed in, before the first sync (no status yet): shows the online message", () => {
    show({ auth: auth({ session: SIGNED_IN }), syncStatus: null });
    expect(visibleText()).toContain(
      "Scores are saved in your family's database, so the phone, the tablet and this computer all show the same history.",
    );
  });

  it("shows load and sign-in errors at the bottom", () => {
    show({ auth: auth({ error: "popup closed" }), syncError: "fetch failed" });
    expect(visibleText()).toMatchInlineSnapshot(`
      [
        "Parent area",
        "Back",
        "Sign in once on each device to keep the same scores everywhere. Kids never sign in - this is only for you.",
        "Continue with Google",
        "Games keep working when you are signed out or offline. Scores are saved on the device first.",
        "[FamilySettings]",
        "[ProgressView]",
        "Working offline",
        "The app could not reach your database, so it is using the scores saved on this device.",
        "fetch failed",
        "Sign-in problem",
        "popup closed",
      ]
    `);
  });

  it("buttons call sign-in, sign-out and back", () => {
    const signedOut = auth();
    const onBack = vi.fn();
    show({ auth: signedOut, onBack });
    fireEvent.click(screen.getByText("Continue with Google"));
    fireEvent.click(screen.getByText("Back"));
    expect(signedOut.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);

    cleanup();
    const signedIn = auth({ session: SIGNED_IN });
    show({ auth: signedIn });
    fireEvent.click(screen.getByText("Sign out"));
    expect(signedIn.signOut).toHaveBeenCalledTimes(1);
  });
});
