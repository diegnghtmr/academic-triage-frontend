/**
 * Canonical RequestTypeResponse shared across features.
 * Single source of truth — features re-export from here.
 */

export interface RequestTypeResponse {
  id?: number;
  name?: string;
  description?: string;
  active?: boolean;
}
