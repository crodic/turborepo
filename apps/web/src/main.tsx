import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { AxiosError } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import * as Sentry from '@sentry/react'
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import './ instrument'
import Providers from './components/providers'
import {
  trackingSentryMutation,
  trackingSentryQueries,
} from './config/tanstack-query'
import AppRouter from './routes/router'
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // eslint-disable-next-line no-console
        if (import.meta.env.DEV) console.log({ failureCount, error })

        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 3 && import.meta.env.PROD) return false

        return !(
          error instanceof AxiosError &&
          [401, 403].includes(error.response?.status ?? 0)
        )
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 10 * 1000, // 10s
    },
    mutations: {
      onError: (error) => {
        handleServerError(error)

        if (error instanceof AxiosError) {
          if (error.response?.status === 304) {
            toast.error('Content not modified!')
          }
        }
      },
    },
  },
  queryCache: trackingSentryQueries(),
  mutationCache: trackingSentryMutation(),
})

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement, {
    // Callback called when an error is thrown and not caught by an ErrorBoundary.
    onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
      // eslint-disable-next-line no-console
      console.warn('Uncaught error', error, errorInfo.componentStack)
    }),
    // Callback called when React catches an error in an ErrorBoundary.
    onCaughtError: Sentry.reactErrorHandler(),
    // Callback called when React automatically recovers from errors.
    onRecoverableError: Sentry.reactErrorHandler(),
  })
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Providers>
          <NuqsAdapter>
            <AppRouter />
          </NuqsAdapter>
        </Providers>
      </QueryClientProvider>
    </StrictMode>
  )
}
