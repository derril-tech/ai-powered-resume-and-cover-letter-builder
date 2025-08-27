# Created automatically by Cursor AI(2024 - 12 - 19)

export interface FocusableElement {
    element: HTMLElement;
    tabIndex: number;
    isVisible: boolean;
    isEnabled: boolean;
}

export interface KeyboardNavigationState {
    currentFocusIndex: number;
    focusableElements: FocusableElement[];
    isTrapped: boolean;
    trapStartIndex?: number;
    trapEndIndex?: number;
}

export class KeyboardNavigationManager {
    private state: KeyboardNavigationState;
    private focusHistory: HTMLElement[] = [];
    private maxHistorySize = 10;

    constructor() {
        this.state = {
            currentFocusIndex: -1,
            focusableElements: [],
            isTrapped: false
        };

        this.initialize();
    }

    private initialize(): void {
        this.updateFocusableElements();
        this.setupEventListeners();
    }

    /**
     * Update the list of focusable elements
     */
    updateFocusableElements(): void {
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ];

        const elements = document.querySelectorAll(focusableSelectors.join(', '));
        this.state.focusableElements = Array.from(elements)
            .map(el => el as HTMLElement)
            .filter(el => this.isElementVisible(el) && this.isElementEnabled(el))
            .map(el => ({
                element: el,
                tabIndex: this.getTabIndex(el),
                isVisible: this.isElementVisible(el),
                isEnabled: this.isElementEnabled(el)
            }))
            .sort((a, b) => a.tabIndex - b.tabIndex);

