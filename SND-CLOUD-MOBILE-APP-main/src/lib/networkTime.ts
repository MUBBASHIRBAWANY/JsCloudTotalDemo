const TIMEZONE = 'Asia/Karachi';
const NETWORK_TIMEOUT_MS = 4000;

export const formatBusinessDate = (value: Date | string | number) => {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

/** Asia/Karachi calendar date from the phone clock (offline fallback). */
export const deviceBusinessDate = () => formatBusinessDate(new Date());

const dateFromPayload = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as {
    date?: unknown;
    datetime?: unknown;
    dateTime?: unknown;
    year?: unknown;
    month?: unknown;
    day?: unknown;
  };
  if (typeof record.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(record.date)) {
    return record.date.slice(0, 10);
  }
  if (typeof record.datetime === 'string') return formatBusinessDate(record.datetime);
  if (typeof record.dateTime === 'string') return formatBusinessDate(record.dateTime);
  if (
    typeof record.year === 'number'
    && typeof record.month === 'number'
    && typeof record.day === 'number'
  ) {
    return `${record.year}-${String(record.month).padStart(2, '0')}-${String(record.day).padStart(2, '0')}`;
  }
  return '';
};

const fetchWithTimeout = async (url: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
};

const fetchFromWorldTime = async () => {
  const data = await fetchWithTimeout(`https://worldtimeapi.org/api/timezone/${TIMEZONE}`);
  return dateFromPayload(data) || formatBusinessDate(data.datetime);
};

const fetchFromTimeApi = async () => {
  const data = await fetchWithTimeout(
    `https://timeapi.io/api/Time/current/zone?timeZone=${encodeURIComponent(TIMEZONE)}`,
  );
  return dateFromPayload(data);
};

export type BusinessDateResult = {
  date: string;
  source: 'network' | 'device';
};

/**
 * Prefer internet date (Asia/Karachi). If offline / APIs fail or hang,
 * fall back quickly to device calendar date in Asia/Karachi.
 */
export const resolveBusinessDate = async (): Promise<BusinessDateResult> => {
  const sources = [fetchFromWorldTime, fetchFromTimeApi];
  for (const source of sources) {
    try {
      const date = String(await source()).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return { date, source: 'network' };
    } catch {
      // Try the next internet date source, then device.
    }
  }

  const fallback = deviceBusinessDate();
  if (/^\d{4}-\d{2}-\d{2}$/.test(fallback)) {
    return { date: fallback, source: 'device' };
  }

  // Last resort: local YYYY-MM-DD if Intl somehow fails.
  const now = new Date();
  const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { date: local, source: 'device' };
};

/** YYYY-MM-DD (Asia/Karachi). Internet first, then device clock. */
export const fetchNetworkDate = async (): Promise<string> => {
  const resolved = await resolveBusinessDate();
  return resolved.date;
};
