import { defineConfig } from 'unlighthouse'

export default defineConfig({
  site: 'http://localhost:3000',
  debug: false,
  scanner: {
    // Scan all internal routes found
    maxRoutes: 100,
    skipJavascript: false,
    exclude: [
      '/api/**',
      '/_next/**',
    ],
  },
  ci: {
    budget: {
      performance: 75,
      accessibility: 85,
      'best-practices': 85,
      seo: 85,
    },
  },
})
