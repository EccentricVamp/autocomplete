export interface AutocompleteItem {
    label: string;
    group?: string;
}
export interface AutocompleteSettings<T extends AutocompleteItem> {
    input: HTMLInputElement;
    render?: (item: T, currentValue: string) => HTMLDivElement | undefined;
    renderGroup?: (name: string, currentValue: string) => HTMLDivElement | undefined;
    className?: string;
    minLength?: number;
    emptyMsg?: string;
    onSelect: (item: T, input: HTMLInputElement) => void;
    fetch: (text: string, update: (items: Array<T>) => void) => void;
}
export interface AutocompleteResult {
    destroy: () => void;
}
export declare function autocomplete<T extends AutocompleteItem>(settings: AutocompleteSettings<T>): AutocompleteResult;
export default autocomplete;
