'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const AnimatedLogo = () => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div 
            className="relative w-10 h-10 flex items-center justify-center bg-[#333537] rounded-xl overflow-hidden cursor-pointer"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <AnimatePresence mode="wait">
                {!isHovered ? (
                    // State 1: Document Icon (The input)
                    <motion.svg
                        key="document"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                        transition={{ duration: 0.3 }}
                    >
                        <path
                            d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
                            stroke="#A8C7FA"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="rgba(168, 199, 250, 0.1)"
                        />
                        <path d="M14 2V8H20" stroke="#A8C7FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 13H8" stroke="#A8C7FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 17H8" stroke="#A8C7FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 9H9H8" stroke="#A8C7FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </motion.svg>
                ) : (
                    // State 2: Token/Code Icon (The output/extraction)
                    <motion.svg
                        key="tokens"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Brackets representing code/tokens */}
                        <path d="M7 8L3 12L7 16" stroke="#A8C7FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17 8L21 12L17 16" stroke="#A8C7FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        
                        {/* Abstract "tokens" floating in the middle */}
                        <motion.circle 
                            cx="12" cy="12" r="2" 
                            fill="#A8C7FA"
                            initial={{ scale: 0 }}
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        />
                        <motion.rect
                            x="10" y="6" width="4" height="2" rx="1"
                            fill="#A8C7FA"
                            opacity="0.5"
                            initial={{ y: 0 }}
                            animate={{ y: -2 }}
                            transition={{ repeat: Infinity, repeatType: "reverse", duration: 1 }}
                        />
                        <motion.rect
                            x="10" y="16" width="4" height="2" rx="1"
                            fill="#A8C7FA"
                            opacity="0.5"
                            initial={{ y: 0 }}
                            animate={{ y: 2 }}
                            transition={{ repeat: Infinity, repeatType: "reverse", duration: 1 }}
                        />
                    </motion.svg>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
