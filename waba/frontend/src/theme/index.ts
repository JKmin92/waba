import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const customConfig = defineConfig({
  globalCss: {
    ':root': {
      '--waba-bg': '#FFFFFF',
      '--waba-surface': '#FAFBFD',
      '--waba-card': '#FFFFFF',
      '--waba-ink': '#111115',
      '--waba-ink-2': '#4E4E58',
      '--waba-ink-3': '#8E8E98',
      '--waba-line': '#EAEAEF',
      '--waba-purple': '#6338A9',
      '--waba-purple-soft': '#F6EBFB',
      '--waba-purple-text': '#6338A9',
      '--waba-purple-border': '#E5D4F3',
      '--waba-glass-btn': 'rgba(255, 255, 255, 0.92)',
      '--waba-avatar-shadow': '0 2px 8px rgba(0, 0, 0, 0.22)',
      '--waba-scroll-track': '#FAFBFD',
      '--waba-scroll-thumb': '#D4D4DC',
      '--waba-scroll-thumb-hover': '#A8A8B6',
    },
    '[data-theme="dark"]': {
      '--waba-bg': '#0F1014',
      '--waba-surface': '#171921',
      '--waba-card': '#14161D',
      '--waba-ink': '#F4F5F8',
      '--waba-ink-2': '#A5A8B8',
      '--waba-ink-3': '#727688',
      '--waba-line': '#262936',
      '--waba-purple': '#6338A9',
      '--waba-purple-soft': '#261A3A',
      '--waba-purple-text': '#A984EE',
      '--waba-purple-border': '#3B285B',
      '--waba-glass-btn': 'rgba(20, 22, 29, 0.88)',
      '--waba-avatar-shadow': '0 2px 10px rgba(255, 255, 255, 0.22)',
      '--waba-scroll-track': '#0F1014',
      '--waba-scroll-thumb': '#2D3140',
      '--waba-scroll-thumb-hover': '#464C64',
    },
    html: {
      colorScheme: 'light',
    },
    'html[data-theme="dark"]': {
      colorScheme: 'dark',
    },
    '*': {
      scrollbarWidth: 'thin',
      scrollbarColor: 'var(--waba-scroll-thumb) var(--waba-scroll-track)',
    },
    '::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '::-webkit-scrollbar-track': {
      background: 'var(--waba-scroll-track)',
    },
    '::-webkit-scrollbar-thumb': {
      background: 'var(--waba-scroll-thumb)',
      borderRadius: '999px',
      border: '2px solid transparent',
      backgroundClip: 'content-box',
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: 'var(--waba-scroll-thumb-hover)',
      borderRadius: '999px',
      border: '2px solid transparent',
      backgroundClip: 'content-box',
    },
    '::-webkit-scrollbar-corner': {
      background: 'var(--waba-scroll-track)',
    },
    body: {
      bg: 'var(--waba-bg)',
      color: 'var(--waba-ink)',
      letterSpacing: '-0.02em',
      fontFamily: `'Pretendard', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`,
      transition: 'background 0.2s ease, color 0.2s ease',
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: {
          value: `'Pretendard', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`,
        },
        body: {
          value: `'Pretendard', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`,
        },
      },
      colors: {
        waba: {
          purple: { value: '#6338A9' },
          purpleHover: { value: '#522B8F' },
          purpleLight: { value: '#F3EDFF' },
          charcoal: { value: '#141416' },
          charcoalHover: { value: '#2E3033' },
          canvas: { value: '#F7F7F8' },
          surface: { value: '#FFFFFF' },
          subtle: { value: '#F2F2F5' },
          border: { value: '#E8E7EC' },
          muted: { value: '#6B6A72' },
          faint: { value: '#9E9DA6' },
        },
      },
      radii: {
        bento: { value: '24px' },
        bentoLg: { value: '28px' },
        pill: { value: '9999px' },
      },
    },
    recipes: {
      button: {
        variants: {
          variant: {
            outline: {
              color: 'var(--waba-ink)',
              borderColor: 'var(--waba-line)',
              bg: 'transparent',
              _hover: { bg: 'var(--waba-surface)' },
            },
            ghost: {
              color: 'var(--waba-ink)',
              _hover: { bg: 'var(--waba-surface)' },
            },
          },
        },
      },
    },
  },
});

export const wabaTheme = createSystem(defaultConfig, customConfig);
