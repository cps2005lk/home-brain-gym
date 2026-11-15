/**
 * Characterization tests: they record what familyAdmin does TODAY, not what
 * it should do. If one fails, behaviour changed - decide whether on purpose.
 *
 * The snapshots were filled in by running the code (`vitest -u`), then read
 * by a human. Like Verify's `.verified.txt` files in .NET.
 */
import { describe, expect, it } from "vitest";
import { createFamilyAdmin } from "./familyAdmin";
import type { GymSupabaseClient } from "./supabaseClient";

type Result = { data?: unknown; error?: { message: string } | null };

/**
 * A stand-in for the Supabase client. It writes down every call in `log` and
 * answers with `result`. Supabase queries are chains (`from().select()...`)
 * that you can `await`, so every link returns the same chain object.
 */
function fakeClient(result: Result = {}) {
  const log: string[] = [];
  const answer = { data: result.data ?? null, error: result.error ?? null };
  const chain = {
    select: (columns: string) => (log.push(`select(${columns})`), chain),
    order: (column: string, options?: unknown) => (
      log.push(`order(${column}${options ? `, ${JSON.stringify(options)}` : ""})`),
      chain
    ),
    delete: () => (log.push("delete()"), chain),
    eq: (column: string, value: unknown) => (log.push(`eq(${column}, ${String(value)})`), chain),
    then: (resolve: (value: typeof answer) => unknown) => resolve(answer),
  };
  const client = {
    from: (table: string) => (log.push(`from(${table})`), chain),
    rpc: (name: string, args: unknown) => {
      log.push(`rpc(${name}, ${JSON.stringify(args)})`);
      return Promise.resolve(answer);
    },
  };
  return { admin: createFamilyAdmin(client as unknown as GymSupabaseClient), log };
}

describe("familyAdmin (characterization)", () => {
  it("listParents reads family_members, oldest first, and renames the columns", async () => {
    const { admin, log } = fakeClient({
      data: [{ user_id: "u1", email: "a@example.com", created_at: "2026-11-05T10:00:00Z" }],
    });

    const parents = await admin.listParents();

    expect(log).toMatchInlineSnapshot(`
      [
        "from(family_members)",
        "select(user_id, email, created_at)",
        "order(created_at)",
      ]
    `);
    expect(parents).toMatchInlineSnapshot(`
      [
        {
          "email": "a@example.com",
          "joinedAt": "2026-11-05T10:00:00Z",
          "userId": "u1",
        },
      ]
    `);
  });

  it("listInvites reads family_invites, newest first", async () => {
    const { admin, log } = fakeClient({ data: [] });

    expect(await admin.listInvites()).toEqual([]);
    expect(log).toMatchInlineSnapshot(`
      [
        "from(family_invites)",
        "select(id, code, email, created_at, expires_at, accepted_at, revoked_at)",
        "order(created_at, {"ascending":false})",
      ]
    `);
  });

  it("an empty answer (data: null) becomes an empty list, not an error", async () => {
    const { admin } = fakeClient({ data: null });

    expect(await admin.listParents()).toEqual([]);
    expect(await admin.listInvites()).toEqual([]);
  });

  it("createInvite without an email leaves the argument out", async () => {
    const { admin, log } = fakeClient({ data: "ZDSZQ8XA" });

    expect(await admin.createInvite()).toBe("ZDSZQ8XA");
    expect(await admin.createInvite(null)).toBe("ZDSZQ8XA");
    expect(await admin.createInvite("b@example.com")).toBe("ZDSZQ8XA");
    expect(log).toMatchInlineSnapshot(`
      [
        "rpc(create_invite, {})",
        "rpc(create_invite, {})",
        "rpc(create_invite, {"invite_email":"b@example.com"})",
      ]
    `);
  });

  // The database's accept_invite does upper(trim(code)), so this is safe.
  it("acceptInvite sends the code exactly as typed", async () => {
    const { admin, log } = fakeClient({ data: "family-1" });

    expect(await admin.acceptInvite(" zdszq8xa ")).toBe("family-1");
    expect(log).toMatchInlineSnapshot(`
      [
        "rpc(accept_invite, {"invite_code":" zdszq8xa "})",
      ]
    `);
  });

  // No family filter. Safe only while a person can be in one family
  // (accept_invite refuses a second). See docs/brain/known-issues.md.
  it("removeParent deletes by user id only, not by family", async () => {
    const { admin, log } = fakeClient();

    await admin.removeParent("u2");

    expect(log).toMatchInlineSnapshot(`
      [
        "from(family_members)",
        "delete()",
        "eq(user_id, u2)",
      ]
    `);
  });

  it("revokeInvite calls the database function", async () => {
    const { admin, log } = fakeClient();

    await admin.revokeInvite("invite-1");

    expect(log).toMatchInlineSnapshot(`
      [
        "rpc(revoke_invite, {"invite_id":"invite-1"})",
      ]
    `);
  });

  it("wraps database errors with what it was doing", async () => {
    const { admin } = fakeClient({ error: { message: "permission denied" } });

    await expect(admin.listParents()).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: reading the parents: permission denied]`,
    );
    await expect(admin.createInvite()).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: making an invite: permission denied]`,
    );
    await expect(admin.removeParent("u2")).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: removing the parent: permission denied]`,
    );
  });

  it("treats a missing code or family id as an error", async () => {
    const { admin } = fakeClient({ data: null });

    await expect(admin.createInvite()).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: making an invite: no code came back]`,
    );
    await expect(admin.acceptInvite("X")).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: joining the family: no family came back]`,
    );
  });
});
