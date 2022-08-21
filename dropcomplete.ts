/**
 * @param {T} item - selected item
 */
type OnSelect<T> = (item: T, input: HTMLInputElement | HTMLTextAreaElement) => void;

/**
 * @param {string} text - text in the input field
 * @param {(items: T[] | false) => void} update - a callback function that must be called after suggestions are prepared
 * @param {boolean} isFocus - type of the event that triggered the fetch
 * @param {number} cursorPos - position of the cursor in the input field
 */
type Fetch<T> = (text: string, update: (items: T[] | false) => void, isFocus: boolean, cursorPos: number) => void;

export interface DropcompleteItem {
    label?: string;
    group?: string;
}

export interface DropcompleteSettings<T extends DropcompleteItem> {
    /**
     * dropcomplete will be attached to this element.
     */
    input: HTMLInputElement | HTMLTextAreaElement;

    /**
     * Specify the minimum text length required to show dropcomplete.
     */
    minLength?: number;

    /**
     * The message that will be showed when there are no suggestions that match the entered value.
     */
    emptyMsg?: string;

    /**
     * Show dropcomplete on focus event. Focus event will ignore the `minLength` property and will always call `fetch`.
     */
    showOnFocus?: boolean;

    /**
     * Prevents automatic form submit when ENTER is pressed
     */
    preventSubmit?: boolean;

    /**
     * This method will be called when user choose an item in dropcomplete.
     */
    onSelect: OnSelect<T>;

    /**
     * This method will be called to prepare suggestions and then pass them to dropcomplete.
     */
    fetch: Fetch<T>;
}

export default class Dropcomplete<T extends DropcompleteItem> {
    input: HTMLInputElement | HTMLTextAreaElement;
    minLen: number;
    emptyMsg?: string;
    showOnFocus?: boolean;
    preventSubmit: boolean;
    onSelect: OnSelect<T>
    fetch: Fetch<T>;

    container: HTMLDivElement;
    items: T[];
    inputValue: string;
    selected?: T;
    keypressCounter: number;

    constructor(settings: DropcompleteSettings<T>) {
        this.input = settings.input;
        this.minLen = settings.minLength ?? 2;
        this.emptyMsg = settings.emptyMsg;
        this.showOnFocus = settings.showOnFocus;
        this.preventSubmit = settings.preventSubmit || false;
        this.onSelect = settings.onSelect;
        this.fetch = settings.fetch;

        this.container = document.createElement("div");
        this.container.classList.add("dropcomplete");
        this.container.style.position = "absolute";

        this.items = [];
        this.inputValue = "";
        this.keypressCounter = 0;

        this.input.addEventListener("keydown", event => this.keydownEventHandler(event as KeyboardEvent));
        this.input.addEventListener("keyup", event => this.keyupEventHandler(event as KeyboardEvent));
        this.input.addEventListener("blur", () => this.blurEventHandler());
        this.input.addEventListener("focus", () => this.focusEventHandler());
        window.addEventListener("resize", () => this.resizeEventHandler());
        document.addEventListener("scroll", event => this.scrollEventHandler(event), true);
    }

    /**
     * Detach container from DOM
     */
    detach(): void {
        const parent = this.container.parentNode;
        if (parent) {
            parent.removeChild(this.container);
        }
    }

    /**
     * Attach container to DOM
     */
    attach(): void {
        if (!this.container.parentNode) {
            document.body.appendChild(this.container);
        }
    }

    /**
     * Check if container for dropcomplete is displayed
     */
    containerDisplayed(): boolean {
        return !!this.container.parentNode;
    }

    /**
     * Clear dropcomplete state and hide container
     */
    clear(): void {
        // prevent the update call if there are pending AJAX requests
        this.keypressCounter++;

        this.items = [];
        this.inputValue = "";
        this.selected = undefined;
        this.detach();
    }

    /**
     * Update dropcomplete position
     */
    updatePosition(): void {
        if (!this.containerDisplayed()) {
            return;
        }

        this.container.style.height = "auto";
        this.container.style.width = this.input.offsetWidth + "px";

        this.calculatePosition()
    }

