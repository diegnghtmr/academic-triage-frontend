import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'at-public-home',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="home-wrap">
      <header class="home-header">
        <h1 class="home-header__title">Academic Triage</h1>
        <p class="home-header__sub">{{ message() }}</p>
      </header>
      <nav class="home-nav" aria-label="Acciones principales">
        <a class="btn btn--primary" routerLink="/auth/login">Iniciar sesión</a>
        <a class="btn" routerLink="/auth/register">Registro</a>
        <a class="btn btn--ghost" routerLink="/app">Área autenticada</a>
      </nav>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--at-bg);
    }
    .home-wrap {
      max-width: 480px;
      width: 100%;
      padding: var(--at-s6);
      text-align: center;
    }
    .home-header__title {
      font-size: var(--at-fs-2xl);
      font-weight: 800;
      letter-spacing: var(--at-tracking-tight);
      color: var(--at-mercury);
      margin-bottom: var(--at-s3);
    }
    .home-header__sub {
      color: var(--at-text-muted);
      font-size: var(--at-fs-base);
      margin-bottom: var(--at-s5);
      line-height: 1.6;
    }
    .home-nav {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--at-s2);
    }
  `,
})
export class PublicHome {
  protected readonly message = signal(
    'Desde aquí puedes iniciar sesión, crear tu cuenta o continuar si ya tienes acceso.',
  );
}
