import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getApiBaseUrl, getApiUrl } from './api';

describe('getApiBaseUrl', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the configured VITE_API_URL when provided', () => {
    vi.stubEnv('VITE_API_URL', 'https://example.test');

    expect(getApiBaseUrl()).toBe('https://example.test');
  });

  it('uses a relative API path by default when no env value is set', () => {
    vi.stubEnv('VITE_API_URL', '');

    expect(getApiBaseUrl()).toBe('');
  });

  it('builds relative API URLs by default', () => {
    vi.stubEnv('VITE_API_URL', '');

    expect(getApiUrl('/query')).toBe('/query');
  });

  it('prefixes configured API URLs when provided', () => {
    vi.stubEnv('VITE_API_URL', 'https://example.test');

    expect(getApiUrl('/query')).toBe('https://example.test/query');
  });
});
