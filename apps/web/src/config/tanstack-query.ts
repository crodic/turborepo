import { ZodError } from 'zod'
import { isAxiosError } from 'axios'
import { MutationCache, QueryCache } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'

export const trackingSentryMutation = () =>
  new MutationCache({
    onError: (error, variables, context, mutation) => {
      if (error instanceof ZodError) {
        Sentry.captureException(error)
      }

      if (
        isAxiosError(error) &&
        error.response?.status &&
        error.response?.status >= 500
      ) {
        Sentry.captureException(error, {
          tags: {
            type: 'react-query-mutation',
            mutationKey: mutation.options.mutationKey?.join(','),
          },
          extra: {
            variables,
            context,
            meta: mutation.options.meta,
          },
        })
      }
    },
  })

export const trackingSentryQueries = () =>
  new QueryCache({
    onError: (error, query) => {
      if (error instanceof ZodError) {
        Sentry.captureException(error)
      }

      if (
        isAxiosError(error) &&
        error.response?.status &&
        error.response?.status >= 500
      ) {
        Sentry.captureException(error, {
          tags: {
            type: 'react-query',
            queryKey: query.options.queryKey?.join(','),
          },
        })
      }
    },
  })
