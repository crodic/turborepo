import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { AppAbilityClass, type AppAbility, type Claim } from '@/lib/ability'

type PermissionStatus = 'loading' | 'fetched'

interface AbilityState {
  permissionStatus: PermissionStatus
  ability: AppAbility
  permissions: Claim[]
}

interface AbilityActions {
  setPermissions: (permissions: Claim[]) => void
  setAbilityFromClaims: (claims: Claim[]) => void
  resetAbility: () => void
}

type AbilityStore = AbilityState & AbilityActions

const initialState: AbilityState = {
  permissionStatus: 'loading',
  permissions: [],
  ability: new AppAbilityClass([]),
}

export const useAbilityStore = create<AbilityStore>()(
  immer((set) => ({
    ...initialState,
    setPermissions: (permissions) => {
      set((state) => {
        state.permissions = permissions
      })
    },
    setAbilityFromClaims: (claims) => {
      set((state) => {
        state.permissionStatus = 'fetched'
        state.permissions = claims
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
  }))
)
