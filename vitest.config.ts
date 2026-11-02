import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Reaproveita o vite.config.ts (alias "@", plugins) e acrescenta o ambiente de testes com DOM.
export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      environment: 'jsdom',
      // globals: o @testing-library/react só limpa o DOM entre testes se afterEach for global
      globals: true,
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }),
)
