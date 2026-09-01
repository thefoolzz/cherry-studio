import { MockUsePreferenceUtils } from '@test-mocks/renderer/usePreference'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSidebarFavorites } from '../useSidebarFavorites'

describe('useSidebarFavorites', () => {
  beforeEach(() => {
    MockUsePreferenceUtils.resetMocks()
  })

  it('should skip removing a mini app that is not favorited', () => {
    const setFavorites = vi.fn().mockResolvedValue(undefined)
    MockUsePreferenceUtils.mockPreferenceReturn(
      'ui.sidebar.favorites',
      [{ type: 'mini_app', id: 'other-app' }],
      setFavorites
    )

    const { result } = renderHook(() => useSidebarFavorites())

    act(() => {
      result.current.removeMiniApp('missing-app')
    })

    expect(setFavorites).not.toHaveBeenCalled()
  })

  describe('entity favorites (assistants)', () => {
    const REQUIRED_ASSISTANTS = { type: 'app', id: 'assistants' } as const

    it('toggles an assistant favorite on', () => {
      const setFavorites = vi.fn().mockResolvedValue(undefined)
      MockUsePreferenceUtils.mockPreferenceReturn('ui.sidebar.favorites', [], setFavorites)

      const { result } = renderHook(() => useSidebarFavorites())

      act(() => {
        result.current.toggleAssistant('assistant-1')
      })

      // Mutations operate on the ordered visible list, so the required
      // assistants app is persisted alongside the newly added entity.
      expect(setFavorites).toHaveBeenCalledWith([REQUIRED_ASSISTANTS, { type: 'assistant', id: 'assistant-1' }])
    })

    it('toggles an assistant favorite off and removes it from assistantFavoriteIds', () => {
      const setFavorites = vi.fn().mockResolvedValue(undefined)
      MockUsePreferenceUtils.mockPreferenceReturn(
        'ui.sidebar.favorites',
        [{ type: 'assistant', id: 'assistant-1' }],
        setFavorites
      )

      const { result } = renderHook(() => useSidebarFavorites())
      expect(result.current.assistantFavoriteIds).toEqual(['assistant-1'])

      act(() => {
        result.current.toggleAssistant('assistant-1')
      })

      expect(setFavorites).toHaveBeenCalledWith([REQUIRED_ASSISTANTS])
    })

    it('picks assistant favorite ids out of the mixed list', () => {
      MockUsePreferenceUtils.mockPreferenceReturn('ui.sidebar.favorites', [
        { type: 'agent', id: 'agent-1' },
        { type: 'assistant', id: 'assistant-1' },
        { type: 'mini_app', id: 'calculator' }
      ])

      const { result } = renderHook(() => useSidebarFavorites())

      expect(result.current.assistantFavoriteIds).toEqual(['assistant-1'])
    })

    it('removes one assistant favorite and keeps the rest of the list', () => {
      const setFavorites = vi.fn().mockResolvedValue(undefined)
      MockUsePreferenceUtils.mockPreferenceReturn(
        'ui.sidebar.favorites',
        [
          { type: 'assistant', id: 'assistant-1' },
          { type: 'assistant', id: 'assistant-2' }
        ],
        setFavorites
      )

      const { result } = renderHook(() => useSidebarFavorites())

      act(() => {
        result.current.removeAssistant('assistant-1')
      })

      expect(setFavorites).toHaveBeenCalledWith([REQUIRED_ASSISTANTS, { type: 'assistant', id: 'assistant-2' }])
    })

    it('skips removing an assistant that is not favorited', () => {
      const setFavorites = vi.fn().mockResolvedValue(undefined)
      MockUsePreferenceUtils.mockPreferenceReturn('ui.sidebar.favorites', [], setFavorites)

      const { result } = renderHook(() => useSidebarFavorites())

      act(() => {
        result.current.removeAssistant('missing-assistant')
      })

      expect(setFavorites).not.toHaveBeenCalled()
    })
  })
})
