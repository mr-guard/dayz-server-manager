import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'sb-sort-icon',
    templateUrl: './sort-icon.component.html',
    styleUrls: ['sort-icon.component.scss'],
})
export class SortIconComponent implements OnInit {

    @Input() public direction!: string;

    public ngOnInit(): void {
        // ignore
    }

}
