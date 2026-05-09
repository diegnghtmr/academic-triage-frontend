/**
 * Canonical OriginChannelResponse shared across features.
 * Single source of truth — features re-export from here.
 */

export interface OriginChannelResponse {
  id?: number;
  name?: string;
  active?: boolean;
}

/**
 * Canonical name used to resolve the default web channel for student-submitted
 * requests. Compared case-insensitive against trimmed `OriginChannelResponse.name`.
 */
export const WEB_CHANNEL_NAME = 'sistema web' as const;
