import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Contextractor - AI Context Extraction Tool',
    short_name: 'Contextractor',
    description: 'Free online tool to extract clean text from code files, ZIP archives, and GitHub repositories for AI and LLM context optimization.',
    start_url: '/',
    display: 'standalone',
    background_color: '#131314',
    theme_color: '#1E1E1E',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'en',
    dir: 'ltr',
    categories: ['developer tools', 'productivity', 'utilities'],
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    screenshots: [
      {
        src: '/og-image.png',
        sizes: '1200x630',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Import from GitHub',
        short_name: 'GitHub',
        description: 'Import a repository from GitHub',
        url: '/?action=github',
      },
    ],
    prefer_related_applications: false,
  };
}

