import React from 'react';

export const SkeletonLoader: React.FC = () => {
    return (
        <div className="min-h-screen bg-stone-50 animate-pulse font-sans">
            {/* Navbar Skeleton */}
            <div className="h-20 border-b border-stone-200 bg-white/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                    <div className="w-40 h-8 bg-stone-200 rounded"></div>
                    <div className="hidden md:flex gap-6">
                        <div className="w-20 h-4 bg-stone-200 rounded"></div>
                        <div className="w-20 h-4 bg-stone-200 rounded"></div>
                        <div className="w-20 h-4 bg-stone-200 rounded"></div>
                    </div>
                </div>
            </div>

            {/* Hero Skeleton */}
            <div className="h-[60vh] bg-stone-200 w-full relative">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-stone-300 border-t-stone-400 rounded-full animate-spin"></div>
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Title */}
                <div className="w-64 h-8 bg-stone-200 rounded mb-8 mx-auto"></div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm h-96">
                            <div className="h-48 bg-stone-200"></div>
                            <div className="p-6 space-y-4">
                                <div className="w-3/4 h-6 bg-stone-200 rounded"></div>
                                <div className="w-1/2 h-4 bg-stone-200 rounded"></div>
                                <div className="flex justify-between mt-6">
                                    <div className="w-20 h-8 bg-stone-200 rounded"></div>
                                    <div className="w-24 h-8 bg-stone-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
