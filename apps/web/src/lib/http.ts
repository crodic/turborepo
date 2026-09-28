import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { PaginateQueryBuilder } from './query-builder'

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

type RefreshTokenResponse = {
  accessToken: string
  refreshToken: string
}

const httpConfig = {
  timeout: 10 * 60 * 1000,
  withCredentials: true,
  baseURL: import.meta.env.VITE_API_URL,
}

const http = axios.create({
  ...httpConfig,
  paramsSerializer: (params) => {
    return new PaginateQueryBuilder(params).toQueryString()
  },
})

const authHttp = axios.create(httpConfig)

http.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().meta.accessToken
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

let refreshTokenPromise: Promise<void> | null = null
let isRedirectingToSignIn = false

function isAuthEndpoint(url?: string) {
  if (!url) return false

  return ['/auth/login', '/auth/refresh', '/auth/logout'].some((path) =>
    url.includes(path)
  )
}

async function refreshAccessToken(refreshToken: string) {
  const res = await authHttp.post<RefreshTokenResponse>('/auth/refresh', {
    refreshToken,
  })

  return res.data
}

function logoutAndRedirect() {
  if (isRedirectingToSignIn) return

  isRedirectingToSignIn = true
  const refreshToken = useAuthStore.getState().meta.refreshToken

  authHttp
    .post('/auth/logout', { token: refreshToken })
    .catch(() => undefined)
    .finally(() => {
      useAuthStore.getState().logout()

      if (location.pathname !== '/sign-in') {
        location.href = '/sign-in'
      }
    })
}

export async function refreshAdminToken(): Promise<string | null> {
  if (!refreshTokenPromise) {
    const refreshToken = useAuthStore.getState().meta.refreshToken

    if (!refreshToken) {
      logoutAndRedirect()
      return null
    }

    refreshTokenPromise = refreshAccessToken(refreshToken)
      .then((res) => {
        const accessToken = res.accessToken
        const newRefreshToken = res.refreshToken
        useAuthStore.getState().setToken({
          accessToken,
          refreshToken: newRefreshToken,
        })
        http.defaults.headers.Authorization = `Bearer ${accessToken}`
      })
      .catch((_error) => {
        logoutAndRedirect()
        throw _error
      })
      .finally(() => {
        refreshTokenPromise = null
      })
  }

  try {
    await refreshTokenPromise
    return useAuthStore.getState().meta.accessToken ?? null
  } catch {
    return null
  }
}

http.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined

    if (error.response && error.response.status === 401 && originalRequest) {
      if (originalRequest._retry || isAuthEndpoint(originalRequest.url)) {
        logoutAndRedirect()
        return Promise.reject(error)
      }

      originalRequest._retry = true

      return refreshAdminToken()
        .then((accessToken) => {
          if (accessToken) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
          }
          return http(originalRequest)
        })
        .catch(() => Promise.reject(error))
    }

    return Promise.reject(error)
  }
)

export default http
