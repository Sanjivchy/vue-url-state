# vue-url-state

A Vue 3 composable for syncing reactive state with URL query parameters. Automatically keeps your component state in sync with the URL, making it perfect for search filters, pagination, tabs, and other stateful UI components that should be bookmarkable and shareable.

## Features

- 🔄 **Bidirectional sync** - Component state ↔ URL query parameters
- 🎯 **Type-safe** - Full TypeScript support with proper type inference
- 🚀 **Vue 3 + Vue Router 4** - Built specifically for the modern Vue ecosystem
- 🎛️ **Flexible parsing** - Supports strings, numbers, booleans, and arrays
- ⚡ **Debounced updates** - Prevents excessive URL updates
- 🔧 **Customizable** - Custom parsers and serializers for complex data types
- 📦 **Lightweight** - Zero dependencies beyond Vue ecosystem

## Installation

```bash
npm install vue-url-state
```

## Basic Usage

```vue
<template>
  <div>
    <input v-model="searchTerm" placeholder="Search..." />
    <p>Search term: {{ searchTerm }}</p>
  </div>
</template>

<script setup>
import { useQueryState } from 'vue-url-state'

// Syncs with ?search=... in URL
const searchTerm = useQueryState('search', '')
</script>
```

## Supported Types

The composable automatically handles type conversion for:

- `string` - Direct string values
- `number` - Parsed from string to number
- `boolean` - 'true'/'false' string conversion
- `string[]` - Array of strings
- `number[]` - Array of numbers parsed from strings
- `null` - Removes parameter from URL when null

## Examples

### Search with Debouncing

```vue
<script setup>
import { useQueryState } from 'vue-url-state'

const searchTerm = useQueryState('q', '', {
  debounce: 300 // Wait 300ms before updating URL
})
</script>
```

### Pagination

```vue
<script setup>
import { useQueryState } from 'vue-url-state'

const currentPage = useQueryState('page', 1)
const pageSize = useQueryState('size', 10)
</script>
```

### Filters with Arrays

```vue
<script setup>
import { useQueryState } from 'vue-url-state'

const selectedTags = useQueryState('tags', [])
const selectedIds = useQueryState('ids', [0]) // Array of numbers
</script>
```

### Boolean Toggles

```vue
<script setup>
import { useQueryState } from 'vue-url-state'

const showAdvanced = useQueryState('advanced', false)
const isPublished = useQueryState('published', true)
</script>
```

### Replace vs Push Navigation

```vue
<script setup>
import { useQueryState } from 'vue-url-state'

// Default: adds to browser history
const searchTerm = useQueryState('search', '')

// Replace: replaces current history entry
const filterTerm = useQueryState('filter', '', {
  replace: true
})
</script>
```

## Advanced Usage

### Custom Parsers and Serializers

```vue
<script setup>
import { useQueryState } from 'vue-url-state'

// Custom date handling
const selectedDate = useQueryState('date', new Date(), {
  parse: (val) => val ? new Date(val) : new Date(),
  serialize: (date) => date.toISOString().split('T')[0]
})

// Custom object handling
const userPrefs = useQueryState('prefs', { theme: 'light', lang: 'en' }, {
  parse: (val) => {
    try {
      return val ? JSON.parse(val) : { theme: 'light', lang: 'en' }
    } catch {
      return { theme: 'light', lang: 'en' }
    }
  },
  serialize: (obj) => JSON.stringify(obj)
})
</script>
```

### Complete Search Example

```vue
<template>
  <div>
    <input v-model="searchTerm" placeholder="Search..." />
    <select v-model="category">
      <option value="">All Categories</option>
      <option value="posts">Posts</option>
      <option value="users">Users</option>
    </select>
    <label>
      <input v-model="showAdvanced" type="checkbox" />
      Show Advanced Options
    </label>
    <div v-if="showAdvanced">
      <input v-model="minPrice" type="number" placeholder="Min Price" />
      <input v-model="maxPrice" type="number" placeholder="Max Price" />
    </div>
    <button @click="currentPage = 1">Reset Page</button>
    <div>Page: {{ currentPage }}</div>
  </div>
</template>

<script setup>
import { useQueryState } from 'vue-query-state'

const searchTerm = useQueryState('q', '', { debounce: 300 })
const category = useQueryState('category', '')
const showAdvanced = useQueryState('advanced', false)
const minPrice = useQueryState('min', 0)
const maxPrice = useQueryState('max', 1000)
const currentPage = useQueryState('page', 1)
</script>
```

## API Reference

### `useQueryState(key, defaultValue, options)`

Main composable function for syncing state with URL query parameters.

**Parameters:**
- `key` - The query parameter key
- `defaultValue` - Default value and type inference
- `options` - Configuration options

**Returns:** `Ref<T>` - Reactive reference synced with URL

### `defaultParser(defaultValue)`

Utility function that creates a default parser based on the default value type.

```javascript
import { defaultParser, defaultSerializer } from 'vue-url-state'

const customParser = defaultParser('') // Creates a string parser
const result = customParser('hello') // Returns 'hello'
```

### `defaultSerializer(defaultValue)`

Utility function that creates a default serializer based on the default value type.

```javascript
import { defaultSerializer } from 'vue-url-state'

const customSerializer = defaultSerializer('')
const result = customSerializer('hello') // Returns 'hello'
```

### Types

```typescript
import type { SupportedType, UseQueryStateOptions } from 'vue-url-state'

// SupportedType = string | number | boolean | string[] | number[] | null
// UseQueryStateOptions<T> = { parse?, serialize?, replace?, debounce? }
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `parse` | `(val: string \| string[] \| null \| undefined) => T` | Auto-generated | Custom parser for converting URL values to your type |
| `serialize` | `(val: T) => string \| string[] \| null` | Auto-generated | Custom serializer for converting your type to URL values |
| `replace` | `boolean` | `false` | Use `router.replace()` instead of `router.push()` |
| `debounce` | `number` | `0` | Debounce delay in milliseconds before updating URL |

## Type Safety

The composable provides full TypeScript support with automatic type inference:

```typescript
const searchTerm = useQueryState('search', '') // Ref<string>
const count = useQueryState('count', 0) // Ref<number>
const isActive = useQueryState('active', false) // Ref<boolean>
const tags = useQueryState('tags', ['']) // Ref<string[]>
const ids = useQueryState('ids', [0]) // Ref<number[]>
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.