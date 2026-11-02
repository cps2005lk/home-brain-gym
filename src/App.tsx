import { useEffect, useState } from "react";
import { GUEST_KID } from "./data/defaults";
import { createLocalRepository } from "./data/localRepository";
import type { FamilyData, Kid } from "./data/types";
import { findGame } from "./games";
import { KidEditor } from "./components/KidEditor";
import { HomeScreen } from "./screens/HomeScreen";
import { KidPicker } from "./screens/KidPicker";
import { PlayPlaceholder } from "./screens/PlayPlaceholder";

/**
 * One repository for the whole app. Milestone 5 swaps this single line for the
 * Supabase version; no screen knows the difference.
 */
const repository = createLocalRepository(window.localStorage);

/** Which screen we are on. A discriminated union again, now for navigation. */
type Screen =
  | { readonly kind: "picker" }
  | { readonly kind: "home" }
  | { readonly kind: "play"; readonly gameId: string }
  | { readonly kind: "edit"; readonly kidId: string };

export default function App() {
  /** `useState<T | null>` needs the type written, because null alone says nothing. */
  const [data, setData] = useState<FamilyData | null>(null);
  const [kidId, setKidId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: "picker" });

  /**
   * `useEffect` runs *after* drawing. This one loads the saved family once,
   * because the dependency list at the end is empty.
   * `void` in front of the promise says "I am not waiting for this on purpose".
   */
  useEffect(() => {
    void repository.loadFamily().then(setData);
  }, []);

  if (!data) {
    return <p className="sub">Loading…</p>;
  }

  const currentKid: Kid | null =
    kidId === GUEST_KID.id ? GUEST_KID : (data.kids.find((kid) => kid.id === kidId) ?? null);

  async function chooseKid(id: string): Promise<void> {
    setKidId(id);
    setScreen({ kind: "home" });
    if (id !== GUEST_KID.id) await repository.setLastKid(id);
  }

  async function saveKid(kid: Kid): Promise<void> {
    await repository.saveKid(kid);
    setData(await repository.loadFamily());
    setScreen({ kind: "picker" });
  }

  function backToPicker(): void {
    setKidId(null);
    setScreen({ kind: "picker" });
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
        <PlayPlaceholder game={game} kid={currentKid} onBack={() => setScreen({ kind: "home" })} />
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
    />
  );
}
