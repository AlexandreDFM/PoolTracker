import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API runs in the "server" container of docker-compose.dev.yml;
// set API_PROXY_TARGET to reach it elsewhere (e.g. http://localhost:3001)
const apiTarget = process.env.API_PROXY_TARGET || 'http://server:3001';

export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 3000,
        strictPort: true,
        proxy: {
            '/api': { target: apiTarget, changeOrigin: false }
        },
        // File change events do not cross the Docker bind mount on macOS
        watch: { usePolling: process.env.CHOKIDAR_USEPOLLING === 'true' }
    },
    preview: {
        port: 3000
    },
    build: {
        // Same output folder as Create React App: the Dockerfiles copy client/build
        outDir: 'build',
        // Raise the warning threshold: the app ships as a single bundle
        chunkSizeWarningLimit: 1000
    }
});
