import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router } from '@angular/router';
import { AuthService } from '../services';

@Injectable()
export class AuthGuard implements CanActivate, CanActivateChild {

    public constructor(
        private auth: AuthService,
        private router: Router,
    ) {}

    public canActivate(): boolean {

        if (!this.auth.getAuth()) {
            void this.router.navigate(['/login']);
            return false;
        }

        return true;
    }

    public canActivateChild(): boolean {
        return this.canActivate();
    }

}

@Injectable()
export class LoginGuard implements CanActivate, CanActivateChild {

    public constructor(
        private auth: AuthService,
        private router: Router,
    ) {}

    public canActivate(): boolean {

        if (!!this.auth.getAuth()) {
            void this.router.navigate(['dashboard']);
            return false;
        }

        return true;
    }

    public canActivateChild(): boolean {
        return this.canActivate();
    }

}
