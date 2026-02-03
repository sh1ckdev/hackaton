import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

const parseAllowedHosts = () => {
  const raw = process.env.ALLOWED_HOSTS ?? '';
  const hosts = raw
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  if (hosts.length === 0) {
    hosts.push('chermanx.ru');
  }

  return hosts;
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.FRONTEND_PORT ?? process.env.PORT) || 4173,
    allowedHosts: parseAllowedHosts(),
  },
});