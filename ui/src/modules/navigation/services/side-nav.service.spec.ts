import { TestBed } from '@angular/core/testing';

import { SideNavService } from './side-nav.service';

describe('SideNavService', () => {
    let sideNavService: SideNavService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [SideNavService],
        });
        sideNavService = TestBed.inject(SideNavService);
    });

    describe('isExpanded', () => {
        it('should return false if hash of side nav is not expanded', () => {
            expect(sideNavService.isExpanded('123')).toBeFalse();
        });
    });
});
