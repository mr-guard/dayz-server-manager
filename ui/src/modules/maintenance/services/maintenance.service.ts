import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';


@Injectable({ providedIn: 'root' })
export class MaintenanceService {

    public constructor(
        private httpClient: HttpClient,
        private auth: AuthService,
    ) {
    }

    public execute(action: string, body?: any): Promise<boolean> {
        return this.httpClient.post<any>(
            `/api/${action}`,
            body,
            {
                headers: this.auth.getAuthHeaders(),
                observe: 'response',
                withCredentials: true,
            },
        ).pipe(
            map((x: HttpResponse<any>) => {
                return !!x?.ok;
            }),
            catchError(() => of(false)),
        ).toPromise();
    }

    public async updateServer(validate?: boolean): Promise<boolean> {
        return this.execute('updateserver', { validate });
    }

    public async updateMods(validate?: boolean, force?: boolean): Promise<boolean> {
        return this.execute('updatemods', { validate, force });
    }

    public async createBackup(): Promise<boolean> {
        return this.execute('backup');
    }

    public async lockServer(): Promise<boolean> {
        return this.execute('lock');
    }

    public async unlockServer(): Promise<boolean> {
        return this.execute('unlock');
    }

    public async lockRestarts(): Promise<boolean> {
        return this.execute('lockrestart');
    }

    public async unlockRestarts(): Promise<boolean> {
        return this.execute('updateserver');
    }

    public async restartServer(force?: boolean): Promise<boolean> {
        return this.execute('restart', { force });
    }


}
