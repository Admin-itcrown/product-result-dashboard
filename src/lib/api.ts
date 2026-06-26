const DEFAULT_API_BASE_URLS = ['http://localhost:3002', 'http://localhost:5000'] as const;

export const getApiBaseUrl = (fallbacks: readonly string[] = DEFAULT_API_BASE_URLS): string => {
  const configuredBaseUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  return '';
};
