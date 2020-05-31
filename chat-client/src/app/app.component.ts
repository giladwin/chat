import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from './_services';

@Component({ selector: 'app', templateUrl: 'app.component.html' })
export class AppComponent {
  public token: string;

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService
  ) {
    this.authenticationService.token.subscribe(x => { this.token = x; });
  }

  logout() {
    this.authenticationService.logout();
    this.router.navigate(['/login']);
  }
}
