import {
  ref,
  watch,
  nextTick,
  getCurrentScope,
  onScopeDispose,
  type Ref,
} from 'vue'
import { useRoute, useRouter, type Router } from 'vue-router'

type SupportedType = string | number | boolean | string[] | number[] | null

type QueryValue = string | string[] | null

interface UseQueryStateOptions<T> {
  parse?: (val: string | string[] | null | undefined) => T
  serialize?: (val: T) => QueryValue
  replace?: boolean
  debounce?: number
  deep?: boolean
}

interface PendingFlush {
  changes: Record<string, QueryValue>
  replace: boolean
}

const pending = new WeakMap<Router, PendingFlush>()

function scheduleQueryUpdate(
  router: Router,
  key: string,
  serialized: QueryValue,
  replace: boolean,
): void {
  let flush = pending.get(router)
  if (!flush) {
    flush = { changes: {}, replace }
    pending.set(router, flush)
    void nextTick(() => {
      const current = pending.get(router)
      if (!current) return
      pending.delete(router)

      const query: Record<string, QueryValue> = {
        ...(router.currentRoute.value.query as Record<string, QueryValue>),
      }
      for (const [k, v] of Object.entries(current.changes)) {
        if (v === null) delete query[k]
        else query[k] = v
      }

      const method = current.replace ? 'replace' : 'push'
      void router[method]({ query }).catch((err: unknown) => {
        if (isExpectedNavigationFailure(err)) return
        if (typeof console !== 'undefined') {
          console.warn('[vue-url-state] navigation failed:', err)
        }
      })
    })
  }
  flush.changes[key] = serialized
  if (!replace) flush.replace = false
}

function isExpectedNavigationFailure(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: string; type?: number }
  if (e.name === 'NavigationDuplicated') return true
  // vue-router 4 NavigationFailureType: aborted=4, cancelled=8, duplicated=16
  if (e.type === 4 || e.type === 8 || e.type === 16) return true
  return false
}

function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): ((...args: Args) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = ((...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, delay)
  }) as ((...args: Args) => void) & { cancel: () => void }
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  return debounced
}

function normalizeRaw(
  val: string | (string | null)[] | null | undefined,
): string | string[] | null | undefined {
  if (val === undefined) return undefined
  if (val === null) return null
  if (Array.isArray(val)) {
    return val.filter((v): v is string => v !== null && v !== undefined)
  }
  return val
}

function queryValueEqual(
  a: string | (string | null)[] | null | undefined,
  b: QueryValue,
): boolean {
  const aNorm = a === undefined ? null : a
  const bNorm = b
  if (aNorm === bNorm) return true
  if (aNorm == null && bNorm == null) return true
  if (Array.isArray(aNorm) && Array.isArray(bNorm)) {
    if (aNorm.length !== bNorm.length) return false
    return aNorm.every((v, i) => v === bNorm[i])
  }
  return false
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => v === b[i])
  }
  return false
}

export function useQueryState<T extends SupportedType>(
  key: string,
  defaultValue: T,
  options: UseQueryStateOptions<T> = {},
): Ref<T> {
  const route = useRoute()
  const router = useRouter()

  if (!route || !router) {
    throw new Error(
      '[vue-url-state] vue-router is not installed. useQueryState requires vue-router 4.x.',
    )
  }

  // Freeze a snapshot of the default so consumer mutations of the returned
  // ref cannot retroactively change what we consider "default" (would
  // otherwise break the equal-to-default → omit-from-URL behavior).
  const frozenDefault = (
    Array.isArray(defaultValue) ? [...defaultValue] : defaultValue
  ) as T

  const parse = options.parse ?? defaultParser(frozenDefault)
  const serialize = options.serialize ?? defaultSerializer(frozenDefault)
  const replace = options.replace ?? false
  const debounceDelay = options.debounce ?? 0
  const deep = options.deep ?? true

  // Synchronous initial read — no flash, SSR-friendly, no onMounted needed.
  const initial = parse(normalizeRaw(route.query[key]))
  const state = ref(initial) as Ref<T>

  const syncQuery = (val: T): void => {
    const serialized = serialize(val)
    const isEmpty =
      serialized === null ||
      (Array.isArray(serialized) && serialized.length === 0) ||
      (typeof serialized === 'string' && serialized === '')
    const finalVal: QueryValue = isEmpty ? null : serialized

    // Idempotent: skip when URL already matches — breaks the state↔route feedback loop.
    if (queryValueEqual(route.query[key], finalVal)) return

    scheduleQueryUpdate(router, key, finalVal, replace)
  }

  const debounced = debounceDelay > 0 ? debounce(syncQuery, debounceDelay) : null
  const update = debounced ?? syncQuery

  // Cancel any pending debounce so a freshly-unmounted component cannot navigate.
  if (debounced && getCurrentScope()) {
    onScopeDispose(() => debounced.cancel())
  }

  watch(state, (newVal) => update(newVal), { deep })

  watch(
    () => route.query[key],
    (val) => {
      const next = parse(normalizeRaw(val))
      if (!valuesEqual(state.value, next)) {
        state.value = next
      }
    },
  )

  return state
}

export function defaultParser<T extends SupportedType>(defaultVal: T) {
  // Always return a fresh array when falling back to a default array value
  // so callers cannot mutate the captured default through the ref.
  const fallback = (): T =>
    (Array.isArray(defaultVal) ? [...defaultVal] : defaultVal) as T

  return (val: string | string[] | null | undefined): T => {
    if (val === undefined || val === null) return fallback()

    if (typeof defaultVal === 'number') {
      const raw = Array.isArray(val) ? val[0] : val
      const num = Number(raw)
      return (Number.isFinite(num) ? num : defaultVal) as T
    }

    if (typeof defaultVal === 'boolean') {
      const raw = Array.isArray(val) ? val[0] : val
      const s = String(raw).toLowerCase()
      if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true as T
      if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false as T
      return defaultVal
    }

    if (Array.isArray(defaultVal)) {
      if (val === '') return fallback()
      const arr = Array.isArray(val) ? val : [val]
      const wantsNumbers =
        defaultVal.length > 0 && typeof defaultVal[0] === 'number'
      if (!wantsNumbers) return arr as T
      const parsed: number[] = []
      for (const v of arr) {
        const n = Number(v)
        if (Number.isFinite(n)) parsed.push(n)
      }
      return parsed as T
    }

    // string
    return (Array.isArray(val) ? val[0] ?? '' : val) as T
  }
}

export function defaultSerializer<T extends SupportedType>(defaultVal: T) {
  return (val: T): QueryValue => {
    if (val === null || val === undefined) return null

    // Structural equality with default → omit from URL (keeps URLs clean).
    if (Array.isArray(val) && Array.isArray(defaultVal)) {
      if (
        val.length === defaultVal.length &&
        val.every((v, i) => v === (defaultVal as unknown[])[i])
      ) {
        return null
      }
    } else if (
      typeof val === typeof defaultVal &&
      !Array.isArray(defaultVal) &&
      val === defaultVal
    ) {
      return null
    }

    if (typeof val === 'boolean') return val ? 'true' : 'false'
    if (typeof val === 'number') return String(val)
    if (typeof val === 'string') return val
    if (Array.isArray(val)) return val.map((v) => String(v))
    return null
  }
}

export type { SupportedType, UseQueryStateOptions, QueryValue }
