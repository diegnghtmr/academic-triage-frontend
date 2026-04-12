import { describe, expect, it } from 'vitest';

import {
  canShowAddHistoryNote,
  canShowAssign,
  canShowAttend,
  canShowCancel,
  canShowClassify,
  canShowClose,
  canShowPrioritize,
  canShowReject,
  isTerminalStatus,
} from './request-action-visibility';

describe('request-action-visibility', () => {
  it('marks CLOSED, CANCELLED and REJECTED as terminal statuses', () => {
    expect(isTerminalStatus('CLOSED')).toBe(true);
    expect(isTerminalStatus('CANCELLED')).toBe(true);
    expect(isTerminalStatus('REJECTED')).toBe(true);
    expect(isTerminalStatus('REGISTERED')).toBe(false);
  });

  it('shows classify only for STAFF in REGISTERED', () => {
    expect(canShowClassify('STAFF', 'REGISTERED')).toBe(true);
    expect(canShowClassify('ADMIN', 'REGISTERED')).toBe(false);
    expect(canShowClassify('STAFF', 'CLASSIFIED')).toBe(false);
  });

  it('shows prioritize only when STAFF + CLASSIFIED + no priority', () => {
    expect(canShowPrioritize('STAFF', 'CLASSIFIED', null)).toBe(true);
    expect(canShowPrioritize('STAFF', 'CLASSIFIED', 'HIGH')).toBe(false);
    expect(canShowPrioritize('ADMIN', 'CLASSIFIED', null)).toBe(false);
  });

  it('shows assign only when STAFF + CLASSIFIED + priority defined', () => {
    expect(canShowAssign('STAFF', 'CLASSIFIED', 'MEDIUM')).toBe(true);
    expect(canShowAssign('STAFF', 'CLASSIFIED', undefined)).toBe(false);
    expect(canShowAssign('ADMIN', 'CLASSIFIED', 'MEDIUM')).toBe(false);
  });

  it('shows cancel for ADMIN/STAFF and for STUDENT owner in allowed states', () => {
    expect(canShowCancel('ADMIN', 'REGISTERED', 10, 22)).toBe(true);
    expect(canShowCancel('STAFF', 'CLASSIFIED', 10, 22)).toBe(true);
    expect(canShowCancel('STUDENT', 'REGISTERED', 10, 10)).toBe(true);
    expect(canShowCancel('STUDENT', 'REGISTERED', 10, 22)).toBe(false);
    expect(canShowCancel('STUDENT', 'IN_PROGRESS', 10, 10)).toBe(false);
  });

  it('shows reject only for ADMIN in REGISTERED', () => {
    expect(canShowReject('ADMIN', 'REGISTERED')).toBe(true);
    expect(canShowReject('ADMIN', 'CLASSIFIED')).toBe(false);
    expect(canShowReject('STAFF', 'REGISTERED')).toBe(false);
  });

  it('shows attend only for STAFF in IN_PROGRESS', () => {
    expect(canShowAttend('STAFF', 'IN_PROGRESS')).toBe(true);
    expect(canShowAttend('ADMIN', 'IN_PROGRESS')).toBe(false);
    expect(canShowAttend('STUDENT', 'IN_PROGRESS')).toBe(false);
    expect(canShowAttend('STAFF', 'REGISTERED')).toBe(false);
    expect(canShowAttend('STAFF', 'ATTENDED')).toBe(false);
  });

  it('shows close only for STAFF in ATTENDED', () => {
    expect(canShowClose('STAFF', 'ATTENDED')).toBe(true);
    expect(canShowClose('ADMIN', 'ATTENDED')).toBe(false);
    expect(canShowClose('STUDENT', 'ATTENDED')).toBe(false);
    expect(canShowClose('STAFF', 'IN_PROGRESS')).toBe(false);
    expect(canShowClose('STAFF', 'REGISTERED')).toBe(false);
  });

  it('shows add-history-note only for STAFF', () => {
    expect(canShowAddHistoryNote('STAFF')).toBe(true);
    expect(canShowAddHistoryNote('ADMIN')).toBe(false);
    expect(canShowAddHistoryNote('STUDENT')).toBe(false);
  });
});
