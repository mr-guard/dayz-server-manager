import { SBRouteData } from '@modules/navigation/models';
import { NavigationService } from '@modules/navigation/services';
import { of } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const NavigationServiceStub: Partial<NavigationService> = {
    sideNavVisible$: () => of(true),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    toggleSideNav: (visibility?: boolean) => ({ }),
    routeData$: () => of({} as SBRouteData),
    currentURL$: () => of('TEST_URL'),
};
