import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
    selector: 'sb-layout-error',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './layout-error.component.html',
    styleUrls: ['layout-error.component.scss'],
})
export class LayoutErrorComponent implements OnInit {

    public ngOnInit(): void {
        // ignore
    }

}
