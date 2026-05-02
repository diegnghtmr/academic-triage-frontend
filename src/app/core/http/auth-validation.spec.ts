import { describe, expect, it } from 'vitest';

import { isRoleEnum, parseStoredUser } from './auth-validation';

// ---------------------------------------------------------------------------
// isRoleEnum
// ---------------------------------------------------------------------------

describe('isRoleEnum', () => {
  it('accepts ADMIN', () => {
    expect(isRoleEnum('ADMIN')).toBe(true);
  });

  it('accepts STAFF', () => {
    expect(isRoleEnum('STAFF')).toBe(true);
  });

  it('accepts STUDENT', () => {
    expect(isRoleEnum('STUDENT')).toBe(true);
  });

  it('rejects an unknown role string', () => {
    expect(isRoleEnum('ROOT')).toBe(false);
  });

  it('rejects a number', () => {
    expect(isRoleEnum(1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseStoredUser — happy path
// ---------------------------------------------------------------------------

describe('parseStoredUser — happy path', () => {
  it('returns a StoredSession for a minimal valid payload (token + id + username)', () => {
    const result = parseStoredUser({
      token: 'jwt-token',
      user: { id: 1, username: 'alice' },
    });
    expect(result).not.toBeNull();
    expect(result?.token).toBe('jwt-token');
    expect(result?.user.id).toBe(1);
    expect(result?.user.username).toBe('alice');
  });

  it('returns a StoredSession for a full payload with role ADMIN', () => {
    const result = parseStoredUser({
      token: 'tok',
      user: { id: 2, username: 'bob', role: 'ADMIN', email: 'b@b.com' },
    });
    expect(result).not.toBeNull();
    expect(result?.user.role).toBe('ADMIN');
  });

  it('returns a StoredSession for a full payload with role STAFF', () => {
    const result = parseStoredUser({
      token: 'tok',
      user: { id: 3, username: 'carol', role: 'STAFF' },
    });
    expect(result).not.toBeNull();
    expect(result?.user.role).toBe('STAFF');
  });

  it('returns a StoredSession for a full payload with role STUDENT', () => {
    const result = parseStoredUser({
      token: 'tok',
      user: { id: 4, username: 'dave', role: 'STUDENT' },
    });
    expect(result).not.toBeNull();
    expect(result?.user.role).toBe('STUDENT');
  });
});

// ---------------------------------------------------------------------------
// parseStoredUser — adversarial inputs (all must return null)
// ---------------------------------------------------------------------------

describe('parseStoredUser — adversarial inputs', () => {
  it('returns null when raw is not an object (number)', () => {
    expect(parseStoredUser(42)).toBeNull();
  });

  it('returns null when raw is null', () => {
    expect(parseStoredUser(null)).toBeNull();
  });

  it('returns null when raw is an array', () => {
    expect(parseStoredUser([])).toBeNull();
  });

  it('returns null when token is missing', () => {
    expect(parseStoredUser({ user: { id: 1, username: 'alice' } })).toBeNull();
  });

  it('returns null when token is an empty string', () => {
    expect(
      parseStoredUser({ token: '', user: { id: 1, username: 'alice' } }),
    ).toBeNull();
  });

  it('returns null when token is a number instead of string', () => {
    expect(
      parseStoredUser({ token: 99, user: { id: 1, username: 'alice' } }),
    ).toBeNull();
  });

  it('returns null when user field is missing', () => {
    expect(parseStoredUser({ token: 'tok' })).toBeNull();
  });

  it('returns null when user.id is not a number', () => {
    expect(
      parseStoredUser({ token: 'tok', user: { id: 'nope', username: 'alice' } }),
    ).toBeNull();
  });

  it('returns null when user.id is NaN', () => {
    expect(
      parseStoredUser({ token: 'tok', user: { id: NaN, username: 'alice' } }),
    ).toBeNull();
  });

  it('returns null when user.username is missing', () => {
    expect(parseStoredUser({ token: 'tok', user: { id: 1 } })).toBeNull();
  });

  it('returns null when user.username is an empty string', () => {
    expect(
      parseStoredUser({ token: 'tok', user: { id: 1, username: '' } }),
    ).toBeNull();
  });

  it('returns null when user.role is present but not in RoleEnum (ROOT)', () => {
    expect(
      parseStoredUser({
        token: 'tok',
        user: { id: 1, username: 'alice', role: 'ROOT' },
      }),
    ).toBeNull();
  });

  it('returns null when user.role is present but not in RoleEnum (SUPERADMIN)', () => {
    expect(
      parseStoredUser({
        token: 'tok',
        user: { id: 1, username: 'alice', role: 'SUPERADMIN' },
      }),
    ).toBeNull();
  });
});
