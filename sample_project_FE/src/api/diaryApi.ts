import { api } from './axios'
import type {
  DiaryEntry,
  DiaryEntryRequest,
  DiaryListParams,
  DiarySearchParams,
  PageResponse,
} from '../types/api'

export const diaryApi = {
  async getDiaries(params: DiaryListParams = {}): Promise<PageResponse<DiaryEntry>> {
    const { data } = await api.get<PageResponse<DiaryEntry>>('/diaries', { params })
    return data
  },

  async searchDiaries(params: DiarySearchParams): Promise<PageResponse<DiaryEntry>> {
    const { data } = await api.get<PageResponse<DiaryEntry>>('/diaries/search', { params })
    return data
  },

  async getDiary(id: string): Promise<DiaryEntry> {
    const { data } = await api.get<DiaryEntry>(`/diaries/${id}`)
    return data
  },

  async createDiary(payload: DiaryEntryRequest): Promise<DiaryEntry> {
    const { data } = await api.post<DiaryEntry>('/diaries', payload)
    return data
  },

  async updateDiary(id: string, payload: DiaryEntryRequest): Promise<DiaryEntry> {
    const { data } = await api.put<DiaryEntry>(`/diaries/${id}`, payload)
    return data
  },

  async deleteDiary(id: string): Promise<void> {
    await api.delete(`/diaries/${id}`)
  },
}