    calculatePosition(): void {
        const docEl = document.documentElement;
        const clientTop = docEl.clientTop || document.body.clientTop || 0;
        const clientLeft = docEl.clientLeft || document.body.clientLeft || 0;
        const scrollTop = window.pageYOffset || docEl.scrollTop;
        const scrollLeft = window.pageXOffset || docEl.scrollLeft;

        const inputRect = this.input.getBoundingClientRect();

        const top = inputRect.top + this.input.offsetHeight + scrollTop - clientTop;
        const left = inputRect.left + scrollLeft - clientLeft;

        this.container.style.top = top + "px";
        this.container.style.left = left + "px";

        let maxHeight = window.innerHeight - (inputRect.top + this.input.offsetHeight);

        if (maxHeight < 0) {
            maxHeight = 0;
        }

        this.container.style.top = top + "px";
        this.container.style.bottom = "";
        this.container.style.left = left + "px";
        this.container.style.maxHeight = maxHeight + "px";
    }

    /**
     * Redraw the dropcomplete div element with suggestions
     */
    update(): void {

        // delete all children from dropcomplete DOM container
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        const fragment = document.createDocumentFragment();
        let prevGroup = "#9?$";

        for (const item of this.items) {
            if (item.group && item.group !== prevGroup) {
                prevGroup = item.group;
                const groupDiv = this.renderGroup(item.group);
                if (groupDiv) {
                    groupDiv.classList.add("group");
                    fragment.appendChild(groupDiv);
                }
            }
            const div = this.render(item);
            if (div) {
                div.addEventListener("click", (event) => {
                    this.onSelect(item, this.input);
                    this.clear();
                    event.preventDefault();
                    event.stopPropagation();
                });
                if (item === this.selected) {
                    div.classList.add("selected");
                }
                fragment.appendChild(div);
            }
        }

        this.container.appendChild(fragment);

        if (this.items.length < 1) {
            if (this.emptyMsg) {
                const empty = document.createElement("div");
                empty.className = "empty";
                empty.textContent = this.emptyMsg;
                this.container.appendChild(empty);
            } else {
                this.clear();
                return;
            }
        }

        this.attach();
        this.updatePosition();

        this.updateScroll();
    }

    /**
     * Renders dropcomplete item
     */
    render(item: T): HTMLDivElement | undefined {
        const itemElement = document.createElement("div");
        itemElement.textContent = item.label || "";
        return itemElement;
    };

    /**
     * Renders dropcomplete group
     */
    renderGroup(groupName: string): HTMLDivElement | undefined {
        const groupDiv = document.createElement("div");
        groupDiv.textContent = groupName;
        return groupDiv;
    };

    updateIfDisplayed(): void {
        if (this.containerDisplayed()) {
            this.update();
        }
    }

    resizeEventHandler(): void {
        this.updateIfDisplayed();
    }

    scrollEventHandler(event: Event): void {
        if (event.target !== this.container) {
            this.updateIfDisplayed();
        } else {
            event.preventDefault();
        }
    }

    keyupEventHandler(event: KeyboardEvent): void {
        const key = event.key;

        const ignores = ["ArrowUp", "Enter", "Escape", "ArrowRight", "ArrowLeft", "Shift", "Control", "Alt", "CapsLock", "Meta", "Tab"];
        for (const ignore of ignores) {
            if (ignore === key) {
                return;
            }
        }

        if (key === "Fn") {
            return;
        }

        // the down key is used to open dropcomplete
        if (key === "ArrowDown" && this.containerDisplayed()) {
            return;
        }

        this.startFetch(false);
    }

