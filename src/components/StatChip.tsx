import React from 'react';

export const StatChip = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex flex-col items-center justify-center bg-[#1E1E1E] border border-[#444746] rounded-2xl p-3 min-w-[90px] flex-1">
        <span className="text-[#A8C7FA] text-xl font-medium mb-0.5">{value}</span>
        <span className="text-[#C4C7C5] text-[10px] font-medium uppercase tracking-wide">{label}</span>
    </div>
);

