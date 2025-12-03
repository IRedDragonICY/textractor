// Export Modal Component - Material You Design
// Professional export options: TXT, MD, JSON, HTML

'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { FileData, OutputStyle } from '@/types';

// Icons
const ICONS = {
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
    copy: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    openInNew: "M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
    file_txt: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    file_md: "M20.56 18H3.44C2.65 18 2 17.37 2 16.59V7.41C2 6.63 2.65 6 3.44 6h17.12c.79 0 1.44.63 1.44 1.41v9.18c0 .78-.65 1.41-1.44 1.41zM6 8v8h2v-4l1.5 2 1.5-2v4h2V8H11l-1.5 2.5L8 8H6zm10 0v8h3v-2h-1.5v-1H19V11h-1.5v-1H19V8h-3z",
    file_json: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2.5 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm9-5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-1.41 4.41L14 14.33l-1.09 1.08 1.41 1.42 2.17-2.17-1.41-1.41-1.41 1.41.41.75-.99-.99-1.41 1.42 2.17 2.17 1.41-1.42-1.08-1.09 1.08-1.09z",
    html: "M12 17.56l4.07-1.13.55-6.1H9.38L9.2 8.3h7.6l.2-1.99H7l.56 6.01h6.89l-.23 2.58-2.22.6-2.22-.6-.14-1.66h-2l.29 3.19L12 17.56zM3 2h18l-1.64 18L12 22l-7.36-2L3 2z",
    notion: "M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.465c-.466.046-.56.28-.374.466l1.823 1.277zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.449.327s0 .84-1.168.84l-3.222.187c-.093-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.234 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933l3.222-.187zM2.196 1.108l13.496-.934c1.681-.14 2.101 0 2.802.513l3.876 2.708c.513.374.653.467.653 1.073v15.18c0 .934-.327 1.54-1.495 1.634l-15.458.934c-.886.047-1.308-.093-1.775-.7L1.67 18.36c-.513-.7-.747-1.214-.747-1.914V2.508c0-.84.327-1.307 1.274-1.4z",
    confluence: "M2.073 15.047c-.168-.254-.287-.506-.419-.758l-.083-.168c-.167-.336-.335-.672-.486-1.008-.571-1.26-.537-2.269.116-3.277l4.03-6.213c.168-.252.421-.42.757-.42.252 0 .504.084.672.252l.168.168c2.013 2.013 3.277 4.613 3.697 7.463.084.42.336.756.672.924l.252.168c.336.168.588.42.756.756.252.42.336.924.168 1.428-.168.42-.42.756-.84.924-.168.084-.336.168-.504.168l-.336.084c-2.857.672-5.633.588-8.153-.336-.252-.084-.42-.084-.672 0-.504.168-.924.588-1.092 1.092-.168.504-.084 1.008.252 1.428l1.26 1.596c.168.252.168.588 0 .84-.168.336-.504.504-.84.504H1.4c-.336 0-.588-.252-.588-.588V5.017c0-.252.168-.504.336-.672.168-.168.42-.252.672-.168.168 0 .336.084.42.252.336.504.504 1.092.504 1.68v2.521c0 .252-.168.504-.336.672-.252.168-.42.42-.504.756-.084.252-.084.588.084.84l.084.168v8.98z",
    loading: "M12 4V2C6.48 2 2 6.48 2 12h2c0-4.42 3.58-8 8-8zm0 16v2c5.52 0 10-4.48 10-10h-2c0 4.42-3.58 8-8 8z",
    warning: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
    key: "M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",
};

// Export formats configuration
const EXPORT_FORMATS = [
    {
        id: 'txt',
        name: 'Plain Text',
        ext: '.txt',
        icon: ICONS.file_txt,
        description: 'Simple text format, compatible with everything',
        color: '#6B7280',
    },
    {
        id: 'md',
        name: 'Markdown',
        ext: '.md',
        icon: ICONS.file_md,
        description: 'Formatted with code blocks and syntax highlighting',
        color: '#3B82F6',
    },
    {
        id: 'json',
        name: 'JSON',
        ext: '.json',
        icon: ICONS.file_json,
        description: 'Structured data format for programmatic use',
        color: '#F59E0B',
    },
];

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
    files: FileData[];
    outputStyle: OutputStyle;
    sessionName: string;
}

type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

