export type ProviderUserInfo = { providerId?: string; rawId?: string };
export type Account = {
  localId: string;
  providerUserInfo?: ProviderUserInfo[];
};
export type UidMap = Record<string, string>;

export type Plan = {
  toLink: { localId: string; rawId: string }[];
  alreadyLinked: string[];
  noLegacy: string[];
  unmapped: string[];
  conflicts: { localId: string; reason: string }[];
};

function rawIdFor(account: Account, providerId: string) {
  return account.providerUserInfo?.find((p) => p.providerId === providerId)
    ?.rawId;
}

// Classifies every account; pure so it can be checked without the API.
export function planLinks(
  accounts: Account[],
  uidMap: UidMap,
  options: { legacyProvider: string; provider: string },
): Plan {
  const plan: Plan = {
    toLink: [],
    alreadyLinked: [],
    noLegacy: [],
    unmapped: [],
    conflicts: [],
  };

  // every account that resolves to, or already holds, each target id
  const claimants = new Map<string, Set<string>>();
  const claim = (rawId: string, localId: string) => {
    const set = claimants.get(rawId) ?? new Set<string>();
    set.add(localId);
    claimants.set(rawId, set);
  };

  const candidates: { localId: string; rawId: string }[] = [];
  for (const account of accounts) {
    const linked = rawIdFor(account, options.provider);
    if (linked) claim(linked, account.localId);

    const legacyUid = rawIdFor(account, options.legacyProvider);
    if (!legacyUid) {
      plan.noLegacy.push(account.localId);
      continue;
    }
    const target = Object.hasOwn(uidMap, legacyUid)
      ? uidMap[legacyUid]
      : undefined;
    if (!target) {
      plan.unmapped.push(account.localId);
      continue;
    }
    claim(target, account.localId);

    if (linked === target) {
      plan.alreadyLinked.push(account.localId);
    } else if (linked) {
      plan.conflicts.push({
        localId: account.localId,
        reason: `already linked under ${options.provider} to a different id`,
      });
    } else {
      candidates.push({ localId: account.localId, rawId: target });
    }
  }

  for (const candidate of candidates) {
    const others = [...(claimants.get(candidate.rawId) ?? [])].filter(
      (id) => id !== candidate.localId,
    );
    if (others.length > 0) {
      plan.conflicts.push({
        localId: candidate.localId,
        reason: `same target id as ${others.join(", ")}`,
      });
    } else {
      plan.toLink.push(candidate);
    }
  }

  return plan;
}

// Picks the one "to link" account for a trial run, or says why it can't.
export function selectOnly(
  plan: Plan,
  accounts: Account[],
  legacyUid: string,
  legacyProvider: string,
): { item: { localId: string; rawId: string } } | { error: string } {
  const account = accounts.find(
    (a) => rawIdFor(a, legacyProvider) === legacyUid,
  );
  if (!account) {
    return { error: `no account has that uid under ${legacyProvider}` };
  }
  const { localId } = account;
  const item = plan.toLink.find((i) => i.localId === localId);
  if (item) return { item };
  if (plan.alreadyLinked.includes(localId)) {
    return { error: `${localId} is already linked` };
  }
  if (plan.unmapped.includes(localId)) {
    return { error: `${localId} has a legacy uid that is not in the map` };
  }
  const conflict = plan.conflicts.find((c) => c.localId === localId);
  return {
    error: `${localId} is a conflict: ${conflict?.reason ?? "unknown"}`,
  };
}
