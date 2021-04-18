import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/naming-convention
const _expand$ = new Subject<string[]>();

const expandedTable: {
    [index: string]: boolean;
} = {};

@Injectable()
export class SideNavService {

    public get expand$(): Subject<string[]> {
        return _expand$;
    }

    public isExpanded(hash: string): boolean {
        if (expandedTable[hash]) {
            return true;
        }
        return false;
    }

    public setExpanded(hash: string, expanded: boolean): void {
        expandedTable[hash] = expanded;
    }

}
