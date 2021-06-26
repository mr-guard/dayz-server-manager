import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { UserLevel } from '@common/models';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

    private static readonly AUTH_STORAGE_KEY = 'server-manager-auth';
    private static readonly LEVEL_STORAGE_KEY = 'server-manager-level';

    private authHeader: string | null = null;
    private level: UserLevel | null = null;

    public constructor(
        private httpClient: HttpClient,
        private router: Router,
    ) {
        // eslint-disable-next-line no-undef
        this.authHeader = localStorage.getItem(AuthService.AUTH_STORAGE_KEY);
        // eslint-disable-next-line no-undef
        this.level = localStorage.getItem(AuthService.LEVEL_STORAGE_KEY) as UserLevel;

        if (this.authHeader) {
            this.validateLogin(this.authHeader).then(
                () => {
                    console.log('Login validated');
                    if (this.router.url.includes('login')) {
                        void this.router.navigate(['/dashboard']);
                    }
                },
                (err) => {
                    console.error('Login invalidated', err);
                    void this.logout();
                },
            );
        }
    }

    public getAuth(): string | null {
        return this.authHeader;
    }

    public getLevel(): UserLevel | null {
        return this.level;
    }

    public async login(user: string, password: string, remember?: boolean): Promise<void> {
        // eslint-disable-next-line no-undef
        const auth = `Basic ${btoa(`${user}:${password}`)}`;
        await this.validateLogin(auth, remember);
    }

    private async validateLogin(auth: string, remember?: boolean): Promise<void> {
        const resp = await this.httpClient.post(
            `${environment.host}/api/login`,
            null,
            {
                headers: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    Authorization: auth,
                },
                observe: 'response',
                responseType: 'text',
            },
        ).toPromise();

        if (!resp.ok) {
            throw new Error('Login failed');
        }

        this.authHeader = auth;
        this.level = resp.body as UserLevel;
        if (remember) {
            // eslint-disable-next-line no-undef
            localStorage.setItem(AuthService.AUTH_STORAGE_KEY, auth);
            // eslint-disable-next-line no-undef
            localStorage.setItem(AuthService.LEVEL_STORAGE_KEY, this.level);
        }
    }

    public async logout(): Promise<void> {
        this.authHeader = null;
        this.level = null;
        // eslint-disable-next-line no-undef
        localStorage.removeItem(AuthService.AUTH_STORAGE_KEY);
        // eslint-disable-next-line no-undef
        localStorage.removeItem(AuthService.LEVEL_STORAGE_KEY);
        void this.router.navigate(['/login']);
    }

    public getAuthHeaders(): { [k: string]: string } {
        return {
            // eslint-disable-next-line @typescript-eslint/naming-convention,no-undef
            Authorization: this.authHeader!,
        };
    }

}
