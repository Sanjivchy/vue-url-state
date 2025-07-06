import { ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
// Custom debounce helper
function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}
export function useQueryState(key, defaultValue, options = {}) {
    const route = useRoute();
    const router = useRouter();
    const parse = options.parse ?? defaultParser(defaultValue);
    const serialize = options.serialize ?? defaultSerializer(defaultValue);
    const replace = options.replace ?? false;
    const debounceDelay = options.debounce ?? 0;
    const state = ref(defaultValue);
    const syncQuery = (val) => {
        const query = { ...route.query };
        const serialized = serialize(val);
        if (serialized === null ||
            (Array.isArray(serialized) && serialized.length === 0) ||
            (typeof serialized === "string" && serialized.trim() === "")) {
            delete query[key];
        }
        else {
            query[key] = serialized;
        }
        router[replace ? "replace" : "push"]({ query }).catch(() => { });
    };
    const updateQuery = debounceDelay
        ? debounce(syncQuery, debounceDelay)
        : syncQuery;
    onMounted(() => {
        const raw = route.query[key];
        state.value = parse(raw);
    });
    watch(state, (newVal) => {
        updateQuery(newVal);
    });
    watch(() => route.query[key], (val) => {
        const normalized = Array.isArray(val)
            ? val.filter((v) => v !== null)
            : val === null
                ? undefined
                : val;
        state.value = parse(normalized);
    });
    return state;
}
function defaultParser(defaultVal) {
    return (val) => {
        if (val === undefined || val === null)
            return defaultVal;
        if (typeof defaultVal === "number") {
            const num = Number(val);
            return (isNaN(num) ? defaultVal : num);
        }
        if (typeof defaultVal === "boolean") {
            return (val === "true");
        }
        if (Array.isArray(defaultVal)) {
            if (!val)
                return defaultVal;
            const arr = Array.isArray(val) ? val : [val];
            if (defaultVal.length === 0)
                return arr;
            return arr.map((v) => typeof defaultVal[0] === "number" ? Number(v) : v);
        }
        return val;
    };
}
function defaultSerializer(defaultVal) {
    return (val) => {
        if (val === defaultVal)
            return null;
        if (val === null || val === undefined)
            return null;
        if (typeof val === "boolean")
            return val ? "true" : "false";
        if (typeof val === "number")
            return String(val);
        if (typeof val === "string")
            return val;
        if (Array.isArray(val))
            return val.map((v) => String(v));
        return null;
    };
}
//# sourceMappingURL=index.js.map