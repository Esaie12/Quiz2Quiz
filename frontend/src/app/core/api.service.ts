import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = (import.meta as ImportMeta & { env?: { NG_APP_API_URL?: string } }).env
    ?.NG_APP_API_URL ?? 'http://localhost:3000/api';

  get<T>(path: string) {
    return this.http.get<T>(`${this.baseUrl}${path}`, {
      headers: this.authHeaders(),
      withCredentials: true,
    });
  }

  post<T>(path: string, body: unknown, extraHeaders: Record<string, string> = {}) {
    return this.http.post<T>(`${this.baseUrl}${path}`, body, {
      headers: this.authHeaders(extraHeaders),
      withCredentials: true,
    });
  }

  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body, {
      headers: this.authHeaders(),
      withCredentials: true,
    });
  }

  private authHeaders(extraHeaders: Record<string, string> = {}) {
    const token = localStorage.getItem('accessToken');
    let headers = new HttpHeaders(extraHeaders);
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
}
