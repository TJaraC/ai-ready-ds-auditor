export const BANNER_COPY: Record<'missing' | 'injected' | 'outdated', { variant: 'success' | 'warning' | 'error'; message: string }> = {
  missing: { variant: 'error', message: 'No AI context found \u2014 Run Audit & Inject' },
  injected: { variant: 'success', message: 'AI Context injected \u2014 Ready for IDE' },
  outdated: { variant: 'warning', message: 'AI Context may be outdated \u2014 Re-inject to update' },
};
