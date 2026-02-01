import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export function DateSelector({ selectedDay, currentMonth, maxDay, onSelectDay }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getOrdinalSuffix = (n) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };

    const handlePrevDay = () => {
        if (selectedDay === null) {
            onSelectDay(maxDay);
        } else if (selectedDay > 1) {
            onSelectDay(selectedDay - 1);
        }
    };

    const handleNextDay = () => {
        if (selectedDay !== null && selectedDay < maxDay) {
            onSelectDay(selectedDay + 1);
        }
    };

    const handleDayClick = (day) => {
        onSelectDay(day);
        setIsOpen(false);
    };

    const handleShowAll = () => {
        onSelectDay(null);
        setIsOpen(false);
    };

    return (
        <div className="relative flex items-center gap-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg p-0.5" ref={containerRef}>
            <button
                onClick={handlePrevDay}
                disabled={selectedDay === 1}
                className={cn(
                    "p-1.5 rounded-md transition-all duration-200",
                    selectedDay === 1
                        ? "opacity-30 cursor-not-allowed text-gray-400"
                        : "hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                )}
                title="Previous day"
            >
                <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 min-w-[80px] justify-center",
                    isOpen
                        ? "bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm ring-2 ring-violet-500/10"
                        : selectedDay === null
                            ? "bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm"
                            : "text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50"
                )}
            >
                <Calendar className="w-3 h-3 opacity-70" />
                <span>
                    {selectedDay === null ? 'All Days' : `${selectedDay}${getOrdinalSuffix(selectedDay)}`}
                </span>
            </button>

            <button
                onClick={handleNextDay}
                disabled={selectedDay === null || selectedDay >= maxDay}
                className={cn(
                    "p-1.5 rounded-md transition-all duration-200",
                    (selectedDay === null || selectedDay >= maxDay)
                        ? "opacity-30 cursor-not-allowed text-gray-400"
                        : "hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                )}
                title="Next day"
            >
                <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <button
                            onClick={handleShowAll}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                                selectedDay === null
                                    ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            )}
                        >
                            <span>View All Days</span>
                            {selectedDay === null && <Check className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {days.map(day => {
                            const isSelected = selectedDay === day;
                            const isDisabled = day > maxDay;
                            
                            return (
                                <button
                                    key={day}
                                    onClick={() => !isDisabled && handleDayClick(day)}
                                    disabled={isDisabled}
                                    className={cn(
                                        "h-8 w-8 flex items-center justify-center text-xs font-medium rounded-lg transition-all",
                                        isSelected
                                            ? "bg-violet-600 text-white shadow-md shadow-violet-500/30 scale-105"
                                            : isDisabled
                                                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-50/50 dark:bg-gray-800/50"
                                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105"
                                    )}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
