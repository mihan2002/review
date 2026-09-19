import { useQuery } from '@tanstack/react-query'
import { diaryApi } from '../api/diaryApi'

/** The API caps a page at 100, so a year is walked in pages. */
const PAGE_SIZE = 100

/** Stop walking after this many pages; a year past it is reported as partial. */
const MAX_PAGES = 6

export interface YearIndex {
  year: number
  /** ISO date -> number of entries filed on that day, within what was read. */
  counts: Record<string, number>
  /** Entries actually read while building the index. */
  entriesRead: number
  /** Entries the server says exist in this year. */
  entriesInYear: number
  /** True when MAX_PAGES ran out before the year was fully read. */
  partial: boolean
}

/**
 * Builds a day-by-day index of one year from the list endpoint. Only entryDate
 * is used, and the result states plainly whether the whole year was read, so
 * the year sheet never implies knowledge of entries it did not fetch.
 */
export function useYearIndex(year: number, enabled = true) {
  return useQuery<YearIndex>({
    queryKey: ['diaries', 'year-index', year],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const from = `${year}-01-01`
      const to = `${year}-12-31`

      const counts: Record<string, number> = {}
      let entriesRead = 0
      let entriesInYear = 0
      let partial = false

      for (let page = 0; page < MAX_PAGES; page += 1) {
        const result = await diaryApi.getDiaries({ from, to, page, size: PAGE_SIZE })
        entriesInYear = result.totalElements

        for (const entry of result.content) {
          counts[entry.entryDate] = (counts[entry.entryDate] ?? 0) + 1
          entriesRead += 1
        }

        if (result.last || result.content.length === 0) break
        if (page === MAX_PAGES - 1) partial = true
      }

      return { year, counts, entriesRead, entriesInYear, partial }
    },
  })
}
