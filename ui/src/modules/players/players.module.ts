/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AppCommonModule } from '../app-common/app-common.module';
import { NavigationModule } from '../navigation/navigation.module';
import { SBSortableHeaderDirective } from './directives/sortable.directive';
import { PlayersComponent } from './containers/players/players.component';
import { PlayerTableComponent } from './components/player-table/player-table.component';
import { SortIconComponent } from './components/sort-icon/sort-icon.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        FormsModule,
        AppCommonModule,
        NavigationModule,
        NgbModule,
        FontAwesomeModule,
    ],
    providers: [
        DecimalPipe,
        SBSortableHeaderDirective,
    ],
    declarations: [
        SBSortableHeaderDirective,
        PlayersComponent,
        PlayerTableComponent,
        SortIconComponent,
    ],
    exports: [
        PlayersComponent,
        PlayerTableComponent,
        SortIconComponent,
    ],
})
export class PlayersModule {}
