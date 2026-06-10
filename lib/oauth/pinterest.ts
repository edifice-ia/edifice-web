export const PINTEREST_EXPECTED_SCOPES = [
  "boards:read",
  "boards:write",
  "pins:read",
  "pins:write",
  "user_accounts:read",
] as const;

export type PinterestExpectedScope = (typeof PINTEREST_EXPECTED_SCOPES)[number];

export type PinterestScopeDiagnostic = {
  requested: string[];
  granted: string[];
  missing: string[];
};

export function splitPinterestScopes(scope: string | null | undefined) {
  return scope?.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean) ?? [];
}

export function buildPinterestScopeDiagnostic(
  grantedScopes: string[] | string | null | undefined,
): PinterestScopeDiagnostic {
  const granted = Array.isArray(grantedScopes)
    ? grantedScopes
    : splitPinterestScopes(grantedScopes);

  return {
    requested: [...PINTEREST_EXPECTED_SCOPES],
    granted,
    missing: PINTEREST_EXPECTED_SCOPES.filter((scope) => !granted.includes(scope)),
  };
}
