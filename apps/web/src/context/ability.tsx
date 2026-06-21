import { createContext } from 'react'
import { createContextualCan } from '@casl/react'
import { useAbilityStore } from '@/stores/permission'

export const AbilityContext = createContext(useAbilityStore.getState().ability)
export const Can = createContextualCan(AbilityContext.Consumer)
