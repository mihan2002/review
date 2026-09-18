import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { diaryApi } from '../api/diaryApi'
import type { DiaryEntry, DiaryEntryRequest, PageResponse } from '../types/api'

export const PAGE_SIZE = 10

export const diaryKeys = {
  all: ['diaries'] as const,
  list: (params: { from?: string; to?: string; page: number }) => ['diaries', 'list', params] as const,
  search: (params: { keyword: string; page: number }) => ['diaries', 'search', params] as const,
  detail: (id: string) => ['diaries', 'detail', id] as const,
}

interface DiaryListOptions {
  keyword?: string
  from?: string
  to?: string
  page: number
}

/**
 * One hook for the dashboard list: it queries the backend's search endpoint
 * when a keyword is present and the filtered list endpoint otherwise.
 */
export function useDiaryList({ keyword, from, to, page }: DiaryListOptions) {
  const trimmedKeyword = keyword?.trim() ?? ''
  const isSearching = trimmedKeyword.length > 0

  return useQuery<PageResponse<DiaryEntry>>({
    queryKey: isSearching
      ? diaryKeys.search({ keyword: trimmedKeyword, page })
      : diaryKeys.list({ from, to, page }),
    queryFn: () =>
      isSearching
        ? diaryApi.searchDiaries({ keyword: trimmedKeyword, page, size: PAGE_SIZE })
        : diaryApi.getDiaries({ from, to, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
}

export function useDiary(id: string | undefined) {
  return useQuery<DiaryEntry>({
    queryKey: diaryKeys.detail(id ?? ''),
    queryFn: () => diaryApi.getDiary(id as string),
    enabled: Boolean(id),
    retry: false,
  })
}

export function useCreateDiary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: DiaryEntryRequest) => diaryApi.createDiary(payload),
    onSuccess: (entry) => {
      queryClient.setQueryData(diaryKeys.detail(entry.id), entry)
      void queryClient.invalidateQueries({ queryKey: diaryKeys.all })
    },
  })
}

export function useUpdateDiary(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: DiaryEntryRequest) => diaryApi.updateDiary(id, payload),
    onSuccess: (entry) => {
      queryClient.setQueryData(diaryKeys.detail(entry.id), entry)
      void queryClient.invalidateQueries({ queryKey: diaryKeys.all })
    },
  })
}

export function useDeleteDiary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => diaryApi.deleteDiary(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: diaryKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: diaryKeys.all })
    },
  })
}
