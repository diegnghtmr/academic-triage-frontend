import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'at-public-home',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h2>Inicio público</h2>
      <p>{{ message() }}</p>
      <nav>
        <a routerLink="/auth/login">Iniciar sesión</a>
        |
        <a routerLink="/auth/register">Registro</a>
        |
        <a routerLink="/app">Área autenticada</a>
      </nav>
    </section>
  `,
})
export class PublicHome {
  protected readonly message = signal(
    'Desde aquí puedes iniciar sesión, crear tu cuenta o continuar si ya tienes acceso.',
  );
}
