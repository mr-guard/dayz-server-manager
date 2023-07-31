import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'sb-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['footer.component.scss'],
})
export class FooterComponent implements OnInit {

    public version = 'UNKNOWN';

    public constructor(
        private http: HttpClient,
    ) {}

    public ngOnInit(): void {
        this.http.get('/version', { responseType: 'text' })
            .subscribe(
                (response) => {
                    this.version = response as any;
                },
                (e) => {console.error(e)},
            );
    }

}
