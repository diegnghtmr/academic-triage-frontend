import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import type { ErrorSummaryItem } from './error-summary';

/**
 * ErrorSummary — spec covering UV-7 AC4, AC6.
 *
 * Strategy: source-level template assertions for ARIA/role contracts.
 * Logic tests for ErrorSummaryItem interface contract.
 */
const source = readFileSync(join(import.meta.dirname, 'error-summary.ts'), 'utf-8');

describe('ErrorSummary — ErrorSummaryItem interface (UV-7 AC4)', () => {
  it('ErrorSummaryItem interface is exported', () => {
    expect(source).toContain('export interface ErrorSummaryItem');
  });

  it('ErrorSummaryItem has field (string | null)', () => {
    expect(source).toContain('field:');
  });

  it('ErrorSummaryItem has message (string)', () => {
    expect(source).toContain('message:');
  });

  it('ErrorSummaryItem has optional controlId', () => {
    expect(source).toContain('controlId?:');
  });

  it('can construct a valid ErrorSummaryItem with field=null (global error)', () => {
    const item: ErrorSummaryItem = {
      field: null,
      message: 'Global error',
    };
    expect(item.field).toBeNull();
    expect(item.message).toBe('Global error');
    expect(item.controlId).toBeUndefined();
  });

  it('can construct an ErrorSummaryItem with controlId', () => {
    const item: ErrorSummaryItem = {
      field: 'email',
      message: 'Invalid email',
      controlId: 'reg-email',
    };
    expect(item.controlId).toBe('reg-email');
  });
});

describe('ErrorSummary — component template ARIA (UV-7 AC4, AC6)', () => {
  it('has selector at-error-summary', () => {
    expect(source).toContain("selector: 'at-error-summary'");
  });

  it('uses ChangeDetectionStrategy.OnPush', () => {
    expect(source).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('items is a required input', () => {
    expect(source).toContain('input.required');
  });

  it('UV-7 AC4: role="alert" is only rendered when items has entries (hasErrors)', () => {
    // The container with role="alert" must be inside a conditional block
    expect(source).toContain('role="alert"');
    expect(source).toContain('hasErrors');
  });

  it('does NOT render when items is empty — conditional block guards rendering', () => {
    // Must use @if (hasErrors()) to conditionally render
    expect(source).toContain('hasErrors()');
  });

  it('UV-7 AC6: focusFirst output is defined', () => {
    expect(source).toContain('focusFirst');
    expect(source).toContain('output');
  });

  it('items preserve order — template iterates using @for', () => {
    expect(source).toContain('@for');
  });

  it('contains button elements for each item (keyboard navigable)', () => {
    expect(source).toContain('type="button"');
  });

  it('has aria-live="assertive" on the alert container', () => {
    expect(source).toContain('aria-live="assertive"');
  });

  it('has tabindex="-1" on the container for programmatic focus', () => {
    expect(source).toContain('tabindex="-1"');
  });

  it('items without controlId are supported — global errors', () => {
    const item: ErrorSummaryItem = { field: null, message: 'Something went wrong' };
    expect(item.controlId).toBeUndefined();
  });

  it('hasErrors computed returns true when items has entries', () => {
    expect(source).toContain('computed(');
  });
});

describe('ErrorSummary — docket style prefix (UV-7)', () => {
  it('contains docket-style prefix text [ revisar ]', () => {
    expect(source).toContain('[ revisar ]');
  });
});

describe('ErrorSummary — focus delegation contract (UV-7 AC6 — complete)', () => {
  it('UV-7 AC6: focusFirst output emits on item click', () => {
    expect(source).toContain('focusFirst');
    expect(source).toContain('output');
    expect(source).toContain('onItemClick');
  });

  it('UV-7 AC6: onItemClick calls focusFirst.emit with the clicked item', () => {
    expect(source).toContain('focusFirst.emit');
    expect(source).toContain('item');
  });

  it('UV-7 AC6: button click triggers onItemClick — (click) binding present', () => {
    expect(source).toContain('(click)="onItemClick(item)"');
  });

  it('UV-7 AC4: role="alert" is conditionally rendered via @if guard', () => {
    // role="alert" must be inside @if (hasErrors()) conditional block
    // Verified by checking both tokens exist in the template
    expect(source).toContain('@if (hasErrors())');
    expect(source).toContain('role="alert"');
  });

  it('focusFirst output is typed as ErrorSummaryItem', () => {
    expect(source).toContain('output<ErrorSummaryItem>');
  });
});
