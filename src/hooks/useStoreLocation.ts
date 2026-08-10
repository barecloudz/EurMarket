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

export function useStoreLocation(slug: string) {
  const [data, setData] = useState<LocationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/.netlify/functions/locations?slug=${encodeURIComponent(slug)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch location (${res.status})`);
        return res.json() as Promise<LocationDetail>;
      })
      .then((location) => {
        setData(location);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [slug]);

  const compactHours = data ? formatHoursCompact(data.hoursOfOperation) : [];

  return { data, compactHours, isLoading, error };
}
