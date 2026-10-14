import type { Config } from 'tailwindcss'

// Paleta base verde EDAI (la misma del CRM y de los prototipos)
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Los colores vienen de variables CSS para que cada tienda elija la paleta de su panel
      colors: {
        fondo: 'rgb(var(--c-fondo) / <alpha-value>)',
        lateral: 'rgb(var(--c-lateral) / <alpha-value>)',
        sup: 'rgb(var(--c-sup) / <alpha-value>)',
        sup2: 'rgb(var(--c-sup2) / <alpha-value>)',
        linea: 'rgb(var(--c-linea) / <alpha-value>)',
        tinta: 'rgb(var(--c-tinta) / <alpha-value>)',
        suave: 'rgb(var(--c-suave) / <alpha-value>)',
        acento: 'rgb(var(--c-acento) / <alpha-value>)',
        sobreacento: 'rgb(var(--c-sobreacento) / <alpha-value>)',
        primario: 'rgb(var(--c-primario) / <alpha-value>)',
        sobreprimario: 'rgb(var(--c-sobreprimario) / <alpha-value>)',
        chip: 'rgb(var(--c-chip) / <alpha-value>)',
        chiptinta: 'rgb(var(--c-chiptinta) / <alpha-value>)',
        malo: 'rgb(var(--c-malo) / <alpha-value>)',
        malofondo: 'rgb(var(--c-malofondo) / <alpha-value>)',
        aviso: 'rgb(var(--c-aviso) / <alpha-value>)',
        avisofondo: 'rgb(var(--c-avisofondo) / <alpha-value>)',
      },
      fontFamily: { sans: ['var(--font-figtree)', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config
