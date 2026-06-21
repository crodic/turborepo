import { type AxiosError } from 'axios'
import { toast } from 'sonner'

export type ApiError = AxiosError<{
  errors?: unknown[]
  error?: string
  message?: string
}>

export function resolveErrorMessageFrom(error: ApiError) {
  if (error.response == null) {
    return 'Something went wrong'
  }

  const data = error.response.data
  if (data.message != null) {
    return data.message
  }

  if (data.error != null) {
    return data.error
  }

  const errors = data.errors
  if (errors && errors.length > 0) {
    return Object.entries(errors)
      .map(([, val]) => val)
      .join('\n')
  }

  return 'Something went wrong'
}

export const restApiErrorHandler = (error: ApiError & Error) => {
  toast.error(resolveErrorMessageFrom(error))
}
