'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { GoogleIcon } from './ui/GoogleIcon';
import { AnimatedIcon } from './ui/AnimatedIcon';
import { GoogleButton } from './ui/GoogleButton';
import { UI_ICONS_MAP } from '@/lib/icon-mapping';
import { DEFAULT_PROMPT_TEMPLATES, TEMPLATE_PLACEHOLDER } from '@/constants/templates';
import type { PromptTemplate } from '@/types';
import { useTemplateActions, useTemplateState } from '@/store';

interface PromptTemplateSelectorProps {
    className?: string;
}

type TemplateFormState = {
    name: string;
    description: string;
    category: PromptTemplate['category'];
    template: string;
};

const CATEGORY_LABELS: Record<PromptTemplate['category'], string> = {
    analysis: 'Analysis',
    refactor: 'Refactoring & Conversion',
    security: 'Security',
    doc: 'Documentation',
    test: 'Testing',
    custom: 'Custom',
};

const categoryOrder: PromptTemplate['category'][] = [
    'analysis',
    'refactor',
    'security',
    'doc',
    'test',
    'custom',
];

const initialForm: TemplateFormState = {
    name: '',
    description: '',
    category: 'custom',
    template: TEMPLATE_PLACEHOLDER,
};

export const PromptTemplateSelector: React.FC<PromptTemplateSelectorProps> = ({ className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [formState, setFormState] = useState<TemplateFormState>(initialForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const { customTemplates, selectedTemplateId } = useTemplateState();
    const { setSelectedTemplate, addCustomTemplate, updateCustomTemplate, removeCustomTemplate } = useTemplateActions();

    const templates = useMemo(
        () => [...DEFAULT_PROMPT_TEMPLATES, ...customTemplates],
        [customTemplates]
    );

    const groupedTemplates = useMemo(() => {
        const groups: Record<PromptTemplate['category'], PromptTemplate[]> = {
            analysis: [],
            refactor: [],
            security: [],
            doc: [],
            test: [],
            custom: [],
        };
        templates.forEach((tpl) => {
            groups[tpl.category]?.push(tpl);
        });
        return groups;
    }, [templates]);

    const activeTemplate = useMemo(
        () => templates.find((tpl) => tpl.id === selectedTemplateId) ?? null,
        [templates, selectedTemplateId]
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectTemplate = (id: string | null) => {
        setSelectedTemplate(id);
        setIsOpen(false);
    };

    const resetForm = () => {
        setFormState(initialForm);
        setEditingId(null);
        setFormError(null);
    };

    const handleSaveTemplate = () => {
        if (!formState.name.trim() || !formState.description.trim()) {
            setFormError('Name and description are required.');
            return;
        }

        if (!formState.template.includes(TEMPLATE_PLACEHOLDER)) {
            setFormError(`Template must include the ${TEMPLATE_PLACEHOLDER} placeholder.`);
            return;
        }

        const payload: PromptTemplate = {
            id: editingId ?? `custom-${Date.now()}`,
            name: formState.name.trim(),
            description: formState.description.trim(),
            category: formState.category,
            template: formState.template.trim(),
        };

        if (editingId) {
            updateCustomTemplate(editingId, payload);
        } else {
            addCustomTemplate(payload);
        }

        setSelectedTemplate(payload.id);
        resetForm();
        setIsManageOpen(false);
    };

    const handleEditTemplate = (template: PromptTemplate) => {
        setFormState({
            name: template.name,
            description: template.description,
            category: template.category,
            template: template.template,
        });
        setEditingId(template.id);
        setFormError(null);
        setIsManageOpen(true);
    };

    const handleRemoveTemplate = (id: string) => {
        removeCustomTemplate(id);
        if (selectedTemplateId === id) {
            setSelectedTemplate(null);
        }
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-3 px-4 py-2 rounded-full w-full
                    min-h-[52px] max-h-[52px]
                    border transition-colors duration-200 overflow-hidden
                    ${isOpen 
                        ? 'bg-[var(--theme-surface-hover)] border-[var(--theme-primary)] text-[var(--theme-text-primary)]' 
                        : 'bg-[var(--theme-surface-elevated)] border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]'
                    }
                `}
            >
                <div className="relative w-4.5 h-4.5 flex items-center justify-center shrink-0">
                    <AnimatedIcon 
                        icon={UI_ICONS_MAP.code} 
                        className={`w-full h-full ${isOpen ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-secondary)]'}`}
                    />
                </div>

                <div className="flex-1 min-w-0 text-left leading-tight">
                    <p className="text-[11px] uppercase tracking-widest text-[var(--theme-text-tertiary)]">Template</p>
                    <p className="text-sm font-semibold text-[var(--theme-text-primary)] truncate">
                        {activeTemplate ? activeTemplate.name : 'None (Raw)'}
                    </p>
                    <p className="text-[11px] text-[var(--theme-text-tertiary)] truncate">
                        {activeTemplate ? activeTemplate.description : 'Copy code without a wrapper'}
                    </p>
                </div>

                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`shrink-0 ${isOpen ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-tertiary)]'}`}
                >
                    <GoogleIcon icon={UI_ICONS_MAP.expand_more} className="w-4 h-4" />
                </motion.div>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute top-full mt-2 w-full min-w-[320px] md:w-[360px] bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden z-50"
                    >
                        <div className="px-4 py-3 border-b border-[var(--theme-border)] bg-[var(--theme-surface-elevated)] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AnimatedIcon icon={UI_ICONS_MAP.tune} className="w-4 h-4 text-[var(--theme-primary)]" />
                                <span className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wider">Smart Prompt Templates</span>
                            </div>
                            <button
                                onClick={() => {
                                    setIsManageOpen(true);
                                    setIsOpen(false);
                                }}
                                className="text-[11px] px-2 py-1 rounded-lg border border-[var(--theme-border)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] text-[var(--theme-text-secondary)] transition-colors"
                            >
                                Manage
                            </button>
                        </div>

                        <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--theme-border)] scrollbar-track-transparent">
                            <button
                                onClick={() => handleSelectTemplate(null)}
                                className={`
                                    w-full flex items-start gap-3 p-3 rounded-xl transition-colors text-left
                                    ${selectedTemplateId === null ? 'bg-[var(--theme-primary)]/15 text-[var(--theme-primary)]' : 'hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)]'}
                                `}
                            >
                                {selectedTemplateId === null && (
                                    <motion.div 
                                        layoutId="templateActiveIndicator"
                                        className="w-1 h-8 bg-[var(--theme-primary)] rounded-full" 
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm font-medium ${selectedTemplateId === null ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-primary)]'}`}>
                                            None (Raw)
                                        </span>
                                    </div>
                                    <p className={`text-[11px] leading-relaxed ${selectedTemplateId === null ? 'text-[var(--theme-primary)]/80' : 'text-[var(--theme-text-tertiary)]'}`}>
                                        Copy the combined code without any wrapper text.
                                    </p>
                                </div>
                            </button>

                            {categoryOrder.map((cat) => {
                                const templatesForCategory = groupedTemplates[cat];
                                if (!templatesForCategory || templatesForCategory.length === 0) return null;
                                return (
                                    <div key={cat} className="space-y-1">
                                        <div className="flex items-center gap-2 px-1">
                                            <GoogleIcon icon={UI_ICONS_MAP.code} className="w-3.5 h-3.5 text-[var(--theme-text-tertiary)]" />
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
                                                {CATEGORY_LABELS[cat]}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            {templatesForCategory.map((template) => {
                                                const isActive = selectedTemplateId === template.id;
                                                return (
                                                    <button
                                                        key={template.id}
                                                        onClick={() => handleSelectTemplate(template.id)}
                                                        className={`
                                                            group relative w-full p-3 rounded-xl text-left transition-all duration-200 flex items-start gap-3
                                                            ${isActive ? 'bg-[var(--theme-primary)]/15 text-[var(--theme-primary)]' : 'hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)]'}
                                                        `}
                                                    >
                                                        {isActive && (
                                                            <motion.div 
                                                                layoutId="templateActiveIndicator"
                                                                className="absolute left-0 top-3 bottom-3 w-1 bg-[var(--theme-primary)] rounded-r-full" 
                                                            />
                                                        )}
                                                        <div className="flex-1 min-w-0 z-10 ml-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className={`text-sm font-medium ${isActive ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-primary)]'}`}>
                                                                    {template.name}
                                                                </span>
                                                                {isActive && (
                                                                    <motion.div
                                                                        initial={{ scale: 0 }}
                                                                        animate={{ scale: 1 }}
                                                                        className="text-[var(--theme-primary)]"
                                                                    >
                                                                        <GoogleIcon icon={UI_ICONS_MAP.check} className="w-4 h-4" />
                                                                    </motion.div>
                                                                )}
                                                            </div>
                                                            <p className={`text-[11px] leading-relaxed mt-0.5 ${isActive ? 'text-[var(--theme-primary)]/80' : 'text-[var(--theme-text-tertiary)] group-hover:text-[var(--theme-text-secondary)]'}`}>
                                                                {template.description}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="px-4 py-2 border-t border-[var(--theme-border)] bg-[var(--theme-bg)] text-[10px] text-[var(--theme-text-muted)] flex items-center justify-between">
                            <span>Apply templates only when copying or exporting to save performance.</span>
                            <GoogleIcon icon={UI_ICONS_MAP.code} className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Manage Templates Modal */}
            <AnimatePresence>
                {isManageOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-[var(--theme-overlay)] backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setIsManageOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[var(--theme-surface-elevated)] rounded-[24px] p-6 w-full max-w-2xl shadow-2xl border border-[var(--theme-border)] space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AnimatedIcon icon={UI_ICONS_MAP.tune} className="w-4 h-4 text-[var(--theme-primary)]" />
                                    <h3 className="text-lg text-[var(--theme-text-primary)] font-semibold">
                                        Manage Templates
                                    </h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsManageOpen(false);
                                        resetForm();
                                    }}
                                    className="p-2 rounded-lg hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-tertiary)]"
                                >
                                    <GoogleIcon icon={UI_ICONS_MAP.close} className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-[var(--theme-text-tertiary)] uppercase tracking-wider">
                                        Name
                                    </label>
                                    <input
                                        value={formState.name}
                                        onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g., My Team Prompt"
                                        className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)] outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-[var(--theme-text-tertiary)] uppercase tracking-wider">
                                        Category
                                    </label>
                                    <select
                                        value={formState.category}
                                        onChange={(e) => setFormState((prev) => ({ ...prev, category: e.target.value as PromptTemplate['category'] }))}
                                        className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)] outline-none"
                                    >
                                        {categoryOrder.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {CATEGORY_LABELS[cat]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-[var(--theme-text-tertiary)] uppercase tracking-wider">
                                    Description
                                </label>
                                <input
                                    value={formState.description}
                                    onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder="What does this template do?"
                                    className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)] outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-[var(--theme-text-tertiary)] uppercase tracking-wider flex items-center justify-between">
                                    <span>Template Body</span>
                                    <span className="text-[10px] text-[var(--theme-text-muted)]">Must include {TEMPLATE_PLACEHOLDER}</span>
                                </label>
                                <textarea
                                    value={formState.template}
                                    onChange={(e) => setFormState((prev) => ({ ...prev, template: e.target.value }))}
                                    rows={6}
                                    className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)] outline-none resize-none"
                                />
                            </div>

                            {formError && (
                                <div className="flex items-center gap-2 text-[var(--theme-error)] text-sm bg-[var(--theme-error)]/10 border border-[var(--theme-error)]/40 rounded-lg px-3 py-2">
                                    <GoogleIcon icon={UI_ICONS_MAP.warning} className="w-4 h-4" />
                                    {formError}
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-[10px] text-[var(--theme-text-tertiary)]">
                                    <GoogleIcon icon={UI_ICONS_MAP.code} className="w-3.5 h-3.5" />
                                    <span>Custom templates sync locally via browser storage.</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <GoogleButton variant="tonal" onClick={resetForm}>
                                        Reset
                                    </GoogleButton>
                                    <GoogleButton variant="filled" onClick={handleSaveTemplate}>
                                        {editingId ? 'Update Template' : 'Add Template'}
                                    </GoogleButton>
                                </div>
                            </div>

                            <div className="border border-[var(--theme-border)] rounded-xl p-3 bg-[var(--theme-surface)]/60">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs uppercase tracking-wider text-[var(--theme-text-tertiary)]">Custom Templates</span>
                                    <span className="text-[11px] text-[var(--theme-text-muted)]">{customTemplates.length} saved</span>
                                </div>
                                {customTemplates.length === 0 ? (
                                    <div className="text-sm text-[var(--theme-text-tertiary)] flex items-center gap-2">
                                        <GoogleIcon icon={UI_ICONS_MAP.warning} className="w-4 h-4" />
                                        No custom templates yet. Create one to reuse across sessions.
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[var(--theme-border)] scrollbar-track-transparent">
                                        {customTemplates.map((template) => (
                                            <div
                                                key={template.id}
                                                className="flex items-start gap-3 p-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)]"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div>
                                                            <p className="text-sm text-[var(--theme-text-primary)] font-medium">{template.name}</p>
                                                            <p className="text-[11px] text-[var(--theme-text-tertiary)]">{template.description}</p>
                                                        </div>
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--theme-surface-elevated)] text-[var(--theme-text-tertiary)] border border-[var(--theme-border)]">
                                                            {CATEGORY_LABELS[template.category]}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleEditTemplate(template)}
                                                        className="p-1.5 rounded-lg hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)]"
                                                        title="Edit template"
                                                    >
                                                        <GoogleIcon icon={UI_ICONS_MAP.tune} className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveTemplate(template.id)}
                                                        className="p-1.5 rounded-lg hover:bg-[var(--theme-error)]/10 text-[var(--theme-error)]"
                                                        title="Delete template"
                                                    >
                                                        <GoogleIcon icon={UI_ICONS_MAP.delete} className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PromptTemplateSelector;

