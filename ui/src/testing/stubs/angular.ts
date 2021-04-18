// https://angular.io/guide/testing#activatedroutestub

import { convertToParamMap, ParamMap, Params } from '@angular/router';
import { BehaviorSubject, ReplaySubject } from 'rxjs';

/**
 * An ActivateRoute test double with a `paramMap` observable.
 * Use the `setParamMap()` method to add the next `paramMap` value.
 */
export class ActivatedRouteStub {

    // Use a ReplaySubject to share previous values with subscribers
    // and pump new values into the `paramMap` observable
    private subject = new ReplaySubject<ParamMap>();

    public constructor(initialParams: Params) {
        this.setParamMap(initialParams);
    }

    /** The mock paramMap observable */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public readonly paramMap = this.subject.asObservable();

    /** Set the paramMap observables's next value */
    public setParamMap(params: Params): void {
        this.subject.next(convertToParamMap(params));
    }

}

export class RouterStub {

    public events = new BehaviorSubject<Event>({} as Event);

}
