const X_LAUNCHED_AT = Date.UTC(2006, 2, 21);
const MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;
const X_SNOWFLAKE_EPOCH_MS = 1_288_834_974_657;

function plausibleXDate(value: unknown, now = Date.now()) {
  if (value == null || value === "") return null;
  let timestamp: number;
  if (typeof value === "number" || (typeof value === "string" && /^\d{9,14}$/.test(value.trim()))) {
    const numeric = Number(value);
    timestamp = numeric < 100_000_000_000 ? numeric * 1000 : numeric;
  } else {
    timestamp = new Date(String(value)).getTime();
  }
  if (!Number.isFinite(timestamp) || timestamp < X_LAUNCHED_AT || timestamp > now + MAX_CLOCK_SKEW_MS) return null;
  return new Date(timestamp).toISOString();
}

export function normalizeXPublishedAt(candidates: unknown[], snowflakeId = "", now = Date.now()) {
  for (const candidate of candidates) {
    const normalized = plausibleXDate(candidate, now);
    if (normalized) return normalized;
  }
  if (/^\d{15,22}$/.test(snowflakeId)) {
    try {
      const timestamp = Number((BigInt(snowflakeId) >> BigInt(22)) + BigInt(X_SNOWFLAKE_EPOCH_MS));
      return plausibleXDate(timestamp, now);
    } catch {
      return null;
    }
  }
  return null;
}
