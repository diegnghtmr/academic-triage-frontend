/**
 * validation-messages — centralized i18n dictionary for Angular form validator errors.
 *
 * Design §D-5: pure module (no Injectable). Import `messageFor` directly.
 * Messages are in Spanish per spec §"Diccionario de mensajes".
 */

/** Type guard: checks that `value` is a plain object with a numeric property `key`. */
function isRecordWithNumber<K extends string>(
  value: unknown,
  key: K,
): value is Record<K, number> {
  return (
    typeof value === 'object' &&
    value !== null &&
    key in value &&
    typeof (value as Record<K, unknown>)[key] === 'number'
  );
}

export const VALIDATION_MESSAGES = {
  required: 'Este campo es requerido',
  email: 'Formato de correo electrónico inválido',
  pattern: 'El formato no es válido',
  integer: 'Debe ser un número entero',
  requiredForRuleType: 'Requerido para este tipo de regla',
} as const;

type ValidationMessagesKey = keyof typeof VALIDATION_MESSAGES;

/**
 * Returns a human-readable Spanish validation message for a given Angular
 * form error key and its associated error value.
 *
 * Hierarchy:
 * 1. `server` key → returns the message verbatim (backend owns the copy).
 * 2. Known keys with dynamic values (`minlength`, `maxlength`, `min`, `max`).
 * 3. Static keys from `VALIDATION_MESSAGES` dictionary.
 * 4. Fallback for unknown keys.
 */
export function messageFor(errorKey: string, errorValue: unknown): string {
  if (errorKey === 'server') {
    return typeof errorValue === 'string' && errorValue.length > 0
      ? errorValue
      : 'Ocurrió un error. Intentá de nuevo.';
  }

  switch (errorKey) {
    case 'minlength': {
      const min = isRecordWithNumber(errorValue, 'requiredLength')
        ? errorValue.requiredLength
        : 0;
      return `Mínimo ${min} caracteres`;
    }
    case 'maxlength': {
      const max = isRecordWithNumber(errorValue, 'requiredLength')
        ? errorValue.requiredLength
        : 0;
      return `Máximo ${max} caracteres`;
    }
    case 'min': {
      const min = isRecordWithNumber(errorValue, 'min') ? errorValue.min : 0;
      return `El valor mínimo es ${min}`;
    }
    case 'max': {
      const max = isRecordWithNumber(errorValue, 'max') ? errorValue.max : 0;
      return `El valor máximo es ${max}`;
    }
    default: {
      if (errorKey in VALIDATION_MESSAGES) {
        return VALIDATION_MESSAGES[errorKey as ValidationMessagesKey];
      }
      return 'Campo inválido';
    }
  }
}
