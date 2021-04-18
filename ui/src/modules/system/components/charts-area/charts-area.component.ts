import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    Input,
    OnInit,
    ViewChild,
} from '@angular/core';
import { Chart } from 'chart.js';

@Component({
    selector: 'sb-charts-area',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './charts-area.component.html',
    styleUrls: ['charts-area.component.scss'],
})
export class ChartsAreaComponent implements OnInit, AfterViewInit {

    @ViewChild('myAreaChart') public myAreaChart!: ElementRef<HTMLCanvasElement>;
    public chart!: Chart;

    // eslint-disable-next-line accessor-pairs
    @Input()
    public set chartConf(conf: Chart.ChartConfiguration) {
        this.chartConf$ = conf;
        if (this.myAreaChart?.nativeElement) {
            this.chart = new Chart(this.myAreaChart.nativeElement, conf);
        }
    }

    public get chartConf(): Chart.ChartConfiguration {
        return this.chartConf$;
    }

    public chartConf$!: Chart.ChartConfiguration;

    public ngOnInit(): void {
        // ignore
    }

    public ngAfterViewInit(): void {
        if (this.chartConf$) {
            this.chart = new Chart(this.myAreaChart.nativeElement, this.chartConf$);
        }
    }

}
