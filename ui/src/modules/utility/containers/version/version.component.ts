import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../../services/utility.service';
import { take } from 'rxjs/operators';

@Component({
    selector: 'sb-version',
    templateUrl: './version.component.html',
    styleUrls: ['version.component.scss'],
})
export class VersionComponent implements OnInit {

    public version!: string;
    public constructor(private utilityService: UtilityService) {}
    public ngOnInit(): void {
        this.utilityService.version$.pipe(take(1)).subscribe((v) => (this.version = v));
    }

}
