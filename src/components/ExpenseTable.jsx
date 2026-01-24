import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Pencil, Trash2, Plus, Check, X, Sparkles, ArrowUp, ArrowDown, ArrowUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { extractDateTimeFromTimestamp } from '../lib/deduplicationService';

const getExpenseDateStr = (expense) => {
    if (expense?._dateISO) return expense._dateISO;
    if (expense?.transaction_datetime && typeof expense.transaction_datetime === 'string') {
        const extracted = extractDateTimeFromTimestamp(expense.transaction_datetime);
        if (extracted?.date) return extracted.date;
    }
    return expense?.date || '';
};

const getExpenseDay = (expense) => {
    if (Number.isFinite(expense?._day)) return expense._day;
    const dateStr = getExpenseDateStr(expense);
    if (dateStr) {
        const dayPart = parseInt(dateStr.split('-')[2], 10);
        if (Number.isFinite(dayPart)) return dayPart;
    }
    const datetime = expense?.transaction_datetime ? new Date(expense.transaction_datetime) : new Date(expense?.date);
    return Number.isNaN(datetime.getTime()) ? null : datetime.getDate();
};

export function ExpenseTable({
    expenses,
    allExpenses = [],
    categories,
    onCreate,
    onUpdate,
    onDelete,
    selectedIds,
    onSelectionChange,
    onBatchDelete,
    currentMonth,
    onAIEntry
}) {
    const categoryById = useMemo(() => new Map(categories.map(cat => [cat.id, cat])), [categories]);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newExpense, setNewExpense] = useState({
        date: '',
        category_id: '',
        description: '',
        amount: '',
        is_essential: true
    });
    const [editingExpense, setEditingExpense] = useState({
        date: '',
        category_id: '',
        description: '',
        amount: '',
        is_essential: true
    });

    // Amount column sorting state: 'none' | 'asc' | 'desc'
    const [amountSortDirection, setAmountSortDirection] = useState('none');

    // Search state for filtering by amount
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchInputRef = useRef(null);

    // Date filter state: null means show all, otherwise show specific day
    const [selectedDay, setSelectedDay] = useState(null);

    // Toggle sort direction: none -> desc -> asc -> none
    const toggleAmountSort = () => {
        setAmountSortDirection(prev => {
            if (prev === 'none') return 'desc';
            if (prev === 'desc') return 'asc';
            return 'none';
        });
    };

    // Reset sort state when month changes
    // Using a ref to track previous month to avoid cascading renders
    const prevMonthRef = useRef(currentMonth);
    useEffect(() => {
        if (prevMonthRef.current !== currentMonth) {
            prevMonthRef.current = currentMonth;
            // Batch state updates in a callback to avoid cascading renders
            const resetState = () => {
                setAmountSortDirection('none');
                setSearchQuery('');
                setIsSearchOpen(false);
                setSelectedDay(null);
            };
            resetState();
        }
    }, [currentMonth]);

    // Focus search input when opened
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    // Determine if we're in search mode
    const isSearchMode = searchQuery.trim().length > 0;

    // Get days info for the current month
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = currentMonth.getFullYear() === today.getFullYear() && 
                           currentMonth.getMonth() === today.getMonth();
    const maxDay = isCurrentMonth ? today.getDate() : daysInMonth;

    // Day navigation handlers
    const _canGoPrevDay = selectedDay === null || selectedDay > 1;
    const _canGoNextDay = selectedDay !== null && selectedDay < maxDay;

    const handlePrevDay = () => {
        if (selectedDay === null) {
            // From "All", go to the last day (today or month end)
            setSelectedDay(maxDay);
        } else if (selectedDay > 1) {
            setSelectedDay(selectedDay - 1);
        }
    };

    const handleNextDay = () => {
        if (selectedDay !== null && selectedDay < maxDay) {
            setSelectedDay(selectedDay + 1);
        }
    };

    const handleShowAll = () => {
        setSelectedDay(null);
    };

    // Filter expenses by day first, then by search query
    const dayFilteredExpenses = useMemo(() => {
        if (selectedDay === null) return allExpenses;
        return allExpenses.filter(expense => {
            const day = getExpenseDay(expense);
            return day === selectedDay;
        });
    }, [allExpenses, selectedDay]);

    // Filter expenses by search query (amount) - search in day-filtered expenses
    const filteredExpenses = useMemo(() => {
        if (!isSearchMode) return dayFilteredExpenses;
        
        const query = searchQuery.trim();
        return dayFilteredExpenses.filter(expense => {
            const amountValue = Number.isFinite(expense._amount) ? expense._amount : parseFloat(expense.amount);
            const amount = amountValue.toFixed(2);
            return amount.includes(query);
        });
    }, [dayFilteredExpenses, searchQuery, isSearchMode]);

    // Compute sorted expenses based on sort direction (after filtering)
    const sortedExpenses = useMemo(() => {
        // Handle edge cases: empty array or single item
        if (!filteredExpenses || filteredExpenses.length <= 1 || amountSortDirection === 'none') {
            return filteredExpenses;
        }

        return [...filteredExpenses].sort((a, b) => {
            const amountA = Number.isFinite(a._amount) ? a._amount : parseFloat(a.amount);
            const amountB = Number.isFinite(b._amount) ? b._amount : parseFloat(b.amount);
            return amountSortDirection === 'asc'
                ? amountA - amountB
                : amountB - amountA;
        });
    }, [filteredExpenses, amountSortDirection]);

    const visibleExpenses = useMemo(() => sortedExpenses || [], [sortedExpenses]);
    const visibleIds = useMemo(() => visibleExpenses.map(expense => expense.id), [visibleExpenses]);
    const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const allVisibleSelected = useMemo(() => {
        if (visibleIds.length === 0) return false;
        return visibleIds.every(id => selectedIdSet.has(id));
    }, [visibleIds, selectedIdSet]);

    useEffect(() => {
        if (selectedIds.length === 0) return;
        const visibleIdSet = new Set(visibleIds);
        const nextSelected = selectedIds.filter(id => visibleIdSet.has(id));
        if (nextSelected.length !== selectedIds.length) {
            onSelectionChange(nextSelected);
        }
    }, [selectedIds, visibleIds, onSelectionChange]);

    // Custom Scrollbar Logic
    const containerRef = useRef(null);
    const trackRef = useRef(null);
    const [scrollbarState, setScrollbarState] = useState({ left: 0, thumbWidth: 0, isVisible: false });
    const scrollbarRaf = useRef(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const startScrollLeft = useRef(0);

    const updateScrollbar = useCallback(() => {
        if (containerRef.current) {
            const { scrollLeft, clientWidth, scrollWidth } = containerRef.current;
            const isVisible = scrollWidth > clientWidth + 1;
            const thumbWidth = Math.max((clientWidth / scrollWidth) * 100, 10);
            const left = scrollWidth > clientWidth
                ? (scrollLeft / (scrollWidth - clientWidth)) * (100 - thumbWidth)
                : 0;
            if (scrollbarRaf.current) {
                cancelAnimationFrame(scrollbarRaf.current);
            }
            scrollbarRaf.current = requestAnimationFrame(() => {
                setScrollbarState(prev => {
                    if (prev.left === left && prev.thumbWidth === thumbWidth && prev.isVisible === isVisible) {
                        return prev;
                    }
                    return { left, thumbWidth, isVisible };
                });
            });
        }
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging.current || !containerRef.current || !trackRef.current) return;

        const deltaX = e.clientX - startX.current;
        const { scrollWidth, clientWidth } = containerRef.current;
        if (scrollWidth <= clientWidth) return;

        const trackWidth = trackRef.current.clientWidth;
        const availableTrackWidth = trackWidth * (1 - scrollbarState.thumbWidth / 100);
        const availableScrollWidth = scrollWidth - clientWidth;

        if (availableTrackWidth > 0) {
            const scrollDelta = (deltaX / availableTrackWidth) * availableScrollWidth;
            containerRef.current.scrollLeft = startScrollLeft.current + scrollDelta;
        }
    }, [scrollbarState.thumbWidth]);

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.body.style.userSelect = '';
    }, [handleMouseMove]);

    // Store handleMouseUp in a ref so we can reference it in cleanup
    const handleMouseUpRef = useRef(handleMouseUp);
    useEffect(() => {
        handleMouseUpRef.current = handleMouseUp;
    }, [handleMouseUp]);

    const handleThumbMouseDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging.current = true;
        startX.current = e.clientX;
        startScrollLeft.current = containerRef.current.scrollLeft;
        
        const onMouseUp = () => {
            handleMouseUpRef.current();
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.userSelect = 'none';
    }, [handleMouseMove]);

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            updateScrollbar();
            container.addEventListener('scroll', updateScrollbar);
            window.addEventListener('resize', updateScrollbar);

            // Observer to detect content size changes
            const observer = new ResizeObserver(updateScrollbar);
            observer.observe(container);
            // Optionally observe the table itself since it's the child that overflows
            const table = container.querySelector('table');
            if (table) observer.observe(table);

            return () => {
                container.removeEventListener('scroll', updateScrollbar);
                window.removeEventListener('resize', updateScrollbar);
                document.removeEventListener('mousemove', handleMouseMove);
                observer.disconnect();
            };
        }
    }, [updateScrollbar, handleMouseMove]);

    useEffect(() => {
        updateScrollbar();
    }, [updateScrollbar, sortedExpenses.length, isAdding, editingId]);

    useEffect(() => {
        return () => {
            if (scrollbarRaf.current) {
                cancelAnimationFrame(scrollbarRaf.current);
            }
        };
    }, []);

    const handleScrollbarClick = (e) => {
        if (isDragging.current) return;
        if (containerRef.current && trackRef.current) {
            const rect = trackRef.current.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            const { scrollWidth, clientWidth } = containerRef.current;

            if (scrollWidth <= clientWidth) return;

            const thumbWidthRatio = clientWidth / scrollWidth;
            const targetScrollRatio = (clickPos - thumbWidthRatio / 2) / (1 - thumbWidthRatio);
            const targetScroll = Math.max(0, Math.min(targetScrollRatio * (scrollWidth - clientWidth), scrollWidth - clientWidth));

            containerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
        }
    };

    const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const resetNewExpense = () => {
        const today = new Date();
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        let dateValue;
        if (selectedDay !== null) {
            dateValue = formatLocalDate(new Date(year, month, selectedDay));
        } else if (today.getFullYear() === year && today.getMonth() === month) {
            dateValue = formatLocalDate(today);
        } else {
            const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
            dateValue = formatLocalDate(new Date(year, month, lastDayOfMonth));
        }

        // Use the first category from the list as default
        const defaultCatId = categories.length > 0 ? categories[0].id : '';

        setNewExpense({
            date: dateValue,
            category_id: defaultCatId,
            description: '',
            amount: '',
            is_essential: true
        });
    };

    const handleAddClick = () => {
        resetNewExpense();
        setIsAdding(true);
    };

    const handleSaveNew = async () => {
        if (!newExpense.amount || !newExpense.category_id || !newExpense.date) {
            alert('Please fill in Date, Category and Amount');
            return;
        }

        const expenseToSave = {
            date: newExpense.date,
            category_id: newExpense.category_id,
            note: newExpense.description || '',
            amount: parseFloat(newExpense.amount),
            is_essential: newExpense.is_essential
        };

        try {
            await onCreate(expenseToSave);
            setIsAdding(false);
        } catch (error) {
            console.error('Failed to create expense:', error);
            // Error handling is managed by App.jsx's handleCreateExpense
        }
    };

    const handleCancelNew = () => {
        setIsAdding(false);
    };

    const handleEditClick = (expense) => {
        setEditingId(expense.id);
        const dateStr = getExpenseDateStr(expense);
        setEditingExpense({
            date: dateStr,
            category_id: expense.category_id,
            description: expense.note || expense.description || '',
            amount: expense.amount.toString(),
            is_essential: expense.is_essential
        });
    };

    const handleSaveEdit = async () => {
        if (!editingExpense.amount || !editingExpense.category_id || !editingExpense.date) {
            alert('Please fill in Date, Category and Amount');
            return;
        }

        const expenseToUpdate = {
            date: editingExpense.date,
            category_id: editingExpense.category_id,
            note: editingExpense.description || '',
            amount: parseFloat(editingExpense.amount),
            is_essential: editingExpense.is_essential
        };

        try {
            await onUpdate(editingId, expenseToUpdate);
            setEditingId(null);
        } catch (error) {
            console.error('Failed to update expense:', error);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            onSelectionChange(visibleIds);
        } else {
            onSelectionChange([]);
        }
    };

    const handleSelectOne = (id, checked) => {
        if (checked) {
            onSelectionChange([...selectedIds, id]);
        } else {
            onSelectionChange(selectedIds.filter(sid => sid !== id));
        }
    };

    const getCategory = useCallback((categoryId) => categoryById.get(categoryId), [categoryById]);

    return (
        <div className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-500 dark:from-white dark:to-gray-400 bg-clip-text text-transparent whitespace-nowrap">Daily Expenses</h2>
                    {/* Search Box - Compact design */}
                    <div className="relative flex items-center">
                        <div className={cn(
                            "flex items-center h-8 rounded-lg border transition-all duration-300",
                            isSearchOpen 
                                ? "w-36 bg-white dark:bg-gray-800 border-violet-300 dark:border-violet-700 shadow-sm" 
                                : "w-8 bg-gray-100/80 dark:bg-gray-800/80 border-transparent hover:bg-violet-50 dark:hover:bg-violet-900/30 cursor-pointer"
                        )}>
                            <button
                                onClick={() => {
                                    if (isSearchOpen && searchQuery) {
                                        setSearchQuery('');
                                    }
                                    setIsSearchOpen(!isSearchOpen);
                                }}
                                className={cn(
                                    "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                                    isSearchOpen 
                                        ? "text-violet-600 dark:text-violet-400" 
                                        : "text-gray-400 dark:text-gray-500 hover:text-violet-500"
                                )}
                                title={isSearchOpen ? "Close search" : "Search by amount"}
                            >
                                <Search className="w-3.5 h-3.5" />
                            </button>
                            {isSearchOpen && (
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Amount..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 w-full h-full bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none pr-2"
                                />
                            )}
                        </div>
                        {/* Search result count - show as badge */}
                        {isSearchMode && (
                            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 rounded-md animate-in fade-in duration-200">
                                {filteredExpenses.length}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                    {/* Day Selector - Compact inline design */}
                    <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg p-0.5">
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
                            onClick={handleShowAll}
                            className={cn(
                                "px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 min-w-[50px]",
                                selectedDay === null
                                    ? "bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50"
                            )}
                        >
                            {selectedDay === null ? 'All' : `${selectedDay}${getOrdinalSuffix(selectedDay)}`}
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
                    </div>

                    {selectedIds.length > 0 ? (
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={onBatchDelete}
                                className="flex items-center justify-center gap-2 w-full sm:w-[115px] py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete ({selectedIds.length})
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={onAIEntry}
                                className="flex items-center justify-center gap-2 flex-1 sm:flex-none sm:w-[115px] py-2 text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Sparkles className="w-4 h-4" />
                                Ai add
                            </button>

                            <button
                                onClick={handleAddClick}
                                disabled={isAdding}
                                className={cn(
                                    "flex items-center justify-center gap-2 flex-1 sm:flex-none sm:w-[115px] py-2 text-sm font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
                                    isAdding
                                        ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                                        : "bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                                )}
                            >
                                <Plus className="w-4 h-4" />
                                Manual Add
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div
                ref={containerRef}
                className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                `}} />
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="p-4">
                                {visibleIds.length > 0 && (
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-violet-600 bg-gray-100 border-gray-300 rounded focus:ring-violet-500 dark:focus:ring-violet-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                            onChange={handleSelectAll}
                                            checked={allVisibleSelected}
                                        />
                                    </div>
                                )}
                            </th>
                            <th scope="col" className="px-6 py-3 text-center">Date</th>
                            <th scope="col" className="px-6 py-3 text-center">Category</th>
                            <th scope="col" className="px-6 py-3">Description</th>
                            <th scope="col" className="px-6 py-3 text-center">Essential</th>
                            <th 
                                scope="col" 
                                className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                                onClick={toggleAmountSort}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Amount
                                    {amountSortDirection === 'none' && <ArrowUpDown className="w-4 h-4 text-gray-400" />}
                                    {amountSortDirection === 'asc' && <ArrowUp className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
                                    {amountSortDirection === 'desc' && <ArrowDown className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
                                </div>
                            </th>
                            <th scope="col" className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isAdding && (
                            <tr className="bg-violet-50/30 dark:bg-violet-900/10 border-b border-violet-100 dark:border-violet-900/30 animate-in fade-in slide-in-from-top-4 duration-300">
                                <td className="p-4"></td>
                                <td className="px-6 py-4 text-center">
                                    <input
                                        type="date"
                                        value={newExpense.date}
                                        min={new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0]}
                                        max={new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0]}
                                        onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                                        className="bg-white/80 dark:bg-gray-800/80 border border-violet-100 dark:border-violet-900/30 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 block w-full p-2.5 transition-all outline-none"
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <select
                                        value={newExpense.category_id}
                                        onChange={(e) => setNewExpense({ ...newExpense, category_id: e.target.value })}
                                        className="bg-white/80 dark:bg-gray-800/80 border border-violet-100 dark:border-violet-900/30 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 block w-full p-2.5 transition-all outline-none appearance-none cursor-pointer"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.emoji} {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="text"
                                        placeholder="Description (Optional)"
                                        value={newExpense.description}
                                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                        className="w-full bg-white/80 dark:bg-gray-800/80 border border-violet-100 dark:border-violet-900/30 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 block p-2.5 transition-all outline-none"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center">
                                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setNewExpense({ ...newExpense, is_essential: !newExpense.is_essential })}>
                                            <div className={cn(
                                                "relative w-10 h-5 rounded-full transition-colors duration-300",
                                                newExpense.is_essential ? "bg-violet-600" : "bg-gray-200 dark:bg-gray-700"
                                            )}>
                                                <div className={cn(
                                                    "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 shadow-sm",
                                                    newExpense.is_essential ? "translate-x-5" : "translate-x-0"
                                                )} />
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="relative group inline-block w-full min-w-[120px]">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <span className="text-violet-500 font-bold">$</span>
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={newExpense.amount}
                                            onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                            className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-base font-bold rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 block w-full pl-8 pr-3 py-2 transition-all duration-300 text-right outline-none"
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={handleSaveNew}
                                            className="p-2 text-violet-600 hover:text-white hover:bg-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-600 rounded-xl transition-all duration-300 shadow-sm hover:scale-105 active:scale-95"
                                            title="Save"
                                        >
                                            <Check className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={handleCancelNew}
                                            className="p-2 text-gray-400 hover:text-white hover:bg-red-500 bg-gray-50 dark:bg-gray-800 dark:hover:bg-red-600 rounded-xl transition-all duration-300 shadow-sm hover:scale-105 active:scale-95"
                                            title="Cancel"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {expenses.length === 0 && !isAdding ? (
                            <tr className="bg-white dark:bg-gray-900 border-b dark:border-gray-700">
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                    No expenses found for this month.
                                </td>
                            </tr>
                        ) : (
                            sortedExpenses.map((expense) => {
                                const isEditing = editingId === expense.id;
                                return (
                                    <tr
                                        key={expense.id}
                                        className={cn(
                                            "border-b dark:border-gray-700 transition-colors",
                                            isEditing ? "bg-violet-50/30 dark:bg-violet-900/10 border-violet-100 dark:border-violet-900/30" : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                        )}
                                    >
                                        <td className="w-4 p-4">
                                            {!isEditing && (
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-violet-600 bg-gray-100 border-gray-300 rounded focus:ring-violet-500 dark:focus:ring-violet-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                        checked={selectedIds.includes(expense.id)}
                                                        onChange={(e) => handleSelectOne(expense.id, e.target.checked)}
                                                    />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isEditing ? (
                                                <input
                                                    type="date"
                                                    value={editingExpense.date}
                                                    min={new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0]}
                                                    max={new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0]}
                                                    onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                                                    className="bg-white/80 dark:bg-gray-800/80 border border-violet-100 dark:border-violet-900/30 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 block w-full p-2.5 transition-all outline-none"
                                                />
                                            ) : (
                                                <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                                    {(() => {
                                                        const day = getExpenseDay(expense);
                                                        // Get ordinal suffix for day (1st, 2nd, 3rd, 4th, etc.)
                                                        const getOrdinalSuffix = (n) => {
                                                            const s = ['th', 'st', 'nd', 'rd'];
                                                            const v = n % 100;
                                                            return s[(v - 20) % 10] || s[v] || s[0];
                                                        };
                                                        return day ? `${day}${getOrdinalSuffix(day)}` : '-';
                                                    })()}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isEditing ? (
                                                <select
                                                    value={editingExpense.category_id}
                                                    onChange={(e) => setEditingExpense({ ...editingExpense, category_id: e.target.value })}
                                                    className="bg-white/80 dark:bg-gray-800/80 border border-violet-100 dark:border-violet-900/30 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 block w-full p-2.5 transition-all outline-none appearance-none cursor-pointer"
                                                >
                                                    {categories.map(cat => (
                                                        <option key={cat.id} value={cat.id}>
                                                            {cat.emoji} {cat.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                (() => {
                                                    const cat = getCategory(expense.category_id);
                                                    return (
                                                        <span
                                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                                                            style={{
                                                                backgroundColor: cat ? `${cat.color}20` : undefined,
                                                                color: cat ? cat.color : undefined,
                                                                border: cat ? `1px solid ${cat.color}40` : undefined
                                                            }}
                                                        >
                                                            {cat ? `${cat.emoji} ${cat.name}` : 'Unknown'}
                                                        </span>
                                                    );
                                                })()
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    placeholder="Description (Optional)"
                                                    value={editingExpense.description}
                                                    onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                                                    className="w-full bg-white/80 dark:bg-gray-800/80 border border-violet-100 dark:border-violet-900/30 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 block p-2.5 transition-all outline-none"
                                                />
                                            ) : (
                                                <span className="text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                                                    {expense.note || expense.description || '-'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isEditing ? (
                                                <div className="flex items-center justify-center">
                                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setEditingExpense({ ...editingExpense, is_essential: !editingExpense.is_essential })}>
                                                        <div className={cn(
                                                            "relative w-10 h-5 rounded-full transition-colors duration-300",
                                                            editingExpense.is_essential ? "bg-violet-600" : "bg-gray-200 dark:bg-gray-700"
                                                        )}>
                                                            <div className={cn(
                                                                "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 shadow-sm",
                                                                editingExpense.is_essential ? "translate-x-5" : "translate-x-0"
                                                            )} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={cn(
                                                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                    expense.is_essential
                                                        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                                                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                                )}>
                                                    {expense.is_essential ? 'Yes' : 'No'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {isEditing ? (
                                                <div className="relative group inline-block w-full min-w-[120px]">
                                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                        <span className="text-violet-500 font-bold">$</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={editingExpense.amount}
                                                        onChange={(e) => setEditingExpense({ ...editingExpense, amount: e.target.value })}
                                                        className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-base font-bold rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 block w-full pl-8 pr-3 py-2 transition-all duration-300 text-right outline-none"
                                                    />
                                                </div>
                                            ) : (
                                                <span className={cn(
                                                    "font-medium",
                                                    searchQuery && (Number.isFinite(expense._amount) ? expense._amount : parseFloat(expense.amount)).toFixed(2).includes(searchQuery.trim())
                                                        ? "text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 rounded-lg"
                                                        : "text-gray-900 dark:text-white"
                                                )}>
                                                    {(Number.isFinite(expense._amount) ? expense._amount : parseFloat(expense.amount)).toFixed(2)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            onClick={handleSaveEdit}
                                                            className="p-2 text-violet-600 hover:text-white hover:bg-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-600 rounded-xl transition-all duration-300 shadow-sm hover:scale-105 active:scale-95"
                                                        >
                                                            <Check className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="p-2 text-gray-400 hover:text-white hover:bg-red-500 bg-gray-50 dark:bg-gray-800 dark:hover:bg-red-600 rounded-xl transition-all duration-300 shadow-sm hover:scale-105 active:scale-95"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditClick(expense)}
                                                            className="p-1.5 text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => onDelete(expense.id)}
                                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Custom Premium Scrollbar */}
            {scrollbarState.isVisible && (
                <div className="mt-4 px-4 pb-2">
                    <div
                        ref={trackRef}
                        className="relative h-1.5 w-full bg-gray-100 dark:bg-gray-800/50 rounded-full cursor-pointer group/track"
                        onClick={handleScrollbarClick}
                    >
                        <div
                            className="absolute top-0 bottom-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300 ease-out group-hover/track:from-violet-400 group-hover/track:to-purple-400 shadow-[0_0_10px_rgba(139,92,246,0.3)] cursor-grab active:cursor-grabbing"
                            style={{
                                left: `${scrollbarState.left}%`,
                                width: `${scrollbarState.thumbWidth}%`
                            }}
                            onMouseDown={handleThumbMouseDown}
                        />
                    </div>
                </div>
            )}

            {/* Record count - show at bottom */}
            <div className="flex items-center justify-center mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/30">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                    {filteredExpenses.length} {filteredExpenses.length === 1 ? 'record' : 'records'}
                    {selectedDay !== null && ` on ${selectedDay}${getOrdinalSuffix(selectedDay)}`}
                </span>
            </div>
        </div>
    );
}

// Helper function for ordinal suffix
function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}
