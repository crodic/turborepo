/* eslint-disable react-hooks/exhaustive-deps */
 
import { type DependencyList, useMemo } from 'react'
import debounce from 'lodash.debounce'

export default function useTableDebouncedCallback({
  func,
  time,
  deps,
}: {
  func: (...args: any[]) => void
  time: number
  deps: DependencyList
}) {
  return useMemo(() => debounce(func, time), deps)
}
