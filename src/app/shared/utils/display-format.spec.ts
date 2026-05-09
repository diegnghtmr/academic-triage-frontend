import { describe, expect, it } from 'vitest';

import {
  formatDateTimeLabel,
  formatDisplayLabel,
  formatDurationHours,
  formatUsernameLabel,
} from './display-format';

describe('display-format', () => {
  it('translates request statuses, priorities, roles and history actions to Spanish', () => {
    expect(formatDisplayLabel('IN_PROGRESS', 'requestStatus')).toBe('En proceso');
    expect(formatDisplayLabel('HIGH', 'priority')).toBe('Alta');
    expect(formatDisplayLabel('ADMIN', 'role')).toBe('Administrador');
    expect(formatDisplayLabel('INTERNAL_NOTE', 'historyAction')).toBe('Nota interna');
  });

  it('keeps unknown values instead of hiding backend data', () => {
    expect(formatDisplayLabel('CUSTOM_VALUE', 'priority')).toBe('CUSTOM_VALUE');
  });

  it('formats timestamps to a friendly Spanish date-time label', () => {
    expect(formatDateTimeLabel('2026-04-13T00:29:06')).toMatch(/13\/04\/26/);
  });

  it('formats tiny resolution times without showing misleading 0.0 hours', () => {
    expect(formatDurationHours(0.00018519)).toBe('< 1 min');
    expect(formatDurationHours(0.5)).toBe('30 min');
    expect(formatDurationHours(1.25)).toBe('1,3 horas');
  });

  it('formats usernames replacing underscores with spaces', () => {
    expect(formatUsernameLabel('staff_registro')).toBe('staff registro');
  });
});
