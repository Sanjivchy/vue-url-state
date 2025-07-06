# vue-url-state

> A Vue 3 composable to sync reactive state with the URL query string. Ideal for filters, pagination, tabs, or any state you want reflected in the URL.

[![npm version](https://badge.fury.io/js/vue-url-state.svg)](https://www.npmjs.com/package/vue-url-state)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## ✨ Features

- 🔁 Bi-directional sync between query params and Vue state
- 🎯 Supports strings, numbers, booleans, and arrays
- 🧩 Custom `parse` and `serialize` support
- ⏱ Optional debounce
- 🛠 Built with TypeScript

---

## 📦 Installation

```bash
npm install vue-url-state
```

> Requires Vue 3 and Vue Router 4

---

## 🚀 Basic Usage

```ts
import { useQueryState } from 'vue-url-state'

const search = useQueryState('search', '', { debounce: 300 })
const page = useQueryState('page', 1)
```

When `search.value` or `page.value` changes, the URL updates:

```
?search=vue&page=1
```

When the URL changes manually or via navigation, the state updates as well.

---

## ✅ Inside setup()

```ts
setup() {
  const tags = useQueryState<string[]>('tags', [])
  const sort = useQueryState('sort', 'recent')

  return { tags, sort }
}
```

This syncs your component state with the URL query:

```
?tags=vue&tags=js&sort=recent
```

---

## ⚙️ Options

You can pass an options object as the third argument:

```ts
useQueryState('key', defaultValue, {
  parse: (val) => ...,        // optional parse function
  serialize: (val) => ...,    // optional serialize function
  replace: true,              // use router.replace() instead of push()
  debounce: 300               // debounce time in ms
})
```

### Available Options

| Option      | Type                                              | Description                                                   |
|-------------|---------------------------------------------------|---------------------------------------------------------------|
| `parse`     | `(val: string \| string[] \| null \| undefined) => T` | Function to convert the query param into your value type    |
| `serialize` | `(val: T) => string \| string[] \| null`           | Function to convert your value to query param format         |
| `replace`   | `boolean`                                         | Use `router.replace()` instead of `router.push()`            |
| `debounce`  | `number` (ms)                                     | Debounce the router update by X milliseconds                 |

---

## 🔧 Custom Serialization Example

```ts
const range = useQueryState<[number, number]>('range', [0, 100], {
  parse: (val) => {
    const [min, max] = (val as string)?.split('-').map(Number) ?? []
    return [min || 0, max || 100]
  },
  serialize: (val) => `${val[0]}-${val[1]}`
})
```

This will sync with:

```
?range=10-50
```

---

## 🧪 TypeScript Support

The `useQueryState` composable is fully typed. The return type is automatically inferred from the `defaultValue` you provide.

---

## 📁 Project Structure

```
vue-url-state/
├── src/
│   └── index.ts       # Main composable
├── dist/              # Compiled output (after build)
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🛠 Local Development

To test the package locally before publishing:

```bash
# Link this package locally
npm link

# Then in another Vue project
npm link vue-url-state
```

To build:

```bash
npm run build
```

---

## 📜 License

MIT © Your Name

---

## 🙋‍♀️ Contributing

Pull requests, issues, and feedback are welcome! Let’s improve this together.

---

## 🔗 Related Links

- [Vue 3 Documentation](https://vuejs.org)
- [Vue Router](https://router.vuejs.org)
