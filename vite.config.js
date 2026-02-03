import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения
  const env = loadEnv(mode, process.cwd(), '')
  
  // Получаем URL бэкенда из переменной окружения или используем дефолт
  // VITE_BACKEND_URL - полный URL бэкенда (например: http://localhost:3001)
  // Если не указан, пытаемся извлечь из VITE_API_URL (убираем /api)
  const backendUrl = env.VITE_BACKEND_URL || 
    (env.VITE_API_URL ? env.VITE_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:3001')
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        }
      }
    }
  }
})
