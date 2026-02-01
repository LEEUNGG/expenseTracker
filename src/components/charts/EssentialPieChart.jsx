import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../contexts/ThemeContext';
import { memo } from 'react';
import { MORANDI_THEME } from '../../lib/chartTheme';

const COLORS = [MORANDI_THEME.semantic.success, MORANDI_THEME.semantic.danger];

const EssentialPieChart = memo(function EssentialPieChart({ data }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? 'rgba(75, 85, 99, 0.5)' : '#e5e7eb',
      textStyle: {
        color: isDark ? '#fff' : '#111827'
      },
      padding: [10, 15],
      borderRadius: 12,
      extraCssText: 'backdrop-filter: blur(8px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);',
      formatter: '{b}: ¥{c} ({d}%)'
    },
    legend: {
      bottom: '0%',
      left: 'center',
      textStyle: {
        color: isDark ? '#9ca3af' : '#6b7280',
        fontSize: 12
      },
      itemGap: 15,
      itemWidth: 10,
      itemHeight: 10
    },
    series: [
      {
        name: 'Type',
        type: 'pie',
        radius: ['50%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: isDark ? '#1f2937' : '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            color: isDark ? '#fff' : '#1f2937'
          },
          scale: true,
          scaleSize: 10
        },
        labelLine: {
          show: false
        },
        data: data.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: { color: COLORS[index % COLORS.length] }
        }))
      }
    ]
  };

  return (
    <div className="w-full h-[300px]">
      <ReactECharts 
        option={option} 
        style={{ height: '100%', width: '100%' }}
        theme={isDark ? 'dark' : undefined}
      />
    </div>
  );
});

export { EssentialPieChart };
