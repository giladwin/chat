import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {environment} from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private tokenSubject: BehaviorSubject<string>;
  public token: Observable<string>;

  constructor(private http: HttpClient) {
    this.tokenSubject = new BehaviorSubject<string>(localStorage.getItem('token'));
    this.token = this.tokenSubject.asObservable();
  }

  public get tokenValue(): string {
    return this.tokenSubject.value;
  }

  login( password: string, email: string) {
    return this.http.post<any>(`${environment.SERVER_URL}/signin`, {  password, email})
      .pipe(map(response => {
        localStorage.setItem('token', response.token);
        this.tokenSubject.next(response.token);
        return response;
      }));
  }

  register(username: string, password: string, email: string) {
    return this.http.post<any>(`${environment.SERVER_URL}/signup`, { username, password, email})
      .pipe(map(response => {
        localStorage.setItem('token', response.token);
        this.tokenSubject.next(response.token);
        return response;
      }));
  }

  logout() {
    localStorage.removeItem('token');
    this.tokenSubject.next(null);
  }
}
