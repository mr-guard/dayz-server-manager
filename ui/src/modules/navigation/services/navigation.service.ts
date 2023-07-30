import { Injectable } from '@angular/core';
import { ActivatedRoute, ChildActivationEnd, Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { SBRouteData } from '../models';

@Injectable({
    providedIn: 'root',
})
export class NavigationService {

    // eslint-disable-next-line @typescript-eslint/naming-convention
    public _sideNavVisible$ = new BehaviorSubject(true);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public _routeData$ = new BehaviorSubject({} as SBRouteData);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public _currentURL$ = new BehaviorSubject('');

    public constructor(public route: ActivatedRoute, public router: Router) {
        this.router.events
            .pipe(filter((event) => event instanceof ChildActivationEnd))
            .subscribe((event) => {
                // eslint-disable-next-line prefer-destructuring
                let snapshot = (event as ChildActivationEnd).snapshot;
                while (snapshot.firstChild !== null) {
                    snapshot = snapshot.firstChild;
                }
                this._routeData$.next(snapshot.data as SBRouteData);
                this._currentURL$.next(router.url);
            });
    }

    public sideNavVisible$(): Observable<boolean> {
        return this._sideNavVisible$;
    }

    public toggleSideNav(visibility?: boolean): void {
        if (typeof visibility === 'undefined') {
            this._sideNavVisible$.next(!this._sideNavVisible$.value);
        } else {
            this._sideNavVisible$.next(visibility);
        }
    }

    public routeData$(): Observable<SBRouteData> {
        return this._routeData$;
    }

    public currentURL$(): Observable<string> {
        return this._currentURL$;
    }

}
