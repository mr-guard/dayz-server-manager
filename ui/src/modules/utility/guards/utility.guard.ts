import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';

@Injectable()
export class UtilityGuard  {

    public canActivate(): Observable<boolean> {
        return of(true);
    }

}
