/**
 * Configuración de entorno para desarrollo local con proxy Angular.
 *
 * Para desarrollo: usa ruta relativa '/api/v1' + proxy Angular hacia localhost:8080
 * Para producción: ajustar según el entorno de deployment
 *
 * Proxy configurado en: docs/migration/angular-proxy.conf.example.json
 * Los archivos de entorno se intercambian en producción via angular.json fileReplacements.
 */
import { environment } from '../../../environments/environment';

export type Environment = typeof environment;

export { environment };

export function getApiBaseUrl(): string {
  return environment.apiBaseUrl;
}
