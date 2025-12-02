'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UI_ICONS } from '@/constants';
import { GoogleIcon } from './GoogleIcon';

interface AnimatedIconProps {
    path: string;
    className?: string;
    style?: React.CSSProperties;
}

export const AnimatedIcon = ({ path, className = "w-5 h-5", style }: AnimatedIconProps) => {
    const [isHovered, setIsHovered] = useState(false);

    // Helper to detect icon type based on path string
    const isTune = path === UI_ICONS.tune;
    const isCopy = path === UI_ICONS.copy;
    const isCheck = path === UI_ICONS.check;

    if (isTune) {
        // Settings / Tune Animation: Sliders moving left/right
        return (
            <motion.div 
                className={className}
                style={style}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
            >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    {/* Track 1 */}
                    <line x1="3" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2"/>
                    <motion.circle 
                        cx="8" cy="7" r="3" fill="currentColor"
                        animate={{ cx: isHovered ? 17 : 8 }}
                        transition={{ type: "spring", stiffness: 250, damping: 20 }}
                    />
                    
                    {/* Track 2 */}
                    <line x1="3" y1="17" x2="21" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2"/>
                    <motion.circle 
                        cx="16" cy="17" r="3" fill="currentColor"
                        animate={{ cx: isHovered ? 7 : 16 }}
                        transition={{ type: "spring", stiffness: 250, damping: 20, delay: 0.05 }}
                    />
                </svg>
            </motion.div>
        );
    }

    if (isCopy) {
        // Copy Animation: "Battery fill" concept (filling up content)
        return (
            <motion.div 
                className={className}
                style={style}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
            >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    {/* Back page */}
                    <path d="M16 3H4V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                    
                    {/* Front page outline */}
                    <rect x="8" y="7" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                    
                    {/* "Filling" content - animated like a battery charging */}
                    <motion.rect 
                        x="10" y="9" width="8" height="10" rx="1" fill="currentColor"
                        initial={{ scaleY: 0, originY: 1, opacity: 0 }}
                        animate={{ scaleY: isHovered ? 1 : 0, opacity: isHovered ? 1 : 0 }}
                        transition={{ duration: 0.4, ease: "backOut" }}
                    />
                </svg>
            </motion.div>
        );
    }

    if (isCheck) {
        // Check Animation: Drawing the checkmark
        return (
            <motion.div className={className} style={style}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <motion.path 
                        d="M20 6L9 17L4 12" 
                        stroke="currentColor" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                </svg>
            </motion.div>
        );
    }

    // Default static icon for others, wrapped in hover scale for consistency
    return (
        <motion.div 
            className={className} 
            style={style}
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
            <GoogleIcon path={path} className="w-full h-full" />
        </motion.div>
    );
};







