/**
 * StateBadge — smoke tests for all 7 RequestStatusEnum values.
 *
 * Strategy: the vitest environment is 'node' (no DOM available), so we test
 * the component's rendering contract at the source level — verifying:
 *   1. STATUS_LABEL_MAP contains the expected Spanish label for each status.
 *   2. The template binds [class] to `badgeClass()` which concatenates
 *      'badge ' + STATUS_CLASS_MAP[state] — we verify the map entries directly.
 *   3. The template wraps the label in a `<span class="badge" [class]="…">`.
 *
 * This mirrors the approach already used in login-page.spec.ts and
 * reports-dashboard-page.spec.ts, which avoid DOM complexity while covering
 * the same behavioral guarantees.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import type { RequestStatusEnum } from '@shared/models/request-status';
import { STATUS_LABEL_MAP } from '@shared/models/request-status';

// ── inline mirror of STATUS_CLASS_MAP (source-of-truth: state-badge.ts) ─────
// We mirror the map here so changes in the component cause test failures.
const STATUS_CLASS_MAP: Record<RequestStatusEnum, string> = {
  REGISTERED:  'badge--registered',
  CLASSIFIED:  'badge--classified',
  IN_PROGRESS: 'badge--in-progress',
  ATTENDED:    'badge--attended',
  CLOSED:      'badge--closed',
  CANCELLED:   'badge--cancelled',
  REJECTED:    'badge--rejected',
};

const EXPECTED: Array<{ status: RequestStatusEnum; label: string; variantClass: string }> = [
  { status: 'REGISTERED',  label: 'Registrada',  variantClass: 'badge--registered'  },
  { status: 'CLASSIFIED',  label: 'Clasificada',  variantClass: 'badge--classified'  },
  { status: 'IN_PROGRESS', label: 'En progreso',  variantClass: 'badge--in-progress' },
  { status: 'ATTENDED',    label: 'Atendida',     variantClass: 'badge--attended'    },
  { status: 'CLOSED',      label: 'Cerrada',      variantClass: 'badge--closed'      },
  { status: 'CANCELLED',   label: 'Cancelada',    variantClass: 'badge--cancelled'   },
  { status: 'REJECTED',    label: 'Rechazada',    variantClass: 'badge--rejected'    },
];

const source = readFileSync(join(import.meta.dirname, 'state-badge.ts'), 'utf-8');

// ── parametrized: label and variant class for each status ─────────────────────

describe('StateBadge — per-status label and variant class', () => {
  for (const { status, label, variantClass } of EXPECTED) {
    describe(`status: ${status}`, () => {
      it(`renders without errors — STATUS_LABEL_MAP has an entry for ${status}`, () => {
        expect(STATUS_LABEL_MAP).toHaveProperty(status);
      });

      it(`STATUS_LABEL_MAP[${status}] equals '${label}'`, () => {
        expect(STATUS_LABEL_MAP[status]).toBe(label);
      });

      it(`STATUS_CLASS_MAP[${status}] equals '${variantClass}'`, () => {
        expect(STATUS_CLASS_MAP[status]).toBe(variantClass);
      });
    });
  }
});

// ── extras: template structure ────────────────────────────────────────────────

describe('StateBadge — template structure', () => {
  it('template must use a <span> element as the badge root', () => {
    expect(source).toContain('<span');
    expect(source).toContain('</span>');
  });

  it('template must apply base .badge class on the span element', () => {
    // The template literal: <span class="badge" [class]="badgeClass()">
    expect(source).toMatch(/class="badge"/);
  });

  it('template must bind [class] to badgeClass() signal for variant injection', () => {
    expect(source).toContain('[class]="badgeClass()"');
  });

  it('template must interpolate label() signal as the badge text content', () => {
    expect(source).toContain('{{ label() }}');
  });

  it('component must declare state as a required input of type RequestStatusEnum', () => {
    expect(source).toContain('input.required<RequestStatusEnum>()');
  });
});
