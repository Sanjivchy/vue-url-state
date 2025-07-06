import { ref, watch, onMounted, type Ref } from "vue";
import { useRoute, useRouter } from "vue-router";

// Supported query value types
type SupportedType = string | number | boolean | string[] | number[] | null;

// Options interface
interface UseQueryStateOptions<T extends SupportedType> {
  parse?: (val: string | string[] | null | undefined) => T;
  serialize?: (val: T) => string | string[] | null;
  replace?: boolean;
  debounce?: number;
}

// Type-safe custom debounce function
function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Main composable
export function useQueryState<T extends SupportedType>(
  key: string,
  defaultValue: T,
  options: UseQueryStateOptions<T> = {}
): Ref<T> {
  const route = useRoute();
  const router = useRouter();

  const parse = options.parse ?? defaultParser(defaultValue);
  const serialize = options.serialize ?? defaultSerializer(defaultValue);
  const replace = options.replace ?? false;
  const debounceDelay = options.debounce ?? 0;

  const state = ref<T>(defaultValue) as Ref<T>;

  const syncQuery = (val: T) => {
    const query = { ...route.query };
    const serialized = serialize(val);

    const isEmpty =
      serialized === null ||
      (Array.isArray(serialized) && serialized.length === 0) ||
      (typeof serialized === "string" && serialized.trim() === "");

    if (isEmpty) {
      delete query[key];
    } else {
      query[key] = serialized;
    }

    router[replace ? "replace" : "push"]({ query }).catch(() => {});
  };

  const updateQuery =
    debounceDelay > 0 ? debounce(syncQuery, debounceDelay) : syncQuery;

  onMounted(() => {
    const raw = route.query[key];
    state.value = parse(raw as string | string[] | null | undefined);
  });

  watch(state, (newVal) => {
    updateQuery(newVal);
  });

  watch(
    () => route.query[key],
    (val) => {
      const normalized = Array.isArray(val)
        ? val.filter((v): v is string => v !== null)
        : val === null
        ? undefined
        : val;

      state.value = parse(normalized);
    }
  );

  return state;
}

// Default parser
function defaultParser<T extends SupportedType>(defaultVal: T) {
  return (val: string | string[] | null | undefined): T => {
    if (val === undefined || val === null) return defaultVal;

    if (typeof defaultVal === "number") {
      const num = Number(val);
      return (isNaN(num) ? defaultVal : num) as T;
    }

    if (typeof defaultVal === "boolean") {
      return (val === "true") as T;
    }

    if (Array.isArray(defaultVal)) {
      if (!val) return defaultVal;
      const arr = Array.isArray(val) ? val : [val];
      if (defaultVal.length === 0) return arr as T;
      return arr.map((v) =>
        typeof defaultVal[0] === "number" ? Number(v) : v
      ) as T;
    }

    return val as string as T;
  };
}

// Default serializer
function defaultSerializer<T extends SupportedType>(defaultVal: T) {
  return (val: T): string | string[] | null => {
    if (val === defaultVal) return null;
    if (val === null || val === undefined) return null;
    if (typeof val === "boolean") return val ? "true" : "false";
    if (typeof val === "number") return String(val);
    if (typeof val === "string") return val;
    if (Array.isArray(val)) return val.map((v) => String(v));
    return null;
  };
}

// Export types for consumers
export type { SupportedType, UseQueryStateOptions, defaultSerializer };
