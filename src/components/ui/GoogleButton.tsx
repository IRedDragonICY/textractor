import React from 'react';
import { motion } from 'framer-motion';
import { GoogleButtonProps } from '@/types';
import { AnimatedIcon } from './AnimatedIcon';

export const GoogleButton = React.memo(({
    children, onClick, variant = 'filled', icon, disabled = false, className = '', type = 'button', active = false
}: GoogleButtonProps) => {
    const base = "relative inline-flex items-center justify-center overflow-hidden font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0";
    const variants: Record<string, string> = {
        filled: "bg-[#A8C7FA] text-[#062E6F] hover:bg-[#8AB4F8] hover:shadow-md active:shadow-none rounded-full px-6 py-2.5 text-sm shadow-sm",
        tonal: "bg-[#333537] text-[#A8C7FA] hover:bg-[#444746] rounded-xl px-4 py-2 text-sm border border-[#444746]",
        text: "text-[#A8C7FA] hover:bg-[#A8C7FA]/10 rounded-full px-4 py-2 text-sm",
        outlined: "border border-[#8E918F] text-[#C4C7C5] hover:bg-[#333537] hover:text-[#E3E3E3] rounded-full px-6 py-2.5 text-sm",
        icon: `rounded-full p-2 hover:bg-[#444746] ${active ? 'bg-[#333537] text-[#A8C7FA]' : 'text-[#C4C7C5]'}`
    };

    return (
        <motion.button
            whileTap={!disabled ? { scale: 0.96 } : {}}
            onClick={onClick}
            disabled={disabled}
            type={type}
            className={`${base} ${variants[variant]} ${className}`}
        >
            {icon && (
                <div className={`relative flex items-center justify-center ${children ? 'mr-2' : ''} ${variant === 'fab' ? 'w-6 h-6' : 'w-5 h-5'}`}>
                    <AnimatedIcon path={icon} className="w-full h-full" />
                </div>
            )}
            {children}
        </motion.button>
    );
});
GoogleButton.displayName = 'GoogleButton';
