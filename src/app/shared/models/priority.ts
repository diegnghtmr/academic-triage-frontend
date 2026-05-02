/**
 * Canonical PriorityEnum shared across features.
 * Single source of truth — features re-export from here.
 */

export const PRIORITY = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type PriorityEnum = (typeof PRIORITY)[keyof typeof PRIORITY];

export const PRIORITY_OPTIONS: readonly PriorityEnum[] = ['HIGH', 'MEDIUM', 'LOW'];
