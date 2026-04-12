/**
 * Configuración de entorno para desarrollo local con proxy Angular.
 * 
 * Para desarrollo: usa ruta relativa '/api/v1' + proxy Angular hacia localhost:8080
 * Para producción: ajustar según el entorno de deployment
 * 
 * Proxy configurado en: docs/migration/angular-proxy.conf.example.json
 */
export const environment = {
  apiBaseUrl: '/api/v1',
} as const;

export function getApiBaseUrl(): string {
  return environment.apiBaseUrl;
}
