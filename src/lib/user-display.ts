/**
 * Peer-visible name for marketplace / summaries.
 * If no custom alias is stored, use login User ID (`username`).
 */
export function peerAlias(user: { username: string; publicAlias: string | null }): string {
  const custom = user.publicAlias?.trim();
  return custom || user.username;
}
