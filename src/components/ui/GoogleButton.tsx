import React from 'react';
import { motion } from 'framer-motion';
import { GoogleButtonProps } from '@/types';
import { AnimatedIcon } from './AnimatedIcon';

export const GoogleButton = React.memo(({
    children, onClick, variant = 'filled', icon, disabled = false, className = '', type = 'button', active = false
}: GoogleButtonProps) => {
    const base = "relative inline-flex items-center justify-center overflow-hidden font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0";
    const variants: Record<string, string> = {
        filled: "bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)] hover:brightness-110 hover:shadow-md active:shadow-none rounded-full px-6 py-2.5 text-sm shadow-sm",
        tonal: "bg-[var(--theme-surface-elevated)] text-[var(--theme-primary)] hover:bg-[var(--theme-surface-hover)] rounded-xl px-4 py-2 text-sm border border-[var(--theme-border)]",
        text: "text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 rounded-full px-4 py-2 text-sm",
        outlined: "border border-[var(--theme-text-tertiary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-elevated)] hover:text-[var(--theme-text-primary)] rounded-full px-6 py-2.5 text-sm",
        icon: `rounded-full p-2 hover:bg-[var(--theme-surface-hover)] ${active ? 'bg-[var(--theme-surface-elevated)] text-[var(--theme-primary)]' : 'text-[var(--theme-text-secondary)]'}`
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
