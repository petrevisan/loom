import '../index.css';
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './lib/error-boundary';
import { Home } from './surfaces/app/Home';
import { Settings } from './surfaces/app/Settings';
import { Setup } from './surfaces/app/Setup';
import { CameraBubble } from './surfaces/bubble/CameraBubble';
import { ControlBar } from './surfaces/control-bar/ControlBar';
import { CaptureEngine } from './surfaces/capture/CaptureEngine';

// One client per window (each window is a separate document loading this bundle).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Loading…
          </div>
        }
      >
        <HashRouter>
          <Routes>
            {/* Main window surfaces */}
            <Route path="/" element={<Home />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/setup" element={<Setup />} />
            {/* Dedicated helper windows */}
            <Route path="/bubble" element={<CameraBubble />} />
            <Route path="/control-bar" element={<ControlBar />} />
            <Route path="/capture" element={<CaptureEngine />} />
          </Routes>
        </HashRouter>
      </Suspense>
    </ErrorBoundary>
  </QueryClientProvider>
);

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
