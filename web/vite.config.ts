import { defineConfig } from 'vite'

// For GitHub project Pages set env, e.g. VITE_BASE_PATH=/voice_calendar/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
})
