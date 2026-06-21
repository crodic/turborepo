import { parseAsJson, useQueryState } from 'nuqs'

interface SortItem {
  id: string
  desc: boolean
}

export default function useSortItem(key?: string) {
  const [sort] = useQueryState(
    key ?? 'sort',
    parseAsJson<SortItem[]>((v) => v as SortItem[]).withDefault([])
  )

  return sort
}