export const ExportModal: React.FC<ExportModalProps> = ({
    isOpen,
    onClose,
    content,
    files,
    outputStyle,
    sessionName,
}) => {
    const [activeTab, setActiveTab] = useState<'download' | 'share'>('download');
    const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

    // Generate filename based on session name
    const generateFilename = useCallback((ext: string) => {
        const sanitized = sessionName.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
        const timestamp = new Date().toISOString().slice(0, 10);
        return `${sanitized}_${timestamp}${ext}`;
    }, [sessionName]);

    // Generate content in different formats
    const generateContent = useCallback((format: string): string => {
        switch (format) {
            case 'txt':
                return content;
            
            case 'md':
                // Already markdown-like, but ensure proper formatting
                const mdHeader = `# ${sessionName}\n\n> Exported from Contextractor on ${new Date().toLocaleDateString()}\n\n---\n\n`;
                return mdHeader + content;
            
            case 'json':
                const jsonData = {
                    exportedAt: new Date().toISOString(),
                    sessionName,
                    outputStyle,
                    stats: {
                        fileCount: files.filter(f => f.isText).length,
                        totalLines: files.filter(f => f.isText).reduce((a, b) => a + b.linesOfCode, 0),
                        totalTokens: files.filter(f => f.isText).reduce((a, b) => a + b.tokenCount, 0),
                    },
                    files: files.filter(f => f.isText).map(f => ({
                        name: f.name,
                        path: f.path,
                        linesOfCode: f.linesOfCode,
                        tokenCount: f.tokenCount,
                        content: f.content,
                    })),
                };
                return JSON.stringify(jsonData, null, 2);
            
            case 'html':
                // Generate rich HTML for Notion/Confluence
                const htmlFiles = files.filter(f => f.isText).map(f => {
                    const ext = f.name.split('.').pop() || 'txt';
                    return `
<div style="margin-bottom: 24px;">
    <div style="background: #f5f5f5; padding: 8px 12px; border-radius: 6px 6px 0 0; border: 1px solid #e0e0e0; border-bottom: none;">
        <code style="font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 13px; color: #333;">📄 ${f.path || f.name}</code>
    </div>
    <pre style="margin: 0; padding: 16px; background: #1e1e1e; color: #d4d4d4; border-radius: 0 0 6px 6px; overflow-x: auto; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 13px; line-height: 1.5; border: 1px solid #333;"><code class="language-${ext}">${escapeHtml(f.content)}</code></pre>
</div>`;
                }).join('\n');

                return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${sessionName} - Contextractor Export</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; background: #fff; color: #333; }
        h1 { font-weight: 600; margin-bottom: 8px; }
        .meta { color: #666; font-size: 14px; margin-bottom: 32px; }
        .stats { display: flex; gap: 16px; margin-bottom: 24px; }
        .stat { background: #f0f0f0; padding: 8px 16px; border-radius: 20px; font-size: 13px; }
    </style>
</head>
<body>
    <h1>${sessionName}</h1>
    <p class="meta">Exported from Contextractor on ${new Date().toLocaleString()}</p>
    <div class="stats">
        <span class="stat">📁 ${files.filter(f => f.isText).length} files</span>
        <span class="stat">📝 ${files.filter(f => f.isText).reduce((a, b) => a + b.linesOfCode, 0).toLocaleString()} lines</span>
        <span class="stat">🔤 ${files.filter(f => f.isText).reduce((a, b) => a + b.tokenCount, 0).toLocaleString()} tokens</span>
    </div>
    ${htmlFiles}
</body>
</html>`;
            
            default:
                return content;
        }
    }, [content, files, outputStyle, sessionName]);

    // Download file
    const handleDownload = useCallback((format: string) => {
        const formatConfig = EXPORT_FORMATS.find(f => f.id === format);
        if (!formatConfig) return;

        const exportContent = generateContent(format);
        const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = generateFilename(formatConfig.ext);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExportStatus('success');
        setStatusMessage(`Downloaded as ${formatConfig.name}`);
        setTimeout(() => {
            setExportStatus('idle');
            setStatusMessage('');
        }, 2000);
    }, [generateContent, generateFilename]);

    // Copy HTML to clipboard
    const handleCopyHtml = useCallback(async () => {
        try {
            const htmlContent = generateContent('html');
            
            // Copy as both HTML and plain text for maximum compatibility
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const clipboardItem = new ClipboardItem({
                'text/html': blob,
                'text/plain': new Blob([htmlContent], { type: 'text/plain' }),
            });
            
            await navigator.clipboard.write([clipboardItem]);
            
            setCopiedFormat('html');
            setExportStatus('success');
            setStatusMessage('HTML copied! Paste directly in Notion or Confluence');
            setTimeout(() => {
                setCopiedFormat(null);
                setExportStatus('idle');
                setStatusMessage('');
            }, 3000);
        } catch (err) {
            // Fallback: copy as plain text
            const htmlContent = generateContent('html');
            await navigator.clipboard.writeText(htmlContent);
            
            setCopiedFormat('html');
            setExportStatus('success');
            setStatusMessage('HTML copied as text');
            setTimeout(() => {
                setCopiedFormat(null);
                setExportStatus('idle');
                setStatusMessage('');
            }, 3000);
        }
    }, [generateContent]);

    // Reset state when modal closes
    React.useEffect(() => {
        if (!isOpen) {
            setExportStatus('idle');
            setStatusMessage('');
            setCopiedFormat(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                className="bg-[var(--theme-surface-elevated)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-[var(--theme-border)]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 flex items-center justify-between border-b border-[var(--theme-border)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary)]/10 flex items-center justify-center">
                            <GoogleIcon path={ICONS.download} className="w-5 h-5 text-[var(--theme-primary)]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--theme-text-primary)]">Export</h2>
                            <p className="text-xs text-[var(--theme-text-tertiary)]">
                                {files.filter(f => f.isText).length} files • {files.filter(f => f.isText).reduce((a, b) => a + b.tokenCount, 0).toLocaleString()} tokens
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-[var(--theme-surface)] hover:bg-[var(--theme-surface-hover)] flex items-center justify-center transition-colors"
                    >
                        <GoogleIcon path={ICONS.close} className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--theme-border)]">
                    <button
                        onClick={() => setActiveTab('download')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                            activeTab === 'download'
                                ? 'text-[var(--theme-primary)]'
                                : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)]'
                        }`}
                    >
                        Download
                        {activeTab === 'download' && (
                            <motion.div
                                layoutId="exportTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--theme-primary)]"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('share')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                            activeTab === 'share'
                                ? 'text-[var(--theme-primary)]'
                                : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)]'
                        }`}
                    >
                        Share
                        {activeTab === 'share' && (
                            <motion.div
                                layoutId="exportTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--theme-primary)]"
                            />
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {activeTab === 'download' && (
                            <motion.div
                                key="download"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-3"
                            >
                                {EXPORT_FORMATS.map(format => (
                                    <motion.button
                                        key={format.id}
                                        onClick={() => handleDownload(format.id)}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        className="w-full flex items-center gap-4 p-4 bg-[var(--theme-surface)] hover:bg-[var(--theme-surface-hover)] rounded-2xl transition-colors group border border-transparent hover:border-[var(--theme-border)]"
                                    >
                                        <div 
                                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                                            style={{ backgroundColor: `${format.color}15` }}
                                        >
                                            <GoogleIcon 
                                                path={format.icon} 
                                                className="w-6 h-6"
                                                style={{ color: format.color }}
                                            />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-sm font-medium text-[var(--theme-text-primary)]">
                                                {format.name}
                                                <span className="text-[var(--theme-text-muted)] font-normal ml-2">{format.ext}</span>
                                            </p>
                                            <p className="text-xs text-[var(--theme-text-tertiary)]">{format.description}</p>
                                        </div>
                                        <GoogleIcon 
                                            path={ICONS.download} 
                                            className="w-5 h-5 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-primary)] transition-colors" 
                                        />
                                    </motion.button>
                                ))}
                            </motion.div>
                        )}

                        {activeTab === 'share' && (
                            <motion.div
                                key="share"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                {/* Copy as HTML */}
                                <motion.button
                                    onClick={handleCopyHtml}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    className="w-full flex items-center gap-4 p-4 bg-[var(--theme-surface)] hover:bg-[var(--theme-surface-hover)] rounded-2xl transition-colors group border border-transparent hover:border-[var(--theme-border)]"
                                >
                                    <div 
                                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: '#E34F2615' }}
                                    >
                                        <GoogleIcon path={ICONS.html} className="w-6 h-6" style={{ color: '#E34F26' }} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-[var(--theme-text-primary)]">
                                            Copy as HTML
                                        </p>
                                        <p className="text-xs text-[var(--theme-text-tertiary)]">
                                            Paste directly in Notion, Confluence, or any rich text editor
                                        </p>
                                    </div>
                                    {copiedFormat === 'html' ? (
                                        <GoogleIcon path={ICONS.check} className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <GoogleIcon path={ICONS.copy} className="w-5 h-5 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-primary)] transition-colors" />
                                    )}
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Status Bar */}
                <AnimatePresence>
                    {statusMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className={`px-6 py-3 flex items-center gap-2 text-sm ${
                                exportStatus === 'success' 
                                    ? 'bg-green-500/10 text-green-600'
                                    : exportStatus === 'error'
                                        ? 'bg-red-500/10 text-red-600'
                                        : 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]'
                            }`}
                        >
                            {exportStatus === 'success' && <GoogleIcon path={ICONS.check} className="w-4 h-4" />}
                            {exportStatus === 'error' && <GoogleIcon path={ICONS.warning} className="w-4 h-4" />}
                            {exportStatus === 'loading' && (
                                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                            )}
                            {statusMessage}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
};

// Helper function to escape HTML
function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

export default ExportModal;
