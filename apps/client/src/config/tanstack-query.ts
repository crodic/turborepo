import { ZodError } from "zod";
import { isXiorError } from "xior";
import { MutationCache, QueryCache } from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";

export const trackingSentryMutation = () =>
  new MutationCache({
    onError: (error, variables, context, mutation) => {
      if (error instanceof ZodError) {
        Sentry.captureException(error);
      }

      if (
        isXiorError(error) &&
        error.response?.status &&
        error.response?.status >= 500
      ) {
        Sentry.captureException(error, {
          tags: {
            type: "react-query-mutation",
            mutationKey: mutation.options.mutationKey?.join(","),
          },
          extra: {
            variables,
            context,
            meta: mutation.options.meta,
          },
        });
      }
    },
  });

export const trackingSentryQueries = () =>
  new QueryCache({
    onError: (error, query) => {
      if (error instanceof ZodError) {
        Sentry.captureException(error);
      }

      if (
        isXiorError(error) &&
        error.response?.status &&
        error.response?.status >= 500
      ) {
        Sentry.captureException(error, {
          tags: {
            type: "react-query",
            queryKey: query.options.queryKey?.join(","),
          },
        });
      }
    },
  });
