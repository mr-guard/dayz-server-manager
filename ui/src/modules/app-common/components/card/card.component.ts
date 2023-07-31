import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'sb-card',
    templateUrl: './card.component.html',
    styleUrls: ['card.component.scss'],
})
export class CardComponent implements OnInit {

    @Input() public background!: string;
    @Input() public color!: string;

    public customClasses: string[] = [];

    public ngOnInit(): void {
        if (this.background) {
            this.customClasses.push(this.background);
        }
        if (this.color) {
            this.customClasses.push(this.color);
        }
    }

}
