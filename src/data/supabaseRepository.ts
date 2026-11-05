import type { SupabaseClient } from "@supabase/supabase-js";
import { newId } from "../core/ids";
import type { Database } from "./database.types";
import { createDefaultFamilyData, GUEST_KID } from "./defaults";
import { kidFromRow, kidToRow, sessionFromRow, sessionToRow } from "./mappers";
import type { GymRepository } from "./repository";
import type { FamilyData, GameSession, Kid } from "./types";

type Client = SupabaseClient<Database>;

/**
 * Supabase errors are returned, not thrown: every call gives back
 * { data, error }. This turns an error into a real throw, so the calling code
 * can use ordinary try/catch like in C#.
 */
function failIf(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`${what}: ${error.message}`);
}

/**
 * The family this parent already belongs to, or null if they belong to none.
 *
 * Nothing is created here. A second parent who is about to join with an invite
 * code must NOT be given a family of their own first - that would make the
 * code useless ("you are already in a family").
 */
export async function findFamilyId(client: Client): Promise<string | null> {
  const { data, error } = await client
    .from("family_members")
    .select("family_id")
    .order("created_at")
    .limit(1);
  failIf(error, "reading your family");
  return data?.[0]?.family_id ?? null;
}

/**
 * Make a family for this parent and copy this device's kids into it.
 *
 * The SQL function does the deciding: if the parent already has a family it
 * returns that one, so calling this twice at the same moment can never make
 * two families. The database is the only place that can settle that race.
 */
export async function startFamily(client: Client, device: GymRepository): Promise<string> {
  const familyId = await openFamily(client);
  await seedKids(client, device, familyId);
  return familyId;
}

async function openFamily(client: Client): Promise<string> {
  const { data, error } = await client.rpc("create_family", { family_name: "My family" });
  failIf(error, "opening your family");
  if (!data) throw new Error("opening your family: no id came back");
  return data;
}

/**
 * Put this device's kids into a brand new family, so their names and pictures
 * carry over. Does nothing if the family already has kids, so it is safe to
 * run on every sign-in.
 */
async function seedKids(client: Client, device: GymRepository, familyId: string): Promise<void> {
  const { count, error } = await client
    .from("kids")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId);
  failIf(error, "counting the kids");
  if ((count ?? 0) > 0) return;

  const fromDevice = (await device.loadFamily()).kids.filter((kid) => kid.id !== GUEST_KID.id);
  // Ids must be real uuids, so make them here rather than letting the
  // defaults fall back to "kid-1" and "kid-2", which Postgres would refuse.
  const seed =
    fromDevice.length > 0 ? fromDevice : createDefaultFamilyData(familyId, [newId(), newId()]).kids;

  const { error: insertError } = await client
    .from("kids")
    .insert(seed.map((kid) => kidToRow({ ...kid, familyId })));
  failIf(insertError, "adding your kids");
}

/**
 * The same GymRepository the screens already use, but talking to Postgres.
 * Nothing in the UI changes - that is what the interface was for.
 *
 * `device` is the local repository. It still owns one thing that belongs to
 * this device alone: who played last here.
 */
export function createSupabaseRepository(
  client: Client,
  device: GymRepository,
  /** The family this parent belongs to, found or made before we get here. */
  family: string,
): GymRepository {
  const familyId = (): Promise<string> => Promise.resolve(family);

  return {
    loadFamily: async (): Promise<FamilyData> => {
      const id = await familyId();

      // Independent queries, so run them together. Promise.all is Task.WhenAll.
      const [familyResult, kidsResult, sessionsResult, deviceData] = await Promise.all([
        client.from("families").select("id, name").eq("id", id).single(),
        client.from("kids").select("*").eq("family_id", id).order("created_at"),
        client.from("sessions").select("*").eq("family_id", id).order("played_at"),
        device.loadFamily(),
      ]);

      failIf(familyResult.error, "reading your family");
      failIf(kidsResult.error, "reading the kids");
      failIf(sessionsResult.error, "reading the scores");

      return {
        version: 1,
        family: { id, name: familyResult.data?.name ?? "My family" },
        kids: (kidsResult.data ?? []).map(kidFromRow),
        sessions: (sessionsResult.data ?? []).map(sessionFromRow),
        // Per device, not per family: this phone's last player.
        lastKidId: deviceData.lastKidId,
      };
    },

    saveKid: async (kid: Kid): Promise<void> => {
      const id = await familyId();
      const { error } = await client
        .from("kids")
        .update(kidToRow({ ...kid, familyId: id }))
        .eq("id", kid.id);
      failIf(error, "saving the kid");
    },

    addSession: async (session: GameSession): Promise<void> => {
      if (session.kidId === GUEST_KID.id) return; // a guest leaves no trace
      const id = await familyId();
      // upsert = insert, or replace the row that already has this id.
      const { error } = await client.from("sessions").upsert(sessionToRow(session, id));
      failIf(error, "saving the score");
    },

    deleteSession: async (sessionId: string): Promise<void> => {
      const { error } = await client.from("sessions").delete().eq("id", sessionId);
      failIf(error, "removing the score");
    },

    // Stays on the device: each phone or tablet remembers its own last player.
    setLastKid: (kidId: string | null): Promise<void> => device.setLastKid(kidId),
  };
}
