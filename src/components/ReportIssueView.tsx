// Report Issue View Component - VS Code Inspired Design
// Professional issue reporting with GitHub integration

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import type { ReportIssueData } from '@/types/session';

// Icons
const ICONS = {
    bug: "M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z",
    feature: "M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83V6.31l6-2.12 6 2.12v4.78z",
    question: "M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z",
    docs: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    send: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z",
    github: "M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.24 0-1.16.46-2.11 1.2-2.85a3.8 3.8 0 010-2.94s.95-.26 3.11 1.1a10.2 10.2 0 015.6 0c2.16-1.37 3.11-1.08 3.11-1.08a3.8 3.8 0 01.02 2.92c.74.74 1.2 1.69 1.2 2.85 0 4.06-2.59 4.96-5.05 5.23a1.75 1.75 0 01.5 1.35v2.23c0 .27.2.65.75.55A11 11 0 0012 1.27",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    warning: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
    info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
    label: "M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z",
    low: "M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z",
    high: "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z",
    critical: "M7.41 18.41L12 13.83l4.59 4.58L18 17l-6-6-6 6z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    openInNew: "M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
    chevronRight: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
};

const GITHUB_REPO = 'https://github.com/IRedDragonICY/contextractor';

interface IssueType {
    id: ReportIssueData['type'];
    label: string;
    icon: string;
    description: string;
    color: string;
}

interface Priority {
    id: ReportIssueData['priority'];
    label: string;
    icon: string;
    color: string;
}

const ISSUE_TYPES: IssueType[] = [
    { id: 'bug', label: 'Bug Report', icon: ICONS.bug, description: 'Something is not working correctly', color: '#EF4444' },
    { id: 'feature', label: 'Feature Request', icon: ICONS.feature, description: 'Suggest a new feature or improvement', color: '#8B5CF6' },
    { id: 'question', label: 'Question', icon: ICONS.question, description: 'Ask a question about usage', color: '#3B82F6' },
    { id: 'documentation', label: 'Documentation', icon: ICONS.docs, description: 'Improve or fix documentation', color: '#10B981' },
];

const PRIORITIES: Priority[] = [
    { id: 'low', label: 'Low', icon: ICONS.low, color: '#6B7280' },
    { id: 'medium', label: 'Medium', icon: ICONS.info, color: '#F59E0B' },
    { id: 'high', label: 'High', icon: ICONS.high, color: '#EF4444' },
    { id: 'critical', label: 'Critical', icon: ICONS.critical, color: '#DC2626' },
];

const LABEL_OPTIONS = [
    'ui', 'performance', 'crash', 'documentation', 
    'enhancement', 'accessibility', 'security', 'mobile'
];

interface ReportIssueViewProps {
    onClose?: () => void;
}

