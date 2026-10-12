import {
  type FocusEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

interface FocusReturnTooltipProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FocusReturnTooltipTriggerProps {
  onFocus: (event: FocusEvent<HTMLElement>) => void
  onBlur: () => void
}

interface UseFocusReturnTooltipResult {
  tooltipProps: FocusReturnTooltipProps
  triggerProps: FocusReturnTooltipTriggerProps
  markFocusReturn: () => void
}

export const useFocusReturnTooltip = (): UseFocusReturnTooltipResult => {
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const focusReturnRef = useRef(false)
  const focusedTriggerRef = useRef<HTMLElement | null>(null)
  const scrollWhileFocusedRef = useRef(false)

  useEffect(() => {
    const markScrollWhileFocused = (event: Event) => {
      const trigger = focusedTriggerRef.current
      scrollWhileFocusedRef.current =
        openRef.current &&
        trigger !== null &&
        event.target instanceof Node &&
        event.target.contains(trigger) &&
        trigger.matches(":focus-visible")
    }
    const clearScrollWhileFocused = () => {
      scrollWhileFocusedRef.current = false
    }

    window.addEventListener("scroll", markScrollWhileFocused, { capture: true })
    document.addEventListener("scroll", clearScrollWhileFocused, {
      capture: true,
    })
    return () => {
      window.removeEventListener("scroll", markScrollWhileFocused, {
        capture: true,
      })
      document.removeEventListener("scroll", clearScrollWhileFocused, {
        capture: true,
      })
    }
  }, [])

  const onOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen && focusReturnRef.current) {
      focusReturnRef.current = false
      return
    }
    if (!nextOpen && scrollWhileFocusedRef.current) return
    openRef.current = nextOpen
    setOpen(nextOpen)
  }, [])

  const onFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    focusedTriggerRef.current = event.currentTarget
  }, [])

  const onBlur = useCallback(() => {
    focusedTriggerRef.current = null
    focusReturnRef.current = false
    scrollWhileFocusedRef.current = false
  }, [])

  const markFocusReturn = useCallback(() => {
    focusReturnRef.current = true
  }, [])

  return {
    tooltipProps: { open, onOpenChange },
    triggerProps: { onFocus, onBlur },
    markFocusReturn,
  }
}
