import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { ChartDatum, ChartSpec } from '../types';

export function ChartView({ spec, data }: { spec: ChartSpec; data: ChartDatum[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) {
      return;
    }
    const chart = echarts.init(container.current, undefined, { renderer: 'svg' });
    const seriesType = spec.type === 'area' ? 'line' : spec.type;
    chart.setOption({
      animation: false,
      aria: {
        show: true,
        description: `${spec.title}. ${data.length} grouped values.`,
        decal: { show: true },
      },
      color: ['#2f6f59'],
      grid: { left: 58, right: 22, top: 28, bottom: 64 },
      tooltip: { trigger: 'axis', renderMode: 'richText' },
      xAxis: {
        type: 'category',
        data: data.map((datum) => datum.label),
        axisLabel: { rotate: data.length > 8 ? 35 : 0, hideOverlap: true },
      },
      yAxis: { type: 'value', name: spec.aggregation },
      series: [
        {
          type: seriesType,
          data: data.map((datum) => datum.value),
          areaStyle: spec.type === 'area' ? { opacity: 0.2 } : undefined,
          smooth: spec.type === 'line' || spec.type === 'area',
          symbolSize: 6,
        },
      ],
    });
    const resize = new ResizeObserver(() => chart.resize());
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      chart.dispose();
    };
  }, [data, spec]);

  return (
    <figure className="chart-figure">
      <div ref={container} className="chart-container" />
      <figcaption>
        {spec.aggregation} grouped by {spec.dimension}. Showing up to 100 groups.
      </figcaption>
      <table className="sr-only">
        <caption>{spec.title}</caption>
        <thead>
          <tr>
            <th scope="col">{spec.dimension}</th>
            <th scope="col">{spec.aggregation}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((datum) => (
            <tr key={datum.label}>
              <td>{datum.label}</td>
              <td>{datum.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
