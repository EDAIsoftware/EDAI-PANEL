import type { Config } from 'tailwindcss'

// Paleta base verde EDAI (la misma del CRM y de los prototipos)
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: '#0f1a17',
        lateral: '#132420',
        sup: '#15231f',
        sup2: '#1a2b26',
        linea: '#24372f',
        tinta: '#e8f1ec',
        suave: '#8fa69b',
        acento: '#22c55e',
        primario: '#5fb8a0',
        chip: '#1c3b2c',
        chiptinta: '#7ddca3',
        malo: '#f2706b',
        aviso: '#f5b84a',
      },
      fontFamily: { sans: ['var(--font-figtree)', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config
