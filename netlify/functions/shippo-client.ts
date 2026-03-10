import { Shippo } from 'shippo';

let shippoClient: Shippo | null = null;

/**
 * Get a Shippo client instance (reused across invocations in same Lambda container)
 */
export function getShippoClient(): Shippo {
  if (!shippoClient) {
    const apiKey = process.env.SHIPPO_API_KEY;
    if (!apiKey) {
      throw new Error('SHIPPO_API_KEY not configured');
    }
    shippoClient = new Shippo({ apiKeyHeader: apiKey });
  }
  return shippoClient;
}

// Origin address for all shipments
// TODO: Update with Genova's shipping address when ready
export const FROM_ADDRESS = {
  name: "Genova's Pizza",
  street1: 'TBD',
  city: 'Myrtle Beach',
  state: 'SC',
  zip: 'TBD',
  country: 'US',
  email: 'TBD',
  phone: 'TBD',
};

// Default parcel dimensions (inches)
export const DEFAULT_PARCEL = {
  length: '12',
  width: '8',
  height: '6',
  distanceUnit: 'in' as const,
};
