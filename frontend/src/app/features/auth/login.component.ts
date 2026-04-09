import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="card">
      <h1>Connexion</h1>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <input placeholder="Email" type="email" formControlName="email" />
        <input placeholder="Mot de passe" type="password" formControlName="password" />
        <button type="submit">Se connecter</button>
      </form>
      @if (error()) {
      <p class="error">{{ error() }}</p>
      }
      <p>Pas de compte ? <a routerLink="/auth/register">Créer un compte</a></p>
    </section>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit() {
    if (this.form.invalid) return;

    this.authService.login(this.form.getRawValue() as { email: string; password: string }).subscribe({
      next: () => this.router.navigateByUrl('/home'),
      error: () => this.error.set('Impossible de se connecter.'),
    });
  }
}
