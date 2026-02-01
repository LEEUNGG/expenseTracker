import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../contexts/ThemeContext';
import { memo, useMemo, useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import { MORANDI_THEME } from '../../lib/chartTheme';

const BudgetLineChart = memo(function BudgetLineChart({ data, maxSpending, onBudgetClick, currentMonth }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const chartRef = useRef(null);

  // Filter spending data for current month (same logic as before)
  const filteredData = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const viewingMonth = currentMonth ? new Date(currentMonth) : new Date();
    const isCurrentMonth = 
      viewingMonth.getFullYear() === today.getFullYear() && 
      viewingMonth.getMonth() === today.getMonth();
    
    if (!isCurrentMonth) return data;
    
    return data.map((point) => ({
      ...point,
      spending: parseInt(point.day) > currentDay ? null : point.spending
    }));
  }, [data, currentMonth]);

  const option = useMemo(() => {
    const days = filteredData.map(d => d.day);
    const budgetData = filteredData.map(d => d.budget);
    const spendingData = filteredData.map(d => d.spending);

    return {
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
        extraCssText: 'backdrop-filter: blur(8px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);',
        formatter: (params) => {
          let result = `<div class="font-bold mb-2">Day ${params[0].axisValue}</div>`;
          params.forEach(param => {
            const value = param.value !== undefined && param.value !== null ? `¥${param.value.toLocaleString()}` : '-';
            result += `
              <div class="flex items-center gap-2 mb-1">
                <span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${param.color};"></span>
                <span class="text-sm text-gray-500">${param.seriesName}:</span>
                <span class="text-sm font-bold ml-auto">${value}</span>
              </div>
            `;
          });
          return result;
        }
      },
      legend: {
        data: ['Cumulative Budget', 'Cumulative Spending'],
        top: 0,
        right: 10,
        textStyle: {
          color: isDark ? '#9ca3af' : '#6b7280'
        }
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
        data: days,
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
          margin: 15,
          interval: 'auto'
        }
      },
      yAxis: {
        type: 'value',
        max: maxSpending > 0 ? maxSpending : 1000,
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
          name: 'Cumulative Budget',
          type: 'line',
          data: budgetData,
          smooth: true,
          showSymbol: false,
          symbolSize: 8,
          itemStyle: {
            color: MORANDI_THEME.charts.budgetLine.budget
          },
          lineStyle: {
            width: 3
          }
        },
        {
          name: 'Cumulative Spending',
          type: 'line',
          data: spendingData,
          smooth: true,
          showSymbol: false, // Hide symbols to keep it clean like before
          symbolSize: 8,
          itemStyle: {
            color: MORANDI_THEME.charts.budgetLine.spending
          },
          lineStyle: {
            width: 3,
            shadowColor: `${MORANDI_THEME.charts.budgetLine.spending}4D`, // 30% opacity
            shadowBlur: 10,
            shadowOffsetY: 5
          },
          // Add visualMap-like effect for over-budget is complex in dynamic line, 
          // keeping it simple red for now as requested "simple & good looking"
          markPoint: {
            data: [
              { type: 'max', name: 'Max' }
            ],
            itemStyle: {
              color: MORANDI_THEME.charts.budgetLine.spending
            }
          }
        }
      ]
    };
  }, [filteredData, maxSpending, isDark]);

  // Handle click events
  const onChartClick = (params) => {
    if (params.componentType === 'series' || params.componentType === 'axis') {
      // ECharts click event gives us the data index or name (day)
      // params.name corresponds to the x-axis value (day)
      if (onBudgetClick && params.name) {
        const day = parseInt(params.name);
        const dayIndex = day - 1;
        if (dayIndex >= 0 && dayIndex < filteredData.length) {
          const currentDayData = filteredData[dayIndex];
          const prevDayData = dayIndex > 0 ? filteredData[dayIndex - 1] : { budget: 0 };
          const dailyBudget = currentDayData.budget - prevDayData.budget;
          onBudgetClick(params.name, dailyBudget);
        }
      }
    }
  };

  return (
    <div className="w-full h-[320px]">
      <ReactECharts 
        ref={chartRef}
        option={option} 
        style={{ height: '100%', width: '100%' }}
        theme={isDark ? 'dark' : undefined}
        onEvents={{
          'click': onChartClick
        }}
      />
    </div>
  );
});

export { BudgetLineChart };
