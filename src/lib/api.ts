const DEFAULT_API_BASE_URLS = ['http://localhost:3001'] as const;

export const getApiBaseUrl = (fallbacks: readonly string[] = DEFAULT_API_BASE_URLS): string => {
  const configuredBaseUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  return '';
};

export const getApiUrl = (path: string, fallbacks: readonly string[] = DEFAULT_API_BASE_URLS): string => {
  const baseUrl = getApiBaseUrl(fallbacks);
  if (!baseUrl) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};
