import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="card">
      <h1>Inscription</h1>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <input placeholder="Pseudo" formControlName="pseudo" />
        <input placeholder="Email" type="email" formControlName="email" />
        <input placeholder="Mot de passe" type="password" formControlName="password" />
        <button type="submit">Créer mon compte</button>
      </form>
      @if (error()) {
      <p class="error">{{ error() }}</p>
      }
      <p>Déjà inscrit ? <a routerLink="/auth/login">Se connecter</a></p>
    </section>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    pseudo: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit() {
    if (this.form.invalid) return;

    this.authService
      .register(this.form.getRawValue() as { email: string; pseudo: string; password: string })
      .subscribe({
        next: () => this.router.navigateByUrl('/home'),
        error: () => this.error.set('Impossible de créer le compte.'),
      });
  }
}
