import React from 'react';
import { motion } from 'framer-motion';
import { GoogleButton } from './ui/GoogleButton';
import { GoogleIcon } from './ui/GoogleIcon';
import { UI_ICONS } from '@/constants';
import { SecurityIssue } from '@/lib/security';

interface SecurityWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: () => void;
    issues: SecurityIssue[];
}

export const SecurityWarningModal = ({ isOpen, onClose, onProceed, issues }: SecurityWarningModalProps) => {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-[var(--theme-overlay)] backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[var(--theme-surface)] rounded-[28px] w-full max-w-lg shadow-2xl border border-[var(--theme-error)]/30 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--theme-error)]/10 flex items-center justify-center mb-4">
                        <GoogleIcon path={UI_ICONS.warning} className="w-8 h-8 text-[var(--theme-error)]" />
                    </div>
                    
                    <h3 className="text-xl font-medium text-[var(--theme-text-primary)] mb-2">
                        Security Warning
                    </h3>
                    
                    <p className="text-sm text-[var(--theme-text-secondary)] mb-6">
                        Potential secrets or sensitive files detected. Are you sure you want to copy this content?
                    </p>

                    <div className="w-full bg-[var(--theme-surface-hover)] rounded-xl border border-[var(--theme-border)] p-4 mb-6 max-h-[200px] overflow-y-auto text-left">
                        {issues.map((issue, idx) => (
                            <div key={idx} className="flex items-start gap-3 mb-3 last:mb-0">
                                <GoogleIcon path={UI_ICONS.warning} className="w-4 h-4 text-[var(--theme-error)] shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-[var(--theme-text-primary)]">
                                        {issue.fileName}
                                    </p>
                                    <p className="text-xs text-[var(--theme-text-tertiary)] font-mono break-all">
                                        {issue.type === 'filename' 
                                            ? `Blocked filename pattern: ${issue.match}`
                                            : `Sensitive content at line ${issue.line}: ${issue.match.substring(0, 20)}...`
                                        }
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 w-full">
                        <GoogleButton variant="tonal" className="flex-1" onClick={onClose}>
                            Cancel
                        </GoogleButton>
                        <GoogleButton 
                            variant="filled" 
                            className="flex-1 bg-[var(--theme-error)] text-white hover:brightness-90 border-none" 
                            onClick={onProceed}
                        >
                            Copy Anyway
                        </GoogleButton>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
