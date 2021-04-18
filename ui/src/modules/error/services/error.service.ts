import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable()
export class ErrorService {

    public getError$(): Observable<unknown> {
        return of({});
    }

}
