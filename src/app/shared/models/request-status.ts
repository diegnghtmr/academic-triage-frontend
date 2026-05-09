export type RequestStatusEnum =
  | 'REGISTERED'
  | 'CLASSIFIED'
  | 'IN_PROGRESS'
  | 'ATTENDED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'REJECTED';

export const STATUS_LABEL_MAP: Record<RequestStatusEnum, string> = {
  REGISTERED:  'Registrada',
  CLASSIFIED:  'Clasificada',
  IN_PROGRESS: 'En progreso',
  ATTENDED:    'Atendida',
  CLOSED:      'Cerrada',
  CANCELLED:   'Cancelada',
  REJECTED:    'Rechazada',
};
