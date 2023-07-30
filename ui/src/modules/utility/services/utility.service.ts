import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class UtilityService {

    public constructor(private http: HttpClient) {}

    public get version$(): Observable<string> {
        return this.http.get('/assets/version', { responseType: 'text' });
    }

}
