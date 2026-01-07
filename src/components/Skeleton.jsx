import { cn } from '../lib/utils';

// Pre-generated bar heights for skeleton chart (generated once at module load)
const SKELETON_BAR_HEIGHTS = [
    35, 42, 28, 55, 18, 47, 33, 60, 25, 51,
    38, 22, 58, 30, 45, 15, 52, 40, 27, 48,
    36, 20, 54, 32, 43, 19, 50, 37, 24, 56, 41
];

export function Skeleton({ className, ...props }) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-md bg-gray-200/60 dark:bg-gray-700/40 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 dark:before:via-white/5 before:to-transparent",
                className
            )}
            {...props}
        />
    );
}

export function SkeletonCircle({ className, ...props }) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-full bg-gray-200/60 dark:bg-gray-700/40 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 dark:before:via-white/5 before:to-transparent",
                className
            )}
            {...props}
        />
    );
}

export function SkeletonLineChart() {
    return (
        <div className="space-y-6 w-full">
            <div className="flex items-end justify-between h-64 gap-1 px-4">
                {SKELETON_BAR_HEIGHTS.map((height, i) => (
                    <Skeleton
                        key={i}
                        className="w-full rounded-t-sm"
                        style={{
                            height: `${height}%`,
                            opacity: 0.3 + (i / 31) * 0.7
                        }}
                    />
                ))}
            </div>
            <div className="flex justify-between px-4">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-12" />
                ))}
            </div>
        </div>
    );
}

export function SkeletonPieChart() {
    return (
        <div className="flex flex-col items-center justify-center space-y-8 py-6">
            <div className="relative">
                <SkeletonCircle className="w-56 h-56" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-white dark:bg-gray-800" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 w-full px-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                        <SkeletonCircle className="w-3 h-3" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SkeletonTable() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center pb-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex space-x-3">
                    <Skeleton className="h-10 w-36 rounded-xl" />
                    <Skeleton className="h-10 w-36 rounded-xl" />
                </div>
                <Skeleton className="h-10 w-56 rounded-xl" />
            </div>
            <div className="space-y-4">
                {/* Table Header */}
                <div className="flex items-center space-x-4 px-2">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 flex-1" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-20" />
                </div>
                {/* Table Rows */}
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 py-4 px-2 border-t border-gray-50 dark:border-gray-700/30">
                        <Skeleton className="h-5 w-5 rounded-md" />
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 flex-1" />
                        <Skeleton className="h-5 w-20" />
                        <div className="flex space-x-2">
                            <SkeletonCircle className="h-8 w-8" />
                            <SkeletonCircle className="h-8 w-8" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
