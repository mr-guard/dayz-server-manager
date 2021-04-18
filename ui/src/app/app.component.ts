import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ChildActivationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {

    public title = 'ServerManager';

    public constructor(public router: Router, private titleService: Title) {
        this.router.events
            .pipe(filter((event) => event instanceof ChildActivationEnd))
            .subscribe((event) => {
                // eslint-disable-next-line prefer-destructuring
                let snapshot = ((event) as ChildActivationEnd).snapshot;
                while (snapshot.firstChild !== null) {
                    snapshot = snapshot.firstChild;
                }
                this.titleService.setTitle(snapshot.data.title || 'ServerManager');
            });
    }

}
