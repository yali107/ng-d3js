import {
    Component,
    ElementRef,
    OnInit,
    OnDestroy,
    ViewChild,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core';
import * as d3 from 'd3v6';
import { LINE_CHART_DATA } from './data';
import isEmpty from 'lodash/isEmpty';

@Component({
    selector: 'app-line-chart',
    templateUrl: './line-chart.component.html',
    styleUrls: ['./line-chart.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartComponent implements OnInit, OnDestroy {
    private width = 700;
    private height = 400;
    private margin = { top: 20, right: 20, bottom: 35, left: 20 };

    private _chart = {
        svg: null,
        svgInner: null,
        xAxis: null,
        yAxis: null,
        xScale: null,
        yScale: null,
        lineGroup: null,
        tooltip: null,
        focus: null
    };

    data = LINE_CHART_DATA;

    @ViewChild('chartContainer', { static: true }) chartContainer: ElementRef;

    constructor(private _cd: ChangeDetectorRef) {}

    ngOnInit() {
        this.initializeChart();
        this.drawChart();
        this._cd.markForCheck();
    }

    public ngOnChanges(changes): void {
        if (changes.hasOwnProperty('data') && this.data) {
            console.log(this.data);
            this.initializeChart();
            this.drawChart();

            window.addEventListener('resize', () => this.drawChart());
        }
    }

    private initializeChart(): void {
        // Remove elements if already exist
        d3.select('#chartTooltip').selectAll('*').remove();

        this._chart.svg = d3
            .select('#line')
            .select('svg')
            .attr('height', this.height + this.margin.top);
        this._chart.svgInner = this._chart.svg
            .append('g')
            .style(
                'transform',
                `translate(${this.margin.left}px, ${this.margin.top}px)`
            );

        this._chart.yScale = d3
            .scaleLinear()
            .domain([
                d3.max(this.data, (d) => d.value) + 1,
                d3.min(this.data, (d) => d.value) - 1,
            ])
            .range([0, this.height - 2 * this.margin.left]);

        this._chart.yAxis = this._chart.svgInner
            .append('g')
            .attr('class', 'axis axis--y')
            .style('transform', 'translate(' + this.margin.left + 'px,  0)');

        this._chart.xScale = d3
            .scaleTime()
            .domain(d3.extent(this.data, (d) => new Date(d.date)));

        this._chart.xAxis = this._chart.svgInner
            .append('g')
            .attr('class', 'axis axis--x')
            .style(
                'transform',
                'translate(0, ' + (this.height - 2 * this.margin.left) + 'px)'
            );

        this._chart.lineGroup = this._chart.svgInner
            .append('g')
            .append('path')
            .attr('id', 'line')
            .attr('class', 'chart-line')
            .style('fill', 'none')
            // .style('stroke', 'red')
            .style('stroke-width', '1.5px');

        this._chart.tooltip = d3
            .select('body')
            .append('div')
            .attr('id', 'chartTooltip')
            .style('display', 'none')
            .style('opacity', 0);
    }

    private drawChart(): void {
        this.width =
            this.chartContainer.nativeElement.getBoundingClientRect().width;
        this._chart.svg.attr('width', this.width);

        this._chart.xScale.range([this.margin.left, this.width - 2 * this.margin.left]);

        const xAxis = d3
            .axisBottom(this._chart.xScale)
            .ticks(10)
            .tickFormat(d3.timeFormat('%m/%d/%y'));

        this._chart.xAxis.call(xAxis);

        const yAxis = d3.axisLeft(this._chart.yScale);

        this._chart.yAxis.call(yAxis);

        this._chart.focus = this._chart.svg.append("g")
            .attr("class", "focus")
            .style("display", "none");

        this._chart.focus.append("circle")
            .attr("r", 5);

        const mousemove = function (s, d) {
            let bisectDate = d3.bisector((t) => {
                return new Date(t['date']);
            }).left;
            let x0 = this._chart.xScale.invert(s.x),
                i = bisectDate(this.data, x0, 1),
                d0 = this.data[i - 1],
                d1 = this.data[i],
                dd = x0 - d0.date > d1.date - x0 ? d1 : d0;
            if (!dd || isEmpty(dd)) {
                return;
            }
            this._chart.tooltip
                // .style('top', s.layerY + 15 + 'px')
                // .style('left', s.layerX + 'px')
                .style('left', this._chart.xScale(new Date(dd.date)) + 'px')
                .style('top', this._chart.yScale(dd.value) + this.margin.top + 'px')
                // .attr("transform", "translate(" + this._chart.xScale(new Date(dd.date)) + "px," + this._chart.yScale(dd.value) + "px)")
                .style('display', 'block')
                .style('opacity', 1)
                .html(
                    `Date: ${dd.date}<br>Value: ${dd.value}`
                );
            this._chart.focus.attr("transform", "translate(" + (this._chart.xScale(new Date(dd.date)) + this.margin.left) + "," + (this._chart.yScale(dd.value) + this.margin.top) + ")");
        };

        const mouseout = function (s, d) {
            this._chart.tooltip.style('display', 'none').style('opacity', 0);
            this._chart.focus.style("display", "none");
        };

        this._chart.svg.append("rect")
            .attr("class", "overlay")
            .attr("width", this.width)
            .attr("height", this.height)
            .style("fill", 'none')
            .style("pointer-events", 'all')
            .on("mouseover", () => { this._chart.focus.style("display", null); })
            .on("mouseout", mouseout.bind(this))
            .on("mousemove", mousemove.bind(this));

        const line = d3
            .line()
            .x((d) => d[0])
            .y((d) => d[1])
            .curve(d3.curveMonotoneX);

        const points: [number, number][] = this.data.map((d) => [
            this._chart.xScale(new Date(d.date)),
            this._chart.yScale(d.value),
        ]);

        this._chart.lineGroup
            .attr('d', line(points));
    }

    ngOnDestroy(): void {
        d3.selectAll('#chartTooltip').remove();
    }
}
