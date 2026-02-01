import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../contexts/ThemeContext';
import * as echarts from 'echarts';
import { MORANDI_THEME } from '../../lib/chartTheme';

export function MonthlyTrendChart({ data }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const formatMonth = (month) => {
    return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  };

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? 'rgba(75, 85, 99, 0.5)' : '#e5e7eb',
      textStyle: {
        color: isDark ? '#fff' : '#111827'
      },
      padding: [10, 15],
      borderRadius: 12,
      extraCssText: 'backdrop-filter: blur(8px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map(item => formatMonth(item.month)),
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: isDark ? '#9ca3af' : '#6b7280',
        margin: 20,
        interval: 0 // Show all labels
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: isDark ? '#374151' : '#e5e7eb',
          type: 'dashed'
        }
      },
      axisLabel: {
        color: isDark ? '#9ca3af' : '#6b7280',
        formatter: (value) => `¥${value.toLocaleString()}`
      }
    },
    series: [
      {
        name: 'Spending',
        type: 'line',
        data: data.map(item => item.total_spending),
        smooth: true,
        showSymbol: false,
        symbolSize: 8,
        itemStyle: {
          color: MORANDI_THEME.charts.monthlyTrend.line
        },
        lineStyle: {
          width: 4,
          shadowColor: `${MORANDI_THEME.charts.monthlyTrend.line}4D`,
          shadowBlur: 10,
          shadowOffsetY: 5
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: MORANDI_THEME.charts.monthlyTrend.areaTop
            },
            {
              offset: 1,
              color: MORANDI_THEME.charts.monthlyTrend.areaBottom
            }
          ])
        }
      }
    ]
  };

  return (
    <div className="w-full h-[350px]">
      <ReactECharts 
        option={option} 
        style={{ height: '100%', width: '100%' }}
        theme={isDark ? 'dark' : undefined}
      />
    </div>
  );
}
