/* tslint:disable: ordered-imports*/
import { NgModule } from '@angular/core';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';

import { fontAwesomeSolidIcons } from './icons.font-awesome-solid';
import { fontAwesomeRegularIcons } from './icons.font-awesome-regular';
import { fontAwesomeBrandsIcons } from './icons.font-awesome-brands';

@NgModule({
    exports: [FontAwesomeModule],
})
export class IconsModule {

    public constructor(library: FaIconLibrary) {
        library.addIconPacks(
            fontAwesomeSolidIcons,
            fontAwesomeRegularIcons,
            fontAwesomeBrandsIcons,
        );
    }

}
