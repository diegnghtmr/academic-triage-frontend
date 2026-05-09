/**
 * Environment configuration for local development with the Angular proxy.
 *
 * Development: uses relative path '/api/v1' + Angular proxy to localhost:8080
 * Production: adjust according to the deployment environment
 *
 * Proxy configured in: docs/migration/angular-proxy.conf.example.json
 * Environment files are swapped in production via angular.json fileReplacements.
 */
import { environment } from '../../../environments/environment';

export type Environment = typeof environment;

export { environment };

export function getApiBaseUrl(): string {
  return environment.apiBaseUrl;
}
