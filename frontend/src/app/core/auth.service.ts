import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';

interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    pseudo: string;
    email: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly me = signal<AuthResponse['user'] | null>(null);

  login(payload: { email: string; password: string }) {
    return this.api.post<AuthResponse>('/auth/login', payload).pipe(
      tap((res) => {
        localStorage.setItem('accessToken', res.accessToken);
        this.me.set(res.user);
      }),
    );
  }

  register(payload: { email: string; pseudo: string; password: string }) {
    return this.api.post<AuthResponse>('/auth/register', payload).pipe(
      tap((res) => {
        localStorage.setItem('accessToken', res.accessToken);
        this.me.set(res.user);
      }),
    );
  }

  fetchProfile() {
    return this.api.get<AuthResponse['user']>('/users/me').pipe(tap((user) => this.me.set(user)));
  }

  logout() {
    const token = localStorage.getItem('accessToken') ?? '';
    this.api.post('/auth/logout', {}, { Authorization: `Bearer ${token}` }).subscribe({
      complete: () => {
        localStorage.removeItem('accessToken');
        this.me.set(null);
        this.router.navigateByUrl('/auth/login');
      },
    });
  }

  isAuthenticated() {
    return Boolean(localStorage.getItem('accessToken'));
  }
}
