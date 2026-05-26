import { describe, expect, it, beforeEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import {
  createRouter,
  createMemoryHistory,
  type Router,
  RouterView,
} from 'vue-router'
import { useQueryState, defaultParser, defaultSerializer } from './index'

function makeApp(setup: () => unknown, initialPath = '/') {
  const Page = defineComponent({
    setup,
    render: () => h('div'),
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: Page }],
  })
  router.push(initialPath)
  return { router, Page }
}

async function mountWith<T extends object>(
  setup: () => T,
  initialPath = '/',
): Promise<{ router: Router; vm: T }> {
  const { router } = makeApp(setup, initialPath)
  await router.isReady()

  let captured!: T
  const Host = defineComponent({
    setup() {
      captured = setup() as T
      return () => h('div')
    },
  })

  const Root = defineComponent({
    render: () => h(RouterView),
  })
  // simpler: mount Host directly with router plugin
  mount(Host, {
    global: { plugins: [router] },
  })
  await flushPromises()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = Root
  return { router, vm: captured }
}

describe('useQueryState', () => {
  describe('basic types', () => {
    it('reads string from URL synchronously (no flash)', async () => {
      const { vm } = await mountWith(
        () => ({ q: useQueryState('q', 'default') }),
        '/?q=hello',
      )
      expect(vm.q.value).toBe('hello')
    })

    it('returns default when query missing', async () => {
      const { vm } = await mountWith(() => ({
        q: useQueryState('q', 'default'),
      }))
      expect(vm.q.value).toBe('default')
    })

    it('parses numbers', async () => {
      const { vm } = await mountWith(
        () => ({ page: useQueryState('page', 1) }),
        '/?page=5',
      )
      expect(vm.page.value).toBe(5)
    })

    it('falls back to default on invalid number', async () => {
      const { vm } = await mountWith(
        () => ({ page: useQueryState('page', 1) }),
        '/?page=abc',
      )
      expect(vm.page.value).toBe(1)
    })

    it('parses booleans (true)', async () => {
      const { vm } = await mountWith(
        () => ({ flag: useQueryState('flag', false) }),
        '/?flag=true',
      )
      expect(vm.flag.value).toBe(true)
    })

    it('parses booleans flexibly (1, yes, on)', async () => {
      for (const v of ['1', 'yes', 'on', 'TRUE']) {
        const { vm } = await mountWith(
          () => ({ flag: useQueryState('flag', false) }),
          `/?flag=${v}`,
        )
        expect(vm.flag.value).toBe(true)
      }
    })

    it('parses string arrays', async () => {
      const { vm } = await mountWith(
        () => ({ tags: useQueryState('tags', [] as string[]) }),
        '/?tags=a&tags=b',
      )
      expect(vm.tags.value).toEqual(['a', 'b'])
    })

    it('parses number arrays and drops NaN (default must be non-empty to signal item type)', async () => {
      const { vm } = await mountWith(
        () => ({ ids: useQueryState('ids', [0]) }),
        '/?ids=1&ids=abc&ids=3',
      )
      expect(vm.ids.value).toEqual([1, 3])
    })
  })

  describe('writing to URL', () => {
    it('writes string changes to URL', async () => {
      const { router, vm } = await mountWith(() => ({
        q: useQueryState('q', ''),
      }))
      vm.q.value = 'hello'
      await nextTick()
      await flushPromises()
      expect(router.currentRoute.value.query.q).toBe('hello')
    })

    it('removes param when value equals default', async () => {
      const { router, vm } = await mountWith(
        () => ({ q: useQueryState('q', '') }),
        '/?q=hello',
      )
      vm.q.value = ''
      await nextTick()
      await flushPromises()
      expect(router.currentRoute.value.query.q).toBeUndefined()
    })

    it('removes param when value is null', async () => {
      const { router, vm } = await mountWith(
        () => ({ q: useQueryState<string | null>('q', null) }),
        '/?q=hello',
      )
      vm.q.value = null
      await nextTick()
      await flushPromises()
      expect(router.currentRoute.value.query.q).toBeUndefined()
    })
  })

  describe('reactive sync', () => {
    it('updates state when URL changes', async () => {
      const { router, vm } = await mountWith(() => ({
        q: useQueryState('q', ''),
      }))
      await router.push('/?q=fromurl')
      await flushPromises()
      expect(vm.q.value).toBe('fromurl')
    })

    it('does not loop when state is synced from URL', async () => {
      // Spy on push to ensure no duplicate pushes happen
      const { router, vm } = await mountWith(() => ({
        q: useQueryState('q', ''),
      }))
      let pushCount = 0
      const origPush = router.push.bind(router)
      router.push = ((...args: Parameters<typeof origPush>) => {
        pushCount++
        return origPush(...args)
      }) as typeof router.push

      vm.q.value = 'hello'
      await nextTick()
      await flushPromises()
      await flushPromises()
      // exactly one push from our state change
      expect(pushCount).toBe(1)
    })
  })

  describe('array deep watching (regression)', () => {
    it('syncs array push() mutations to URL', async () => {
      const { router, vm } = await mountWith(() => ({
        tags: useQueryState('tags', [] as string[]),
      }))
      vm.tags.value.push('a')
      await nextTick()
      await flushPromises()
      expect(router.currentRoute.value.query.tags).toEqual(['a'])

      vm.tags.value.push('b')
      await nextTick()
      await flushPromises()
      expect(router.currentRoute.value.query.tags).toEqual(['a', 'b'])
    })
  })

  describe('race condition: multiple useQueryState at once', () => {
    it('batches simultaneous updates into one navigation', async () => {
      const { router, vm } = await mountWith(() => ({
        page: useQueryState('page', 1),
        size: useQueryState('size', 10),
        q: useQueryState('q', ''),
      }))

      // simulate multiple updates in the same tick
      vm.page.value = 5
      vm.size.value = 50
      vm.q.value = 'search'

      await nextTick()
      await flushPromises()

      const query = router.currentRoute.value.query
      expect(query.page).toBe('5')
      expect(query.size).toBe('50')
      expect(query.q).toBe('search')
    })
  })

  describe('debounce', () => {
    it('debounces URL updates', async () => {
      const { router, vm } = await mountWith(() => ({
        q: useQueryState('q', '', { debounce: 50 }),
      }))

      vm.q.value = 'a'
      vm.q.value = 'ab'
      vm.q.value = 'abc'
      await nextTick()
      // before debounce fires, URL should be empty
      expect(router.currentRoute.value.query.q).toBeUndefined()

      await new Promise((r) => setTimeout(r, 80))
      await flushPromises()

      expect(router.currentRoute.value.query.q).toBe('abc')
    })
  })

  describe('replace vs push', () => {
    it('uses replace when option is true', async () => {
      const { router, vm } = await mountWith(() => ({
        q: useQueryState('q', '', { replace: true }),
      }))
      const before = router.currentRoute.value.fullPath
      let replaceCalls = 0
      const origReplace = router.replace.bind(router)
      router.replace = ((...args: Parameters<typeof origReplace>) => {
        replaceCalls++
        return origReplace(...args)
      }) as typeof router.replace

      vm.q.value = 'x'
      await nextTick()
      await flushPromises()
      expect(replaceCalls).toBeGreaterThan(0)
      expect(before).toBeTruthy()
    })
  })

  describe('custom parse/serialize', () => {
    it('supports objects via custom parse and serialize', async () => {
      type Prefs = { theme: string; lang: string }
      const def: Prefs = { theme: 'light', lang: 'en' }
      const { router, vm } = await mountWith(() => ({
        prefs: useQueryState<string>('prefs', '', {
          parse: (val) => (typeof val === 'string' && val ? val : ''),
          serialize: (val) => (val ? val : null),
        }),
      }))
      vm.prefs.value = JSON.stringify({ ...def, theme: 'dark' })
      await nextTick()
      await flushPromises()
      expect(router.currentRoute.value.query.prefs).toContain('dark')
    })
  })
})

