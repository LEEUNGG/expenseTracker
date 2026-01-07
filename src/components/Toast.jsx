import { useState, useCallback, createContext, useContext } from 'react';
import { X, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success', duration = 3000) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => {
            const next = [...prev, { id, message, type }];
            if (next.length > 3) {
                return next.slice(-3); // Keep only the latest 3
            }
            return next;
        });

        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const getToastStyles = (type) => {
        switch (type) {
            case 'error':
                return {
                    icon: AlertCircle,
                    iconBg: 'bg-red-100 dark:bg-red-900/30',
                    iconColor: 'text-red-600 dark:text-red-400',
                    progressColor: 'text-red-500 dark:text-red-400'
                };
            case 'warning':
                return {
                    icon: AlertCircle,
                    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
                    iconColor: 'text-amber-600 dark:text-amber-400',
                    progressColor: 'text-amber-500 dark:text-amber-400'
                };
            case 'success':
            default:
                return {
                    icon: CheckCircle,
                    iconBg: 'bg-green-100 dark:bg-green-900/30',
                    iconColor: 'text-green-600 dark:text-green-400',
                    progressColor: 'text-green-500 dark:text-green-400'
                };
        }
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-3">
                {toasts.map((toast) => {
                    const styles = getToastStyles(toast.type);
                    const Icon = styles.icon;
                    return (
                        <div
                            key={toast.id}
                            className={cn(
                                "flex items-start gap-4 px-4 py-3 bg-white dark:bg-gray-800",
                                "shadow-2xl rounded-2xl border border-gray-100 dark:border-gray-700",
                                "animate-toast-in",
                                "w-[320px] max-w-[calc(100vw-3rem)] h-auto"
                            )}
                        >
                            <div className={cn(
                                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5",
                                styles.iconBg
                            )}>
                                <Icon className={cn("w-5 h-5", styles.iconColor)} />
                            </div>
                            <div className="flex-1 min-w-0 py-1">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 break-words leading-relaxed">
                                    {toast.message}
                                </p>
                            </div>
                            <div className="flex-shrink-0 relative flex items-center justify-center mt-0.5">
                                <svg className="w-8 h-8 -rotate-90">
                                    <circle
                                        cx="16"
                                        cy="16"
                                        r="14"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="text-gray-100 dark:text-gray-700"
                                    />
                                    <circle
                                        cx="16"
                                        cy="16"
                                        r="14"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeDasharray="100"
                                        strokeDashoffset="0"
                                        pathLength="100"
                                        className={cn("animate-toast-progress", styles.progressColor)}
                                    />
                                </svg>
                                <button
                                    onClick={() => removeToast(toast.id)}
                                    className="absolute inset-0 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
