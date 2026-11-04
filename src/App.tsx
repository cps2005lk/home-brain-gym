import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/useAuth";
import { GUEST_KID } from "./data/defaults";
import { createLocalRepository } from "./data/localRepository";
import { createPendingQueue } from "./data/pendingQueue";
import type { GymRepository } from "./data/repository";
import { statsFor } from "./data/stats";
import { supabase } from "./data/supabaseClient";
import { createSupabaseRepository } from "./data/supabaseRepository";
import { createSyncRepository, type SyncStatus } from "./data/syncRepository";
import type { FamilyData, Kid } from "./data/types";
import { findGame } from "./games";
import { KidEditor } from "./components/KidEditor";
import type { FinishedPlay } from "./play/types";
import { HomeScreen } from "./screens/HomeScreen";
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
  | { readonly kind: "parent" };

export default function App() {
  const [data, setData] = useState<FamilyData | null>(null);
  const [kidId, setKidId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: "picker" });
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  /** When the data was loaded. The charts use this instead of reading the clock. */
  const [loadedAtIso, setLoadedAtIso] = useState("1970-01-01T00:00:00.000Z");
  const auth = useAuth();

  /**
   * Signed in -> talk to Supabase. Signed out or no settings -> this device only.
   * `useMemo` keeps the same repository until the signed-in user changes, so
   * the effect below does not reload on every redraw.
   */
  const userId = auth.session?.user.id ?? null;
  const repository = useMemo<GymRepository>(() => {
    if (!userId || !supabase) return deviceRepository;
    // Local-first: the device is written first, the server catches up.
    const remote = createSupabaseRepository(supabase, deviceRepository);
    const queue = createPendingQueue(window.localStorage);
    return createSyncRepository(deviceRepository, remote, queue, setSyncStatus);
  }, [userId]);

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
