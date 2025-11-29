import { useEffect, useRef } from 'react'

/**
 * Hook for managing AbortController lifecycle
 *
 * Automatically creates an AbortController and cleans it up on unmount
 * or when dependencies change. Prevents memory leaks from cancelled requests.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const signal = useAbortController()
 *
 *   useEffect(() => {
 *     fetchData({ signal })
 *       .catch(err => {
 *         if (err.name === 'AbortError') return
 *         console.error(err)
 *       })
 *   }, [signal])
 * }
 * ```
 */
export function useAbortController(): AbortSignal {
  const controllerRef = useRef<AbortController>(new AbortController())

  useEffect(() => {
    const controller = controllerRef.current

    return () => {
      // Abort all pending requests when component unmounts
      controller.abort()
    }
  }, [])

  return controllerRef.current.signal
}

/**
 * Hook for creating multiple AbortControllers with manual control
 *
 * Useful when you need to cancel specific operations independently
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { signal, abort, reset } = useAbortControllerWithReset()
 *
 *   const handleCancel = () => {
 *     abort()
 *     reset() // Create new controller for next request
 *   }
 * }
 * ```
 */
export function useAbortControllerWithReset() {
  const controllerRef = useRef<AbortController>(new AbortController())

  const abort = () => {
    controllerRef.current.abort()
  }

  const reset = () => {
    controllerRef.current = new AbortController()
  }

  useEffect(() => {
    return () => {
      controllerRef.current.abort()
    }
  }, [])

  return {
    signal: controllerRef.current.signal,
    abort,
    reset,
  }
}
