/**
 * New unique id. crypto.randomUUID() is built into browsers and Node, so we
 * need no library. It is the same idea as Guid.NewGuid() in C#.
 */
export function newId(): string {
  return crypto.randomUUID();
}
