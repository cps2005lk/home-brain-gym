import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/useAuth";
import { GUEST_KID } from "./data/defaults";
import { createLocalRepository } from "./data/localRepository";
import { createFamilyAdmin } from "./data/familyAdmin";
import { forgetInviteCode } from "./data/inviteLink";
import { createPendingQueue } from "./data/pendingQueue";
import type { GymRepository } from "./data/repository";
import { statsFor } from "./data/stats";
import { timeLimitStatus } from "./data/timeLimit";
import { getSupabase, isSupabaseConfigured, type GymSupabaseClient } from "./data/supabaseClient";
import { createSupabaseRepository, findFamilyId, startFamily } from "./data/supabaseRepository";
import { createSyncRepository, type SyncStatus } from "./data/syncRepository";
import type { FamilyData, Kid } from "./data/types";
import { findGame } from "./games";
import { KidEditor } from "./components/KidEditor";
import type { FinishedPlay } from "./play/types";
import { HomeScreen } from "./screens/HomeScreen";
import { FamilyWelcome } from "./screens/FamilyWelcome";
import { KidPicker } from "./screens/KidPicker";
import { PlayScreen } from "./screens/PlayScreen";

/**
 * The parent area is loaded only when it is opened.
 *
 * It pulls in the chart library, which is big. Kids never open this screen, so
 * their phone never downloads it. `lazy` + `Suspense` is React's way of saying
 * "fetch this part later"; Vite then puts it in its own file automatically.
 */
const ParentScreen = lazy(() =>
  import("./screens/ParentScreen").then((module) => ({ default: module.ParentScreen })),
);

/** Always available: this device's own copy. */
const deviceRepository = createLocalRepository(window.localStorage);

/** Which screen we are on. A discriminated union again, now for navigation. */
type Screen =
  | { readonly kind: "picker" }
  | { readonly kind: "home" }
  | { readonly kind: "play"; readonly gameId: string }
  | { readonly kind: "edit"; readonly kidId: string }
  | { readonly kind: "parent" }
  | { readonly kind: "family" };

interface AppProps {
  /** A code from an invite link, kept on the device across the Google sign-in. */
  readonly pendingInvite: string | null;
}

