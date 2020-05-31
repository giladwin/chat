import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { AuthenticationService } from '@app/_services';

@Component({ templateUrl: 'login.component.html' })
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  registerForm: FormGroup;
  loginLoading = false;
  registerLoading = false;
  loginSubmitted = false;
  registerSubmitted = false;
  returnUrl: string;
  loginError = '';
  registerError = '';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService
  ) {
    if (this.authenticationService.token) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      password: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
    this.returnUrl = this.route.snapshot.queryParams.returnUrl || '/';
  }

  get loginControls() { return this.loginForm.controls; }

  get registerControls() { return this.registerForm.controls; }

  loginButton() {
    this.loginSubmitted = true;

    if (this.loginForm.invalid) {
      return;
    }

    this.loginLoading = true;
    this.authenticationService.login(this.loginControls.password.value, this.loginControls.email.value)
      .subscribe(
        data => {
          this.router.navigate([this.returnUrl]);
        },
        error => {
          this.loginError = error;
          this.loginLoading = false;
        });
  }

  registerButton() {
    this.registerSubmitted = true;

    if (this.registerForm.invalid) {
      return;
    }

    this.loginLoading = true;
    this.authenticationService.register(
      this.registerControls.username.value,
      this.registerControls.password.value,
      this.registerControls.email.value
    ).pipe(first()).subscribe(data => {
        this.router.navigate([this.returnUrl]);
      },
      error => {
        this.registerError = error;
        this.registerLoading = false;
      });
  }
}
