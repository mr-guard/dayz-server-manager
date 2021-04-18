import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable()
export class AppCommonGuard implements CanActivate {

    public canActivate(): Observable<boolean> {
        return of(true);
    }

}
