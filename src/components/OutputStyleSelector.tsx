import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleIcon } from './ui/GoogleIcon';
import { AnimatedIcon } from './ui/AnimatedIcon';
import { UI_ICONS, OUTPUT_STYLES_CONFIG } from '@/constants';
import { OutputStyle } from '@/types';

interface OutputStyleSelectorProps {
    value: OutputStyle;
    onChange: (value: OutputStyle) => void;
    className?: string; // Allow passing custom classes for width
}

export const OutputStyleSelector = ({ value, onChange, className }: OutputStyleSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const activeOption = OUTPUT_STYLES_CONFIG.find(o => o.id === value) || OUTPUT_STYLES_CONFIG[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className || ''}`} ref={containerRef}>
            <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-3 pl-4 pr-4 py-2.5 rounded-full w-full
                    border transition-colors duration-200 overflow-hidden
                    ${isOpen 
                        ? 'bg-[#2B2930] border-[#A8C7FA] text-[#E3E3E3]' 
                        : 'bg-[#333537] border-[#444746] text-[#C4C7C5] hover:bg-[#444746]'
                    }
                `}
            >
                {/* Animated Icon */}
                <div className="relative w-4.5 h-4.5 flex items-center justify-center shrink-0">
                    <AnimatedIcon 
                        path={UI_ICONS.tune} 
                        className={`w-full h-full ${isOpen ? 'text-[#A8C7FA]' : 'text-[#C4C7C5]'}`}
                    />
                </div>

                <span className="text-sm font-medium min-w-[80px] text-left flex-1 truncate">
                    {activeOption.label}
                </span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`shrink-0 ${isOpen ? 'text-[#A8C7FA]' : 'text-[#8E918F]'}`}
                >
                    <GoogleIcon path={UI_ICONS.expand_more} className="w-4 h-4" />
                </motion.div>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={`
                            absolute top-full mt-2 
                            w-full min-w-[300px] md:min-w-[380px] md:w-[380px]
                            bg-[#1E1E1E] border border-[#444746] rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col
                            left-0 md:left-auto md:right-0
                        `}
                    >
                        <div className="p-2 grid gap-1 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#444746] scrollbar-track-transparent">
                            {OUTPUT_STYLES_CONFIG.map((option) => {
                                const isActive = value === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => {
                                            onChange(option.id as OutputStyle);
                                            setIsOpen(false);
                                        }}
                                        className={`
                                            group relative flex items-start gap-4 p-3 rounded-xl text-left transition-all duration-200 shrink-0
                                            ${isActive 
                                                ? 'bg-[#004A77] text-[#C2E7FF]' 
                                                : 'text-[#C4C7C5] hover:bg-[#333537] hover:text-[#E3E3E3]'
                                            }
                                        `}
                                    >
                                        {/* Status Indicator Line */}
                                        {isActive && (
                                            <motion.div 
                                                layoutId="activeIndicator"
                                                className="absolute left-0 top-3 bottom-3 w-1 bg-[#A8C7FA] rounded-r-full" 
                                            />
                                        )}

                                        <div className="flex-1 min-w-0 z-10 ml-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-sm font-medium ${isActive ? 'text-[#D3E3FD]' : 'text-[#E3E3E3]'}`}>
                                                    {option.label}
                                                </span>
                                                {isActive && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="text-[#A8C7FA]"
                                                    >
                                                        <GoogleIcon path={UI_ICONS.check} className="w-4 h-4" />
                                                    </motion.div>
                                                )}
                                            </div>
                                            <p className={`text-xs leading-relaxed mb-2 ${isActive ? 'text-[#C2E7FF]/80' : 'text-[#8E918F] group-hover:text-[#C4C7C5]'}`}>
                                                {option.description}
                                            </p>
                                            
                                            {/* Code Preview */}
                                            <div className={`
                                                text-[10px] font-mono p-2.5 rounded-lg border
                                                ${isActive 
                                                    ? 'bg-[#001d35] border-[#A8C7FA]/20 text-[#A8C7FA]' 
                                                    : 'bg-[#131314] border-[#444746] text-[#8E918F] group-hover:border-[#8E918F]/50'
                                                }
                                            `}>
                                                <pre className="whitespace-pre-wrap break-all opacity-90">
                                                    {option.preview}
                                                </pre>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
