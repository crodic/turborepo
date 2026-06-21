import {
  differenceInDays,
  formatDistanceToNow,
  isAfter,
  isBefore,
} from 'date-fns'
import { type ClassValue, clsx } from 'clsx'
import { vi } from 'date-fns/locale'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generates page numbers for pagination with ellipsis
 * @param currentPage - Current page number (1-based)
 * @param totalPages - Total number of pages
 * @returns Array of page numbers and ellipsis strings
 *
 * Examples:
 * - Small dataset (≤5 pages): [1, 2, 3, 4, 5]
 * - Near beginning: [1, 2, 3, 4, '...', 10]
 * - In middle: [1, '...', 4, 5, 6, '...', 10]
 * - Near end: [1, '...', 7, 8, 9, 10]
 */
export function getPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5 // Maximum number of page buttons to show
  const rangeWithDots = []

  if (totalPages <= maxVisiblePages) {
    // If total pages is 5 or less, show all pages
    for (let i = 1; i <= totalPages; i++) {
      rangeWithDots.push(i)
    }
  } else {
    // Always show first page
    rangeWithDots.push(1)

    if (currentPage <= 3) {
      // Near the beginning: [1] [2] [3] [4] ... [10]
      for (let i = 2; i <= 4; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    } else if (currentPage >= totalPages - 2) {
      // Near the end: [1] ... [7] [8] [9] [10]
      rangeWithDots.push('...')
      for (let i = totalPages - 3; i <= totalPages; i++) {
        rangeWithDots.push(i)
      }
    } else {
      // In the middle: [1] ... [4] [5] [6] ... [10]
      rangeWithDots.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    }
  }

  return rangeWithDots
}

export const isDateBefore = (date1: Date | string, date2: Date | string) => {
  return isBefore(new Date(date1), new Date(date2))
}

export const isDateAfter = (date1: Date | string, date2: Date | string) => {
  return isAfter(new Date(date1), new Date(date2))
}

export const getDaysDiff = (from: Date | string, to: Date | string) => {
  return differenceInDays(new Date(to), new Date(from))
}

export const timeFromNowVi = (date: Date | string) => {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: vi,
  })
}

export type SortItem = { id: string; desc: boolean }

export const sortQueryParser = (values: SortItem[]) => {
  const sort = values
    .map((item) => `${item.id}:${item.desc ? 'DESC' : 'ASC'}`)
    .join(' ')

  return sort
}

export const sortParser = (values: SortItem[]) => {
  const sort = values.map((item) => ({
    sortBy: item.id,
    sortDirection: (item.desc ? 'DESC' : 'ASC') as 'ASC' | 'DESC',
  }))

  return sort?.[0] || {}
}

export function getAbsoluteUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (typeof window !== 'undefined') {
    return normalizedPath
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT ?? 3000}`

  return `${baseUrl}${normalizedPath}`
}

export function normalizeDate(value?: number | string) {
  if (!value) return undefined
  const num = Number(value)
  return num > 1e12
    ? new Date(num).toISOString()
    : new Date(num * 1000).toISOString()
}

export function normalizeEpoch(value?: number | string) {
  if (!value) return undefined
  const n = Number(value)
  return n > 1e12 ? Math.floor(n / 1000) : n // nếu ms thì chia 1000
}
