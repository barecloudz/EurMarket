import type { Handler } from '@netlify/functions';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

const GOOGLE_PLACES_API = 'https://places.googleapis.com/v1/places';
const FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'internationalPhoneNumber',
  'regularOpeningHours',
  'location',
  'businessStatus',
].join(',');

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_SECONDS = 3600;

interface StoreConfig {
  placeId: string;
  pageSlug: string;
  emailAddress: string;
  locationName: string;
}

const STORES: StoreConfig[] = [
  {
    placeId: 'ChIJgeyGQIljYIgR2dHFSd5gnE8',
    pageSlug: 'collegedale-tn',
    emailAddress: 'info@europeanmarketus.com',
    locationName: 'Collegedale, TN',
  },
  {
    placeId: 'ChIJ8Uwqhw1hV4gRwFKFAIs3j0U',
    pageSlug: 'columbus-nc',
    emailAddress: 'info@europeanmarketus.com',
    locationName: 'Columbus, NC',
  },
];

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  location?: { latitude: number; longitude: number };
  businessStatus?: string;
}

interface LocationSummary {
  location: string;
  pageSlug: string;
  status: string;
}

interface LocationDetail {
  location: string;
  status: string;
  address: string;
  emailAddress: string;
  phoneNumber: string;
  hoursOfOperation: string[];
  coordinates: { latitude: number; longitude: number };
}

// In-memory cache — persists across warm invocations of the same function instance
const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data as T;
}

function setCached(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function mapStatus(businessStatus?: string): string {
  if (businessStatus === 'OPERATIONAL') return 'Open';
  if (businessStatus === 'CLOSED_TEMPORARILY') return 'Temporarily Closed';
  if (businessStatus === 'CLOSED_PERMANENTLY') return 'Closed';
  return 'Open';
}

async function fetchPlace(placeId: string, apiKey: string): Promise<GooglePlace | null> {
  const cacheKey = `place:${placeId}`;
  const cached = getCached<GooglePlace>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${GOOGLE_PLACES_API}/${placeId}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
  });

  if (!response.ok) return null;
  const place = (await response.json()) as GooglePlace;
  setCached(cacheKey, place);
  return place;
}

function toSummary(place: GooglePlace, config: StoreConfig): LocationSummary {
  return {
    location: config.locationName,
    pageSlug: config.pageSlug,
    status: mapStatus(place.businessStatus),
  };
}

function toDetail(place: GooglePlace, config: StoreConfig): LocationDetail {
  return {
    location: config.locationName,
    status: mapStatus(place.businessStatus),
    address: place.formattedAddress ?? '',
    emailAddress: config.emailAddress,
    phoneNumber: place.internationalPhoneNumber ?? '',
    hoursOfOperation: place.regularOpeningHours?.weekdayDescriptions ?? [],
    coordinates: {
      latitude: place.location?.latitude ?? 0,
      longitude: place.location?.longitude ?? 0,
    },
  };
}

export const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers);
  const corsHeaders = getCorsHeaders(origin);

  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'Cache-Control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: responseHeaders, body: '' };
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ error: 'API key not configured' }),
    };
  }

  const slug = event.queryStringParameters?.slug;

  if (slug) {
    const config = STORES.find((s) => s.pageSlug === slug);
    if (!config) {
      return {
        statusCode: 404,
        headers: responseHeaders,
        body: JSON.stringify({ error: 'Location not found' }),
      };
    }

    const place = await fetchPlace(config.placeId, apiKey);
    if (!place) {
      // Return static fallback so the footer still renders
      const fallback: LocationDetail = {
        location: config.locationName,
        status: 'Open',
        address: config.pageSlug === 'columbus-nc'
          ? '155 W Mills Street, Columbus, NC 28722'
          : '4921 Ooltewah Ringgold Rd, Ooltewah, TN 37363',
        emailAddress: config.emailAddress,
        phoneNumber: config.pageSlug === 'columbus-nc' ? '+1 864-590-6760' : '+1 423-899-3099',
        hoursOfOperation: config.pageSlug === 'columbus-nc' ? [
          'Monday: 11:00 AM – 6:00 PM',
          'Tuesday: 11:00 AM – 6:00 PM',
          'Wednesday: Closed',
          'Thursday: 11:00 AM – 6:00 PM',
          'Friday: 11:00 AM – 3:00 PM',
          'Saturday: 5:00 PM – 7:00 PM',
          'Sunday: Closed',
        ] : [],
        coordinates: { latitude: 0, longitude: 0 },
      };
      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify(fallback),
      };
    }

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify(toDetail(place, config)),
    };
  }

  // All locations list
  const results = await Promise.all(
    STORES.map(async (config) => {
      const place = await fetchPlace(config.placeId, apiKey);
      if (!place) return { location: config.locationName, pageSlug: config.pageSlug, status: 'Open' } as LocationSummary;
      return toSummary(place, config);
    }),
  );

  const locations = results.filter((r): r is LocationSummary => r !== null);

  return {
    statusCode: 200,
    headers: responseHeaders,
    body: JSON.stringify(locations),
  };
};
