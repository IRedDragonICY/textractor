import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Textracktor PRO',
    short_name: 'Textracktor',
    description: 'Extract text from files and repositories for LLMs',
    start_url: '/',
    display: 'standalone',
    background_color: '#131314',
    theme_color: '#1E1E1E',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}

