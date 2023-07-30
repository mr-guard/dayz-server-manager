import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Input,
    OnInit,
    QueryList,
    ViewChildren,
} from '@angular/core';
import { AuditEvent } from '../../../app-common/models';
import { AuditService } from '../../services/audit.service';
import { SBSortableHeaderDirective, SortEvent } from '../../../players/directives/sortable.directive';
import { Observable } from 'rxjs';

@Component({
    selector: 'sb-audit-table',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './audit-table.component.html',
    styleUrls: ['audit-table.component.scss'],
})
export class AuditTableComponent implements OnInit {

    public readonly MAX_ITEMS = 9999999;

    @Input() public pageSize = this.MAX_ITEMS;

    public audits$!: Observable<AuditEvent[]>;
    public total$!: Observable<number>;
    public sortedColumn!: string;
    public sortedDirection!: string;

    @ViewChildren(SBSortableHeaderDirective) public headers!: QueryList<SBSortableHeaderDirective>;

    public constructor(
        public auditService: AuditService,
        private changeDetectorRef: ChangeDetectorRef,
    ) {}

    public ngOnInit(): void {
        this.auditService.pageSize = this.pageSize;
        this.audits$ = this.auditService.audits$;
        this.total$ = this.auditService.total$;
    }

    public onSort({ column, direction }: any): void {
        if (column === 'timestamp') {
            this.sortedColumn = column;
            this.sortedDirection = direction;
            this.auditService.sortColumn = column;
            this.auditService.sortDirection = direction;
            this.changeDetectorRef.detectChanges();
        }
    }

    public mapTrigger(accept?: string): string {
        if (accept?.includes('json')) {
            return 'API/Web';
        } else if (accept?.includes('text')) {
            return 'Discord';
        }
        return 'Unknown';
    }

}