        // Find current focus index
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement) {
            this.state.currentFocusIndex = this.state.focusableElements.findIndex(
                item => item.element === activeElement
            );
        }
    }

    /**
     * Setup keyboard event listeners
     */
    private setupEventListeners(): void {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('focusin', this.handleFocusIn.bind(this));
        document.addEventListener('focusout', this.handleFocusOut.bind(this));
    }

    /**
     * Handle keyboard navigation
     */
    private handleKeyDown(event: KeyboardEvent): void {
        const { key, shiftKey, ctrlKey, altKey } = event;

        // Skip if modifier keys are pressed (except Shift for Tab)
        if (ctrlKey || altKey) return;

        switch (key) {
            case 'Tab':
                this.handleTabNavigation(event, shiftKey);
                break;
            case 'Escape':
                this.handleEscapeKey(event);
                break;
            case 'Enter':
            case ' ':
                this.handleActivationKey(event);
                break;
            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                this.handleArrowNavigation(event);
                break;
        }
    }

    /**
     * Handle Tab navigation
     */
    private handleTabNavigation(event: KeyboardEvent, shiftKey: boolean): void {
        if (this.state.isTrapped) {
            event.preventDefault();

            if (shiftKey) {
                this.focusPrevious();
            } else {
                this.focusNext();
            }
        }
    }

    /**
     * Handle Escape key
     */
    private handleEscapeKey(event: KeyboardEvent): void {
        // Close modals, dropdowns, etc.
        const modals = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
        modals.forEach(modal => {
            const closeButton = modal.querySelector('[aria-label*="close" i], [aria-label*="cancel" i]');
            if (closeButton) {
                (closeButton as HTMLElement).click();
            }
        });
    }

    /**
     * Handle Enter and Space keys
     */
    private handleActivationKey(event: KeyboardEvent): void {
        const target = event.target as HTMLElement;

        // Prevent default for interactive elements that handle their own activation
        if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute('role') === 'button') {
            return;
        }

        // Handle custom interactive elements
        if (target.getAttribute('tabindex') !== null) {
            event.preventDefault();
            target.click();
        }
    }

    /**
     * Handle arrow key navigation
     */
    private handleArrowNavigation(event: KeyboardEvent): void {
        const target = event.target as HTMLElement;
        const role = target.getAttribute('role');

        // Handle specific widget navigation
        switch (role) {
            case 'menubar':
            case 'tablist':
                this.handleHorizontalNavigation(event);
                break;
            case 'menu':
            case 'listbox':
                this.handleVerticalNavigation(event);
                break;
            case 'grid':
                this.handleGridNavigation(event);
                break;
            case 'tree':
                this.handleTreeNavigation(event);
                break;
        }
    }

    /**
     * Handle horizontal navigation (left/right arrows)
     */
    private handleHorizontalNavigation(event: KeyboardEvent): void {
        const { key } = event;
        const target = event.target as HTMLElement;

        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            event.preventDefault();

            const container = target.closest('[role]') as HTMLElement;
            if (!container) return;

            const items = Array.from(container.querySelectorAll('[role]')) as HTMLElement[];
            const currentIndex = items.indexOf(target);

            let nextIndex: number;
            if (key === 'ArrowLeft') {
                nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            } else {
                nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            }

            items[nextIndex]?.focus();
        }
    }

    /**
     * Handle vertical navigation (up/down arrows)
     */
    private handleVerticalNavigation(event: KeyboardEvent): void {
        const { key } = event;
        const target = event.target as HTMLElement;

        if (key === 'ArrowUp' || key === 'ArrowDown') {
            event.preventDefault();

            const container = target.closest('[role]') as HTMLElement;
            if (!container) return;

            const items = Array.from(container.querySelectorAll('[role]')) as HTMLElement[];
            const currentIndex = items.indexOf(target);

            let nextIndex: number;
            if (key === 'ArrowUp') {
                nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            } else {
                nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            }

            items[nextIndex]?.focus();
        }
    }

    /**
     * Handle grid navigation
     */
    private handleGridNavigation(event: KeyboardEvent): void {
        // Implementation for grid navigation
        // This would handle arrow keys in a grid layout
    }

    /**
     * Handle tree navigation
     */
    private handleTreeNavigation(event: KeyboardEvent): void {
        // Implementation for tree navigation
        // This would handle arrow keys in a tree structure
    }

    /**
     * Handle focus in events
     */
    private handleFocusIn(event: FocusEvent): void {
        const target = event.target as HTMLElement;

        // Add to focus history
        this.addToFocusHistory(target);

        // Update current focus index
        this.state.currentFocusIndex = this.state.focusableElements.findIndex(
            item => item.element === target
        );
    }

    /**
     * Handle focus out events
     */
    private handleFocusOut(event: FocusEvent): void {
        // Handle focus leaving a container
        const target = event.target as HTMLElement;
        const relatedTarget = event.relatedTarget as HTMLElement;

        if (this.state.isTrapped && !this.isElementInTrap(relatedTarget)) {
            // Prevent focus from leaving trap
            event.preventDefault();
            this.focusNext();
        }
    }

    /**
     * Focus the next element
     */
    focusNext(): void {
        if (this.state.focusableElements.length === 0) return;

        let nextIndex = this.state.currentFocusIndex + 1;
        if (nextIndex >= this.state.focusableElements.length) {
            nextIndex = this.state.isTrapped ? 0 : -1;
        }

        if (nextIndex >= 0) {
            this.state.focusableElements[nextIndex].element.focus();
        }
    }

    /**
     * Focus the previous element
     */
    focusPrevious(): void {
        if (this.state.focusableElements.length === 0) return;

        let prevIndex = this.state.currentFocusIndex - 1;
        if (prevIndex < 0) {
            prevIndex = this.state.isTrapped ? this.state.focusableElements.length - 1 : -1;
        }

        if (prevIndex >= 0) {
            this.state.focusableElements[prevIndex].element.focus();
        }
    }

    /**
     * Focus the first element
     */
    focusFirst(): void {
        if (this.state.focusableElements.length > 0) {
            this.state.focusableElements[0].element.focus();
        }
    }

    /**
     * Focus the last element
     */
    focusLast(): void {
        if (this.state.focusableElements.length > 0) {
            const lastIndex = this.state.focusableElements.length - 1;
            this.state.focusableElements[lastIndex].element.focus();
        }
    }

    /**
     * Focus a specific element by selector
     */
    focusElement(selector: string): void {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
            element.focus();
        }
    }

    /**
     * Set up a focus trap
     */
    setupFocusTrap(container: HTMLElement): void {
        this.state.isTrapped = true;

        // Find focusable elements within the container
        const focusableElements = Array.from(container.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )) as HTMLElement[];

        if (focusableElements.length > 0) {
            this.state.trapStartIndex = this.state.focusableElements.findIndex(
                item => item.element === focusableElements[0]
            );
            this.state.trapEndIndex = this.state.focusableElements.findIndex(
                item => item.element === focusableElements[focusableElements.length - 1]
            );

            // Focus the first element in the trap
            focusableElements[0].focus();
        }
    }

    /**
     * Remove focus trap
     */
    removeFocusTrap(): void {
        this.state.isTrapped = false;
        this.state.trapStartIndex = undefined;
        this.state.trapEndIndex = undefined;
    }

    /**
     * Check if element is in focus trap
     */
    private isElementInTrap(element: HTMLElement | null): boolean {
        if (!element || !this.state.isTrapped) return false;

        const elementIndex = this.state.focusableElements.findIndex(
            item => item.element === element
        );

        return elementIndex >= (this.state.trapStartIndex || 0) &&
            elementIndex <= (this.state.trapEndIndex || this.state.focusableElements.length - 1);
    }

    /**
     * Add element to focus history
     */
    private addToFocusHistory(element: HTMLElement): void {
        this.focusHistory.unshift(element);
        if (this.focusHistory.length > this.maxHistorySize) {
            this.focusHistory.pop();
        }
    }

    /**
     * Get focus history
     */
    getFocusHistory(): HTMLElement[] {
        return [...this.focusHistory];
    }

    /**
     * Return focus to previous element
     */
    returnFocus(): void {
        if (this.focusHistory.length > 1) {
            const previousElement = this.focusHistory[1];
            if (previousElement && this.isElementVisible(previousElement)) {
                previousElement.focus();
            }
        }
    }

    /**
     * Check if element is visible
     */
    private isElementVisible(element: HTMLElement): boolean {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            element.offsetWidth > 0 &&
            element.offsetHeight > 0;
    }

    /**
     * Check if element is enabled
     */
    private isElementEnabled(element: HTMLElement): boolean {
        return !element.hasAttribute('disabled') &&
            !element.hasAttribute('aria-disabled') &&
            element.getAttribute('aria-disabled') !== 'true';
    }

    /**
     * Get tab index of element
     */
    private getTabIndex(element: HTMLElement): number {
        const tabIndex = element.getAttribute('tabindex');
        return tabIndex ? parseInt(tabIndex) : 0;
    }

    /**
     * Get current navigation state
     */
    getState(): KeyboardNavigationState {
        return { ...this.state };
    }

    /**
     * Get focusable elements
     */
    getFocusableElements(): FocusableElement[] {
        return [...this.state.focusableElements];
    }

    /**
     * Clean up event listeners
     */
    destroy(): void {
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.removeEventListener('focusin', this.handleFocusIn.bind(this));
        document.removeEventListener('focusout', this.handleFocusOut.bind(this));
    }
}
