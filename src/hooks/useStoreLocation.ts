import { useState, useEffect } from 'react';

export interface LocationDetail {
  location: string;
  status: string;
  address: string;
  emailAddress: string;
  phoneNumber: string;
  hoursOfOperation: string[];
  coordinates: { latitude: number; longitude: number };
}

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Compresses Google's weekdayDescriptions into grouped lines, e.g. "Mon–Thu: 11:00 AM – 6:00 PM" */
export function formatHoursCompact(weekdayDescriptions: string[]): string[] {
  if (!weekdayDescriptions.length) return [];

  const parsed = weekdayDescriptions.map((desc, i) => {
    const colonIdx = desc.indexOf(':');
    const hours = colonIdx >= 0 ? desc.slice(colonIdx + 1).trim() : desc;
    return { abbr: DAY_ABBR[i] ?? desc, hours };
  });

  const groups: { days: string[]; hours: string }[] = [];
  for (const { abbr, hours } of parsed) {
    const last = groups[groups.length - 1];
    if (last && last.hours === hours) {
      last.days.push(abbr);
    } else {
      groups.push({ days: [abbr], hours });
    }
  }

  return groups.map(({ days, hours }) => {
    const range = days.length > 1 ? `${days[0]}–${days[days.length - 1]}` : days[0];
    return `${range}: ${hours}`;
  });
}

// Module-level cache — shared across all hook instances for the same slug
const cache = new Map<string, LocationDetail>();
const inflight = new Map<string, Promise<LocationDetail>>();

function fetchLocation(slug: string): Promise<LocationDetail> {
  if (cache.has(slug)) return Promise.resolve(cache.get(slug)!);
  if (inflight.has(slug)) return inflight.get(slug)!;

  const promise = fetch(`/.netlify/functions/locations?slug=${encodeURIComponent(slug)}`)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch location (${res.status})`);
      return res.json() as Promise<LocationDetail>;
    })
    .then((data) => {
      cache.set(slug, data);
      inflight.delete(slug);
      return data;
    })
    .catch((err) => {
      inflight.delete(slug);
      throw err;
    });

  inflight.set(slug, promise);
  return promise;
}

export function useStoreLocation(slug: string) {
  const [data, setData] = useState<LocationDetail | null>(() => cache.get(slug) ?? null);
  const [isLoading, setIsLoading] = useState(!cache.has(slug));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cache.has(slug)) return; // already cached, no fetch needed
    let cancelled = false;

    fetchLocation(slug)
      .then((location) => {
        if (!cancelled) { setData(location); setIsLoading(false); }
      })
      .catch((err) => {
        if (!cancelled) { setError(err); setIsLoading(false); }
      });

    return () => { cancelled = true; };
  }, [slug]);

  const compactHours = data ? formatHoursCompact(data.hoursOfOperation) : [];

  return { data, compactHours, isLoading, error };
}
