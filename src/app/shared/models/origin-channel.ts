/**
 * Canonical OriginChannelResponse shared across features.
 * Single source of truth — features re-export from here.
 */

export interface OriginChannelResponse {
  id?: number;
  name?: string;
  active?: boolean;
}
