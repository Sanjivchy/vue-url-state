import { type Ref } from "vue";
type SupportedType = string | number | boolean | string[] | number[] | null;
interface UseQueryStateOptions<T extends SupportedType> {
    parse?: (val: string | string[] | null | undefined) => T;
    serialize?: (val: T) => string | string[] | null;
    replace?: boolean;
    debounce?: number;
}
export declare function useQueryState<T extends SupportedType>(key: string, defaultValue: T, options?: UseQueryStateOptions<T>): Ref<T>;
export {};
