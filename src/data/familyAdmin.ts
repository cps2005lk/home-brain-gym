import type { GymSupabaseClient } from "./supabaseClient";
import type { FamilyInvite, FamilyParent } from "./invites";

/**
 * The family's own admin: who can open it, and who has been invited.
 *
 * Kept apart from GymRepository on purpose. Playing games works with no
 * account at all, so the device repository has no business pretending it can
 * invite anybody. These calls only exist once a parent is signed in.
 */
export interface FamilyAdmin {
  listParents(): Promise<readonly FamilyParent[]>;
  listInvites(): Promise<readonly FamilyInvite[]>;
  /** Returns the new code. An email, if given, locks the code to it. */
  createInvite(email?: string | null): Promise<string>;
  revokeInvite(inviteId: string): Promise<void>;
  /** Returns the family id that was joined. */
  acceptInvite(code: string): Promise<string>;
  removeParent(userId: string): Promise<void>;
}

function failIf(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`${what}: ${error.message}`);
}

export function createFamilyAdmin(client: GymSupabaseClient): FamilyAdmin {
  return {
    listParents: async () => {
      const { data, error } = await client
        .from("family_members")
        .select("user_id, email, created_at")
        .order("created_at");
      failIf(error, "reading the parents");

      return (data ?? []).map((row) => ({
        userId: row.user_id,
        email: row.email,
        joinedAt: row.created_at,
      }));
    },

    listInvites: async () => {
      const { data, error } = await client
        .from("family_invites")
        .select("id, code, email, created_at, expires_at, accepted_at, revoked_at")
        .order("created_at", { ascending: false });
      failIf(error, "reading the invites");

      return (data ?? []).map((row) => ({
        id: row.id,
        code: row.code,
        email: row.email,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at,
        revokedAt: row.revoked_at,
      }));
    },

    /**
     * All three of these are database functions, not table writes. The rules
     * deliberately allow no direct writing here: only the functions decide who
     * may join a family.
     */
    createInvite: async (email) => {
      const { data, error } = await client.rpc("create_invite", {
        invite_email: email ?? undefined,
      });
      failIf(error, "making an invite");
      if (!data) throw new Error("making an invite: no code came back");
      return data;
    },

    revokeInvite: async (inviteId) => {
      const { error } = await client.rpc("revoke_invite", { invite_id: inviteId });
      failIf(error, "cancelling the invite");
    },

    acceptInvite: async (code) => {
      const { data, error } = await client.rpc("accept_invite", { invite_code: code });
      failIf(error, "joining the family");
      if (!data) throw new Error("joining the family: no family came back");
      return data;
    },

    removeParent: async (userId) => {
      // A plain delete, allowed by the "remove a parent" policy. The database
      // trigger still refuses to remove the last one.
      const { error } = await client.from("family_members").delete().eq("user_id", userId);
      failIf(error, "removing the parent");
    },
  };
}