export default function App({ pendingInvite }: AppProps) {
  const [data, setData] = useState<FamilyData | null>(null);
  const [kidId, setKidId] = useState<string | null>(null);
  /** An invite link opens the parent area, because that is where signing in is. */
  const [screen, setScreen] = useState<Screen>(
    pendingInvite ? { kind: "parent" } : { kind: "picker" },
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  /** When the data was loaded. The charts use this instead of reading the clock. */
  const [loadedAtIso, setLoadedAtIso] = useState("1970-01-01T00:00:00.000Z");
  const auth = useAuth();
  /**
   * The Supabase client arrives a moment after the app starts, because it is
   * downloaded separately. Until then the device copy is used, so the kid
   * picker appears straight away.
   */
  const [client, setClient] = useState<GymSupabaseClient | null>(null);
  /**
   * The family this parent belongs to. null means "signed in, but not in a
   * family yet" - a second parent who still has to use their invite code.
   * undefined means "we have not looked yet".
   */
  const [foundFamily, setFoundFamily] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    void getSupabase().then((loaded) => {
      if (!cancelled) setClient(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Signed in -> talk to Supabase. Signed out or no settings -> this device only.
   * `useMemo` keeps the same repository until the signed-in user changes, so
   * the effect below does not reload on every redraw.
   */
  const userId = auth.session?.user.id ?? null;

  /**
   * Worked out while drawing, not stored: signed out means "no family" without
   * any state to reset. Only the answer from the server is kept.
   */
  const familyId = client && userId ? foundFamily : undefined;

  /** Ask which family this parent belongs to, without creating one. */
  useEffect(() => {
    if (!client || !userId) return;
    let cancelled = false;
    void findFamilyId(client).then(
      (found) => {
        if (!cancelled) setFoundFamily(found);
      },
      () => {
        if (!cancelled) setFoundFamily(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [client, userId]);
  const repository = useMemo<GymRepository>(() => {
    if (!userId || !client || !familyId) return deviceRepository;
    // Local-first: the device is written first, the server catches up.
    const remote = createSupabaseRepository(client, deviceRepository, familyId);
    const queue = createPendingQueue(window.localStorage);
    return createSyncRepository(deviceRepository, remote, queue, setSyncStatus);
  }, [userId, client, familyId]);

  /**
   * A code that is no use any more (this parent already has a family) should
   * not sit on the device forever.
   */
  useEffect(() => {
    if (familyId && pendingInvite) forgetInviteCode(window.localStorage);
  }, [familyId, pendingInvite]);

  /** Inviting and removing parents only exists once we are in a family. */
  const admin = useMemo(
    () => (client && familyId ? createFamilyAdmin(client) : null),
    [client, familyId],
  );

  useEffect(() => {
    let cancelled = false;
    const remember = (loaded: FamilyData): void => {
      if (cancelled) return;
      setData(loaded);
      setLoadedAtIso(new Date().toISOString());
      setSyncError(null); // a good load clears an older problem
    };

    void repository.loadFamily().then(remember, (error: unknown) => {
      if (cancelled) return;
      // Supabase is unreachable or refused: keep playing from the device.
      setSyncError(error instanceof Error ? error.message : String(error));
      void deviceRepository.loadFamily().then(remember);
    });

    return () => {
      cancelled = true;
    };
  }, [repository]);

  /**
   * The browser tells us when the connection comes back. Loading again also
   * sends anything that was waiting in the queue.
   */
  useEffect(() => {
    const onOnline = (): void => {
      void repository.loadFamily().then(setData, () => undefined);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [repository]);

  if (!data) {
    return <p className="sub">Loading…</p>;
  }

  const currentKid: Kid | null =
    kidId === GUEST_KID.id ? GUEST_KID : (data.kids.find((kid) => kid.id === kidId) ?? null);

  async function refresh(): Promise<void> {
    setData(await repository.loadFamily());
  }

  async function chooseKid(id: string): Promise<void> {
    setKidId(id);
    setScreen({ kind: "home" });
    if (id !== GUEST_KID.id) await repository.setLastKid(id);
  }

  /** Used by the parent settings: save but stay where we are. */
  async function saveKidKeepingScreen(kid: Kid): Promise<void> {
    await repository.saveKid(kid);
    await refresh();
  }

  async function saveKid(kid: Kid): Promise<void> {
    await repository.saveKid(kid);
    await refresh();
    setScreen({ kind: "picker" });
  }

  async function savePlay(kid: Kid, play: FinishedPlay): Promise<void> {
    await repository.addSession({
      id: play.id,
      kidId: kid.id,
      gameId: play.gameId,
      level: kid.level,
      score: play.score,
      detail: play.detail,
      playedAt: new Date().toISOString(),
      durationMs: Math.round(play.durationMs),
    });
    await refresh();
  }

  async function deleteSession(sessionId: string): Promise<void> {
    await repository.deleteSession(sessionId);
    await refresh();
  }

  function backToPicker(): void {
    setKidId(null);
    setScreen({ kind: "picker" });
  }

  if (screen.kind === "family" || (screen.kind === "parent" && userId && familyId === null)) {
    return (
      <FamilyWelcome
        email={auth.session?.user.email ?? null}
        initialCode={pendingInvite ?? ""}
        onStartFamily={async () => {
          if (!client) throw new Error("not connected yet");
          setFoundFamily(await startFamily(client, deviceRepository));
          forgetInviteCode(window.localStorage);
          setScreen({ kind: "parent" });
        }}
        onJoinFamily={async (code) => {
          if (!client) throw new Error("not connected yet");
          setFoundFamily(await createFamilyAdmin(client).acceptInvite(code));
          forgetInviteCode(window.localStorage);
          setScreen({ kind: "parent" });
        }}
        onBack={backToPicker}
      />
    );
  }

  if (screen.kind === "parent") {
    return (
      <Suspense fallback={<p className="sub">Loading…</p>}>
        <ParentScreen
          auth={auth}
          syncError={syncError}
          syncStatus={syncStatus}
          kids={data.kids}
          sessions={data.sessions}
          nowIso={loadedAtIso}
          onDeleteSession={(sessionId) => void deleteSession(sessionId)}
          onSaveKid={(kid) => void saveKidKeepingScreen(kid)}
          admin={admin}
          onBack={backToPicker}
        />
      </Suspense>
    );
  }

  if (screen.kind === "edit") {
    const kid = data.kids.find((item) => item.id === screen.kidId);
    if (kid) {
      return (
        <KidEditor kid={kid} onSave={(updated) => void saveKid(updated)} onCancel={backToPicker} />
      );
    }
  }

  if (screen.kind === "play" && currentKid) {
    const game = findGame(screen.gameId);
    if (game) {
      return (
        <PlayScreen
          game={game}
          kid={currentKid}
          sessions={data.sessions}
          nowIso={loadedAtIso}
          canPlayAgain={timeLimitStatus(currentKid, data.sessions, loadedAtIso).canStartGame}
          previousBest={statsFor(data.sessions, currentKid.id, game.meta.id).best}
          onSave={(play) => void savePlay(currentKid, play)}
          onHome={() => setScreen({ kind: "home" })}
        />
      );
    }
  }

  if (screen.kind === "home" && currentKid) {
    return (
      <HomeScreen
        kid={currentKid}
        sessions={data.sessions}
        nowIso={loadedAtIso}
        onPlay={(gameId) => setScreen({ kind: "play", gameId })}
        onSwitchKid={backToPicker}
      />
    );
  }

  return (
    <KidPicker
      kids={data.kids}
      sessions={data.sessions}
      lastKidId={data.lastKidId}
      nowIso={loadedAtIso}
      onChoose={(id) => void chooseKid(id)}
      onEdit={(kid) => setScreen({ kind: "edit", kidId: kid.id })}
      onParentArea={() => setScreen({ kind: "parent" })}
    />
  );
}
