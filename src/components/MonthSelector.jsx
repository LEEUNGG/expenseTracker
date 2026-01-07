import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from './Toast';

export function MonthSelector({ currentMonth, onPrevious, onNext }) {
  const { addToast } = useToast();
  const minMonth = new Date(2026, 0, 1);
  const maxMonth = new Date();

  // 获取上一个月的开始时间进行比较
  const prevMonthDate = new Date(currentMonth);
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const canGoPrevious = prevMonthDate >= minMonth;

  // 获取下一个月的开始时间进行比较
  const nextMonthDate = new Date(currentMonth);
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const canGoNext = nextMonthDate <= maxMonth;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthName = monthNames[currentMonth.getMonth()];
  const year = currentMonth.getFullYear();

  const handlePreviousClick = () => {
    if (canGoPrevious) {
      onPrevious();
    } else {
      addToast('Records start from January 2026, no earlier data available.');
    }
  };

  const handleNextClick = () => {
    if (canGoNext) {
      onNext();
    } else {
      addToast('Future data is not yet available.');
    }
  };

  const buttonClass = (isEnabled) => cn(
    "p-3 rounded-xl transition-all duration-300 backdrop-blur-sm",
    isEnabled
      ? "shadow-lg hover:shadow-xl hover:bg-white/50 dark:hover:bg-gray-700/50 cursor-pointer"
      : "opacity-20 grayscale cursor-not-allowed shadow-none bg-gray-100/50 dark:bg-gray-800/30"
  );

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={handlePreviousClick}
        className={buttonClass(canGoPrevious)}
      >
        <ChevronLeft className={cn(
          "w-5 h-5 transition-colors",
          canGoPrevious ? "text-violet-600 dark:text-violet-400" : "text-gray-400"
        )} />
      </button>

      <h2 className="text-2xl font-bold min-w-[200px] text-center text-gray-800 dark:text-gray-100">
        {monthName} {year}
      </h2>

      <button
        onClick={handleNextClick}
        className={buttonClass(canGoNext)}
      >
        <ChevronRight className={cn(
          "w-5 h-5 transition-colors",
          canGoNext ? "text-violet-600 dark:text-violet-400" : "text-gray-400"
        )} />
      </button>
    </div>
  );
}
