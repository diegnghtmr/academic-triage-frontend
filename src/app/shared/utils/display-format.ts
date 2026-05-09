const REQUEST_STATUS_LABELS = {
  REGISTERED: 'Registrada',
  CLASSIFIED: 'Clasificada',
  IN_PROGRESS: 'En proceso',
  ATTENDED: 'Atendida',
  CLOSED: 'Cerrada',
  CANCELLED: 'Cancelada',
  REJECTED: 'Rechazada',
} as const;

const PRIORITY_LABELS = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
} as const;

const ROLE_LABELS = {
  ADMIN: 'Administrador',
  STAFF: 'Staff',
  STUDENT: 'Estudiante',
} as const;

const HISTORY_ACTION_LABELS = {
  REGISTERED: 'Registrada',
  CLASSIFIED: 'Clasificada',
  PRIORITIZED: 'Priorizada',
  ASSIGNED: 'Asignada',
  ATTENDED: 'Atendida',
  CLOSED: 'Cerrada',
  CANCELLED: 'Cancelada',
  REJECTED: 'Rechazada',
  INTERNAL_NOTE: 'Nota interna',
} as const;

export type DisplayLabelKind = 'requestStatus' | 'priority' | 'role' | 'historyAction';

function mapFor(kind: DisplayLabelKind): Record<string, string> {
  switch (kind) {
    case 'requestStatus':
      return REQUEST_STATUS_LABELS;
    case 'priority':
      return PRIORITY_LABELS;
    case 'role':
      return ROLE_LABELS;
    case 'historyAction':
      return HISTORY_ACTION_LABELS;
  }
}

export function formatDisplayLabel(
  value: string | null | undefined,
  kind: DisplayLabelKind,
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return mapFor(kind)[value] ?? value;
}

export function formatDateTimeLabel(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: false,
  }).format(date);
}

export function formatDurationHours(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  if (value <= 0) {
    return '0 min';
  }

  const minutes = value * 60;
  if (minutes < 1) {
    return '< 1 min';
  }

  if (minutes < 60) {
    const roundedMinutes = Math.round(minutes);
    return `${roundedMinutes} min`;
  }

  if (value < 24) {
    const decimals = value < 10 ? 1 : 0;
    const hoursText = value.toLocaleString('es-CO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const unit = Math.abs(value - 1) < Number.EPSILON ? 'hora' : 'horas';
    return `${hoursText} ${unit}`;
  }

  const days = value / 24;
  const daysText = days.toLocaleString('es-CO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${daysText} días`;
}

export function formatUsernameLabel(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return value.replaceAll('_', ' ');
}
