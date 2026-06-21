import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { AppAbilityClass, type AppAbility, type Claim } from '@/lib/ability'
import {
  permissions as appPermissions,
  type Actions,
  type Subjects,
} from '@/lib/permissions'

const AUTH_KEY = import.meta.env.VITE_AUTH_KEY || 'auth'

type PermissionStatus = 'loading' | 'fetched'

export function parsePermissions(permissions: string[]): Claim[] {
  if (!Array.isArray(permissions)) return []

  const validClaims = new Set(
    appPermissions.map(
      (permission) => `${permission.action}:${permission.subject}`
    )
  )

  return permissions
    .map((permission) => {
      const [action, subject = 'all'] = permission.split(':')
      const claim = `${action}:${subject}`

      if (!validClaims.has(claim)) {
        return null
      }

      return { action: action as Actions, subject: subject as Subjects }
    })
    .filter((claim): claim is Claim => claim !== null)
}

interface AuthenticationState {
  permissionStatus: PermissionStatus
  isAuthenticated: boolean
  id?: string
  meta: {
    accessToken?: string
    refreshToken?: string
  }
  ability: AppAbility
  permissions: string[]
}

interface AuthenticationActions {
  login: (payload: {
    accessToken: string
    refreshToken: string
    id: string
  }) => void
  logout: () => void
  setToken: (payload: { accessToken: string; refreshToken: string }) => void
  setPermissions: (permissions: string[]) => void
  setAbilityFromPermissions: (permissions: string[]) => void
  resetAbility: () => void
}

type AuthenticationStore = AuthenticationState & AuthenticationActions

const initialState: AuthenticationState = {
  permissionStatus: 'loading',
  isAuthenticated: false,
  id: undefined,
  meta: { accessToken: undefined, refreshToken: undefined },
  permissions: [],
  ability: new AppAbilityClass([]),
}

export const useAuthStore = create<AuthenticationStore>()(
  persist(
    immer((set) => ({
      ...initialState,

      login: (payload) => {
        set((state) => {
          state.isAuthenticated = true
          state.id = payload.id
          state.meta.accessToken = payload.accessToken
          state.meta.refreshToken = payload.refreshToken
        })
      },

      logout: () => {
        set((state) => {
          state.isAuthenticated = false
          state.id = undefined
          state.meta.accessToken = undefined
          state.meta.refreshToken = undefined
          state.permissions = []
          state.ability = new AppAbilityClass([])
          state.permissionStatus = 'loading'
        })
      },

      setToken: (payload) => {
        set((state) => {
          state.meta.accessToken = payload.accessToken
          state.meta.refreshToken = payload.refreshToken
        })
      },

      setPermissions: (permissions) => {
        set((state) => {
          state.permissions = permissions
        })
      },

      setAbilityFromPermissions: (permissions) => {
        set((state) => {
          state.permissionStatus = 'fetched'
          state.permissions = permissions
          const claims = parsePermissions(permissions)
          state.ability = new AppAbilityClass(claims)
        })
      },

      resetAbility: () => {
        set((state) => {
          state.permissionStatus = 'loading'
          state.permissions = []
          state.ability = new AppAbilityClass([])
        })
      },
    })),
    {
      name: AUTH_KEY,
      partialize: (state) => ({
        id: state.id,
        meta: state.meta,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
