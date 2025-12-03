import { useState, useEffect, useCallback } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '@/types/settings';

const SETTINGS_KEY = 'contextractor_settings_v1';

export const useSettings = () => {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load settings from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with default to ensure new fields are present
                setSettings({
                    security: { ...DEFAULT_SETTINGS.security, ...parsed.security },
                    filters: { ...DEFAULT_SETTINGS.filters, ...parsed.filters }
                });
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save settings to localStorage
    const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const updateSecuritySettings = useCallback((security: Partial<AppSettings['security']>) => {
        setSettings(prev => {
            const updated = { 
                ...prev, 
                security: { ...prev.security, ...security } 
            };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const updateFilterSettings = useCallback((filters: Partial<AppSettings['filters']>) => {
        setSettings(prev => {
            const updated = { 
                ...prev, 
                filters: { ...prev.filters, ...filters } 
            };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const resetSettings = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }, []);

    return {
        settings,
        isLoaded,
        updateSettings,
        updateSecuritySettings,
        updateFilterSettings,
        resetSettings
    };
};
