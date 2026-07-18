// Suspense-based read hooks for the main app surfaces. The window is already
// wrapped in Suspense + ErrorBoundary (see main.tsx), so these never expose
// loading/error flags — they either return data or suspend/throw.
import { useSuspenseQuery } from '@tanstack/react-query';
import type { LibraryConfig, ScreenSource } from '../../shared/domain';
import { loom } from '../lib/loom-api';
import { QUERY_KEYS } from '../lib/query-keys';

export const useLibrary = (): LibraryConfig => {
  const { data } = useSuspenseQuery({
    queryKey: QUERY_KEYS.library,
    queryFn: () => loom.getLibrary(),
  });
  return data;
};

export const useSources = (): ScreenSource[] => {
  const { data } = useSuspenseQuery({
    queryKey: QUERY_KEYS.sources,
    queryFn: () => loom.listSources(),
  });
  return data;
};
