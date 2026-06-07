export const pinterestOAuthAccounts = [
  {
    accountKey: "edifice_discipline",
    label: "Pinterest - Edifice Discipline",
  },
  {
    accountKey: "solution_sommeil",
    label: "Pinterest - Solution Sommeil",
  },
] as const;

export type PinterestOAuthAccountKey =
  (typeof pinterestOAuthAccounts)[number]["accountKey"];

export function getPinterestOAuthAccount(accountKey: string | null | undefined) {
  return pinterestOAuthAccounts.find((account) => account.accountKey === accountKey);
}

export function isPinterestOAuthAccountKey(
  accountKey: string | null | undefined,
): accountKey is PinterestOAuthAccountKey {
  return Boolean(getPinterestOAuthAccount(accountKey));
}
