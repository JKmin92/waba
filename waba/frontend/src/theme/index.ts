import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const customConfig = defineConfig({
  globalCss: {
    body: {
      bg: '#F7F7F8',
      color: '#141416',
      letterSpacing: '-0.02em',
      fontFamily: `'Pretendard', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`,
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
  },
});

export const wabaTheme = createSystem(defaultConfig, customConfig);