export const ReportIssueView: React.FC<ReportIssueViewProps> = ({ onClose }) => {
    const [issueType, setIssueType] = useState<ReportIssueData['type']>('bug');
    const [priority, setPriority] = useState<ReportIssueData['priority']>('medium');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const selectedType = ISSUE_TYPES.find(t => t.id === issueType);
    const selectedPriority = PRIORITIES.find(p => p.id === priority);

    // Generate issue template
    const generateIssueBody = useMemo(() => {
        const typeEmoji = {
            'bug': '🐛',
            'feature': '✨',
            'question': '❓',
            'documentation': '📚'
        };

        const priorityEmoji = {
            'low': '🔵',
            'medium': '🟡',
            'high': '🟠',
            'critical': '🔴'
        };

        return `## ${typeEmoji[issueType]} ${selectedType?.label}

### Description
${description || '_No description provided_'}

### Priority
${priorityEmoji[priority]} **${selectedPriority?.label}**

### Labels
${selectedLabels.length > 0 ? selectedLabels.map(l => `\`${l}\``).join(', ') : '_No labels selected_'}

---
### Environment
- **App Version**: 1.0.0
- **Platform**: ${typeof window !== 'undefined' ? navigator.platform : 'Unknown'}
- **User Agent**: ${typeof window !== 'undefined' ? navigator.userAgent.split(' ').slice(-2).join(' ') : 'Unknown'}

---
_This issue was created using the Contextractor in-app issue reporter._
`;
    }, [issueType, selectedType, description, priority, selectedPriority, selectedLabels]);

    const handleToggleLabel = (label: string) => {
        setSelectedLabels(prev => 
            prev.includes(label) 
                ? prev.filter(l => l !== label)
                : [...prev, label]
        );
    };

    const handleSubmit = async () => {
        if (!title.trim()) return;

        setIsSubmitting(true);
        
        // Build GitHub issue URL with pre-filled data
        const issueLabels = [issueType, ...selectedLabels].join(',');
        const issueUrl = new URL(`${GITHUB_REPO}/issues/new`);
        issueUrl.searchParams.set('title', title);
        issueUrl.searchParams.set('body', generateIssueBody);
        issueUrl.searchParams.set('labels', issueLabels);

        try {
            // Open GitHub in new tab
            window.open(issueUrl.toString(), '_blank', 'noopener,noreferrer');
            setSubmitStatus('success');
            
            // Reset form after success
            setTimeout(() => {
                setTitle('');
                setDescription('');
                setSelectedLabels([]);
                setSubmitStatus('idle');
            }, 3000);
        } catch {
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = title.trim().length > 0;

    return (
        <div className="h-full flex flex-col bg-[var(--theme-bg)] text-[var(--theme-text-primary)] font-sans">
            {/* Header - VS Code Style */}
            <div className="flex-shrink-0 h-12 px-4 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-bg-secondary)]">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-[var(--theme-text-tertiary)]">ISSUE REPORTER</span>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
                    >
                        <GoogleIcon path={ICONS.close} className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Content - Split View Layout */}
            <div className="flex-1 overflow-hidden flex">
                {/* Form Section */}
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                    <div className="p-6 max-w-3xl mx-auto space-y-8">
                        
                        {/* Issue Type - Segmented Control Style */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wide">
                                Issue Type
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {ISSUE_TYPES.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setIssueType(type.id)}
                                        className={`
                                            flex flex-col items-center justify-center p-3 rounded-md border transition-all
                                            ${issueType === type.id 
                                                ? 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)] text-[var(--theme-primary)]' 
                                                : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)] hover:border-[var(--theme-border-subtle)]'
                                            }
                                        `}
                                    >
                                        <GoogleIcon path={type.icon} className="w-5 h-5 mb-2" />
                                        <span className="text-xs font-medium">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title Input - Minimalist */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wide">
                                Title <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Application crashes when opening large files"
                                className="w-full px-3 py-2 bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] rounded-sm text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-colors"
                            />
                        </div>

                        {/* Description - Code Editor Style */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wide">
                                Description
                            </label>
                            <div className="relative">
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe the issue in detail..."
                                    rows={8}
                                    className="w-full px-3 py-2 bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] rounded-sm text-sm font-mono text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-colors resize-y"
                                />
                                <div className="absolute bottom-2 right-2 text-[10px] text-[var(--theme-text-tertiary)]">
                                    Markdown supported
                                </div>
                            </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Priority */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wide">
                                    Priority
                                </label>
                                <div className="flex flex-col gap-1">
                                    {PRIORITIES.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setPriority(p.id)}
                                            className={`
                                                flex items-center px-3 py-2 rounded-sm text-sm transition-colors
                                                ${priority === p.id 
                                                    ? 'bg-[var(--theme-surface-hover)] text-[var(--theme-text-primary)] font-medium' 
                                                    : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]'
                                                }
                                            `}
                                        >
                                            <div 
                                                className="w-2 h-2 rounded-full mr-3"
                                                style={{ backgroundColor: p.color }}
                                            />
                                            {p.label}
                                            {priority === p.id && (
                                                <GoogleIcon path={ICONS.check} className="w-4 h-4 ml-auto text-[var(--theme-primary)]" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Labels */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wide">
                                    Labels
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {LABEL_OPTIONS.map((label) => (
                                        <button
                                            key={label}
                                            onClick={() => handleToggleLabel(label)}
                                            className={`
                                                px-2.5 py-1 rounded-full text-xs border transition-all
                                                ${selectedLabels.includes(label)
                                                    ? 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)] text-[var(--theme-primary)]'
                                                    : 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:border-[var(--theme-text-secondary)]'
                                                }
                                            `}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Sidebar - VS Code Minimap/Sidebar Style */}
                <div className="hidden lg:block w-80 border-l border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] p-4 overflow-y-auto">
                    <div className="sticky top-0">
                        <h3 className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wide mb-4">
                            Preview
                        </h3>
                        
                        <div className="space-y-4">
                            {/* Preview Card */}
                            <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-md p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--theme-border-subtle)]">
                                    <GoogleIcon path={ICONS.github} className="w-4 h-4 text-[var(--theme-text-primary)]" />
                                    <span className="text-xs text-[var(--theme-text-secondary)]">New Issue</span>
                                </div>
                                
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-xs text-[var(--theme-text-tertiary)] mb-1">Title</div>
                                        <div className="text-sm font-medium text-[var(--theme-text-primary)] break-words">
                                            {title || <span className="text-[var(--theme-text-muted)] italic">No title...</span>}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <span 
                                            className="px-2 py-0.5 rounded text-[10px] font-medium border"
                                            style={{ 
                                                borderColor: `${selectedType?.color}40`,
                                                color: selectedType?.color,
                                                backgroundColor: `${selectedType?.color}10`
                                            }}
                                        >
                                            {selectedType?.label}
                                        </span>
                                        <span 
                                            className="px-2 py-0.5 rounded text-[10px] font-medium border"
                                            style={{ 
                                                borderColor: `${selectedPriority?.color}40`,
                                                color: selectedPriority?.color,
                                                backgroundColor: `${selectedPriority?.color}10`
                                            }}
                                        >
                                            {selectedPriority?.label}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="p-3 rounded bg-[var(--theme-surface-hover)] border border-[var(--theme-border-subtle)]">
                                <div className="flex gap-2">
                                    <GoogleIcon path={ICONS.info} className="w-4 h-4 text-[var(--theme-primary)] flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
                                        Submitting this form will open a new issue in the GitHub repository. You'll be able to review and edit before finalizing.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer - Status Bar Style */}
            <div className="flex-shrink-0 h-14 px-6 border-t border-[var(--theme-border)] bg-[var(--theme-bg)] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <a 
                        href={`${GITHUB_REPO}/issues`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] flex items-center gap-1.5 transition-colors"
                    >
                        <GoogleIcon path={ICONS.github} className="w-3.5 h-3.5" />
                        View existing issues
                    </a>
                </div>

                <div className="flex items-center gap-3">
                    <AnimatePresence>
                        {submitStatus === 'success' && (
                            <motion.span
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-xs text-[var(--theme-success)] flex items-center gap-1.5 mr-2"
                            >
                                <GoogleIcon path={ICONS.check} className="w-3.5 h-3.5" />
                                Opened in GitHub
                            </motion.span>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid || isSubmitting}
                        className={`
                            flex items-center gap-2 px-4 py-1.5 rounded-sm text-sm font-medium transition-all
                            ${isFormValid 
                                ? 'bg-[var(--theme-button-filled)] text-white hover:bg-[var(--theme-button-filled-hover)]' 
                                : 'bg-[var(--theme-surface-hover)] text-[var(--theme-text-muted)] cursor-not-allowed'
                            }
                        `}
                    >
                        {isSubmitting ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <GoogleIcon path={ICONS.send} className="w-3.5 h-3.5" />
                        )}
                        Submit Issue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportIssueView;
