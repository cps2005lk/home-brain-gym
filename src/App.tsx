import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/useAuth";
import { GUEST_KID } from "./data/defaults";
import { createLocalRepository } from "./data/localRepository";
import type { GymRepository } from "./data/repository";
import { statsFor } from "./data/stats";
import { supabase } from "./data/supabaseClient";
import { createSupabaseRepository } from "./data/supabaseRepository";
import type { FamilyData, Kid } from "./data/types";
import { findGame } from "./games";
import { KidEditor } from "./components/KidEditor";
import type { FinishedPlay } from "./play/types";
import { HomeScreen } from "./screens/HomeScreen";
import { KidPicker } from "./screens/KidPicker";
import { ParentScreen } from "./screens/ParentScreen";
import { PlayScreen } from "./screens/PlayScreen";

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
  const auth = useAuth();

  /**
   * Signed in -> talk to Supabase. Signed out or no settings -> this device only.
   * `useMemo` keeps the same repository until the signed-in user changes, so
   * the effect below does not reload on every redraw.
   */
  const userId = auth.session?.user.id ?? null;
  const repository = useMemo<GymRepository>(() => {
    if (!userId || !supabase) return deviceRepository;
    return createSupabaseRepository(supabase, deviceRepository);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    const remember = (loaded: FamilyData): void => {
      if (cancelled) return;
      setData(loaded);
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

  function backToPicker(): void {
    setKidId(null);
    setScreen({ kind: "picker" });
  }

  if (screen.kind === "parent") {
    return <ParentScreen auth={auth} syncError={syncError} onBack={backToPicker} />;
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
      onChoose={(id) => void chooseKid(id)}
      onEdit={(kid) => setScreen({ kind: "edit", kidId: kid.id })}
      onParentArea={() => setScreen({ kind: "parent" })}
    />
  );
}