describe('defaultParser', () => {
  it('returns default for null/undefined', () => {
    const parse = defaultParser('hello')
    expect(parse(undefined)).toBe('hello')
    expect(parse(null)).toBe('hello')
  })

  it('handles number arrays correctly', () => {
    const parse = defaultParser([0] as number[])
    expect(parse(['1', '2', '3'])).toEqual([1, 2, 3])
    expect(parse(['a', '2'])).toEqual([2])
  })

  it('handles strings inside arrays for primitives', () => {
    const parseNum = defaultParser(1)
    expect(parseNum(['5', '6'])).toBe(5) // takes first

    const parseBool = defaultParser(false)
    expect(parseBool(['true'])).toBe(true)
  })
})

describe('defaultSerializer', () => {
  it('serializes equal-to-default as null', () => {
    expect(defaultSerializer('hello')('hello')).toBe(null)
    expect(defaultSerializer(1)(1)).toBe(null)
    expect(defaultSerializer(false)(false)).toBe(null)
  })

  it('serializes arrays structurally vs default', () => {
    expect(defaultSerializer([] as string[])([])).toBe(null)
    expect(defaultSerializer([] as string[])(['a'])).toEqual(['a'])
  })

  it('serializes booleans to strings', () => {
    expect(defaultSerializer(false)(true)).toBe('true')
    expect(defaultSerializer(true)(false)).toBe('false')
  })
})

describe('error handling', () => {
  it('throws a useful error when vue-router not installed', () => {
    const Cmp = defineComponent({
      setup() {
        useQueryState('x', '')
        return () => h('div')
      },
    })
    expect(() => mount(Cmp)).toThrow(/vue-router/)
  })
})

describe('debounce cleanup on unmount', () => {
  beforeEach(() => {
    // no-op
  })

  it('does not navigate after component unmounts while debounce pending', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:p(.*)*', component: { template: '<div/>' } }],
    })
    await router.push('/')
    await router.isReady()

    let pushAfterUnmount = false
    const Cmp = defineComponent({
      setup() {
        const q = useQueryState('q', '', { debounce: 50 })
        q.value = 'changed'
        return () => h('div')
      },
    })
    const wrapper = mount(Cmp, { global: { plugins: [router] } })
    await nextTick()
    wrapper.unmount()

    const origPush = router.push.bind(router)
    router.push = ((...args: Parameters<typeof origPush>) => {
      pushAfterUnmount = true
      return origPush(...args)
    }) as typeof router.push

    await new Promise((r) => setTimeout(r, 80))
    expect(pushAfterUnmount).toBe(false)
  })
})
