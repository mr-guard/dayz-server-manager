import { Directive, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';

export type SortDirection = 'asc' | 'desc' | '';
const rotate: { [key: string]: SortDirection } = {
    'asc': 'desc',
    'desc': '',
    '': 'asc',
};

export interface SortEvent {
    column: string;
    direction: SortDirection;
}

@Directive({
    selector: 'th[sbSortable]',
})
export class SBSortableHeaderDirective {

    @Input() public sbSortable!: string;
    @Input() public direction: SortDirection = '';
    @Output() public sort = new EventEmitter<SortEvent>();

    @HostBinding('class.asc') public get isAscending(): boolean {
        return this.direction === 'asc';
    }

    @HostBinding('class.desc') public get isDescending(): boolean {
        return this.direction === 'desc';
    }

    @HostListener('click') public rotate(): void {
        this.direction = rotate[this.direction];
        this.sort.emit({ column: this.sbSortable, direction: this.direction });
    }

}