    /**
     * Automatically move scroll bar if selected item is not visible
     */
    updateScroll(): void {
        const elements = this.container.getElementsByClassName("selected");
        if (elements.length > 0) {
            let element = elements[0] as HTMLDivElement;

            // make group visible
            const previous = element.previousElementSibling as HTMLDivElement;
            if (previous && previous.className.indexOf("group") !== -1 && !previous.previousElementSibling) {
                element = previous;
            }

            if (element.offsetTop < this.container.scrollTop) {
                this.container.scrollTop = element.offsetTop;
            } else {
                const selectBottom = element.offsetTop + element.offsetHeight;
                const containerBottom = this.container.scrollTop + this.container.offsetHeight;
                if (selectBottom > containerBottom) {
                    this.container.scrollTop += selectBottom - containerBottom;
                }
            }
        }
    }

    /**
     * Select the previous item in suggestions
     */
    selectPrev(): void {
        if (this.items.length < 1) {
            this.selected = undefined;
        } else {
            if (this.selected === this.items[0]) {
                this.selected = this.items[this.items.length - 1];
            } else {
                for (let i = this.items.length - 1; i > 0; i--) {
                    if (this.selected === this.items[i] || i === 1) {
                        this.selected = this.items[i - 1];
                        break;
                    }
                }
            }
        }
    }

    /**
     * Select the next item in suggestions
     */
    selectNext(): void {
        if (this.items.length < 1) {
            this.selected = undefined;
        }
        if (!this.selected || this.selected === this.items[this.items.length - 1]) {
            this.selected = this.items[0];
            return;
        }
        for (let i = 0; i < (this.items.length - 1); i++) {
            if (this.selected === this.items[i]) {
                this.selected = this.items[i + 1];
                break;
            }
        }
    }

    keydownEventHandler(event: KeyboardEvent): void {
        const key = event.key;

        if (key === "ArrowUp" || key === "ArrowDown" || key === "Escape") {
            const containerIsDisplayed = this.containerDisplayed();

            if (key === "Escape") {
                this.clear();
            } else {
                if (!containerIsDisplayed || this.items.length < 1) {
                    return;
                }
                key === "ArrowUp" ? this.selectPrev() : this.selectNext();
                this.update();
            }

            event.preventDefault();
            if (containerIsDisplayed) {
                event.stopPropagation();
            }

            return;
        }

        if (key === "Enter") {
            if (this.selected) {
                this.onSelect(this.selected, this.input);
                this.clear();
            }

            if (this.preventSubmit) {
                event.preventDefault();
            }
        }
    }

    focusEventHandler(): void {
        if (this.showOnFocus) {
            this.startFetch(true);
        }
    }

    startFetch(isFocus: boolean) {
        // If multiple keys were pressed, before we get an update from server,
        // this may cause redrawing dropcomplete multiple times after the last key was pressed.
        // To avoid this, the number of times keyboard was pressed will be saved and checked before redraw.
        const savedKeypressCounter = ++this.keypressCounter;

        const inputText = this.input.value;
        const cursorPos = this.input.selectionStart || 0;

        if (inputText.length >= this.minLen || isFocus) {
            this.fetch(inputText, (items) => {
                if (this.keypressCounter === savedKeypressCounter && items) {
                    this.items = items
                    this.inputValue = inputText;
                    this.selected = (items.length < 1) ? undefined : items[0];
                    this.update();
                }
            }, isFocus, cursorPos);
        } else {
            this.clear();
        }
    }

    blurEventHandler(): void {
        // we need to delay clear, because when we click on an item, blur will be called before click and remove items from DOM
        setTimeout(() => {
            if (document.activeElement !== this.input) {
                this.clear();
            }
        }, 200);
    }

    /**
     * This function will remove DOM elements and clear event handlers
     */
    destroy(): void {
        this.input.removeEventListener("keydown", this.keydownEventHandler as EventListenerOrEventListenerObject);
        this.input.removeEventListener("keyup", this.keyupEventHandler as EventListenerOrEventListenerObject);
        this.input.removeEventListener("focus", this.focusEventHandler);
        this.input.removeEventListener("blur", this.blurEventHandler);
        window.removeEventListener("resize", this.resizeEventHandler);
        document.removeEventListener("scroll", this.scrollEventHandler, true);
        this.clear();
    }
}
