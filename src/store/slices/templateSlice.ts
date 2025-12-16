import { TEMPLATE_PLACEHOLDER } from '@/constants/templates';
import type { StoreSlice, TemplateSlice } from '../types';

const ensurePlaceholder = (template: string) => {
    if (template.includes(TEMPLATE_PLACEHOLDER)) return template;
    const trimmed = template.trim();
    if (!trimmed) return TEMPLATE_PLACEHOLDER;
    return `${trimmed}\n\n${TEMPLATE_PLACEHOLDER}`;
};

export const createTemplateSlice: StoreSlice<TemplateSlice> = (set) => ({
    customTemplates: [],
    selectedTemplateId: null,

    addCustomTemplate: (template) => {
        set((state) => {
            state.customTemplates.push({
                ...template,
                category: template.category ?? 'custom',
                template: ensurePlaceholder(template.template),
            });
        });
    },

    removeCustomTemplate: (id) => {
        set((state) => {
            state.customTemplates = state.customTemplates.filter(t => t.id !== id);
            if (state.selectedTemplateId === id) {
                state.selectedTemplateId = null;
            }
        });
    },

    updateCustomTemplate: (id, updated) => {
        set((state) => {
            const index = state.customTemplates.findIndex(t => t.id === id);
            if (index === -1) return;

            const existing = state.customTemplates[index];
            state.customTemplates[index] = {
                ...existing,
                ...updated,
                category: updated.category ?? existing.category ?? 'custom',
                template: updated.template !== undefined
                    ? ensurePlaceholder(updated.template)
                    : existing.template,
            };
        });
    },

    setSelectedTemplate: (id) => {
        set({ selectedTemplateId: id });
    },
});








