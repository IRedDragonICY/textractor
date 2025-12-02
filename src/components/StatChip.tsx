import React from 'react';

export const StatChip = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex flex-col items-center justify-center bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-3 min-w-[90px] flex-1">
        <span className="text-[var(--theme-primary)] text-xl font-medium mb-0.5">{value}</span>
        <span className="text-[var(--theme-text-secondary)] text-[10px] font-medium uppercase tracking-wide">{label}</span>
    </div>
);

