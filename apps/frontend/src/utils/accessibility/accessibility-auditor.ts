# Created automatically by Cursor AI(2024 - 12 - 19)

export interface AccessibilityIssue {
    type: 'error' | 'warning' | 'info';
    element: string;
    message: string;
    code: string;
    impact: 'critical' | 'serious' | 'moderate' | 'minor';
    help: string;
}

export interface AccessibilityReport {
    timestamp: Date;
    url: string;
    issues: AccessibilityIssue[];
    summary: {
        errors: number;
        warnings: number;
        info: number;
        score: number; // 0-100
    };
}

export class AccessibilityAuditor {
    private issues: AccessibilityIssue[] = [];

    /**
     * Run comprehensive accessibility audit
     */
    async auditPage(): Promise<AccessibilityReport> {
        this.issues = [];

        // Run all audit checks
        await this.checkKeyboardNavigation();
        await this.checkARIAAttributes();
        await this.checkColorContrast();
        await this.checkSemanticHTML();
        await this.checkFocusManagement();
        await this.checkTextAlternatives();
        await this.checkFormAccessibility();
        await this.checkDynamicContent();

        const summary = this.calculateSummary();

        return {
            timestamp: new Date(),
            url: window.location.href,
            issues: this.issues,
            summary
        };
    }

    /**
     * Check keyboard navigation support
     */
    private async checkKeyboardNavigation(): Promise<void> {
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        // Check for proper tab order
        focusableElements.forEach((element, index) => {
            const tabIndex = element.getAttribute('tabindex');
            if (tabIndex && parseInt(tabIndex) > 0) {
                this.addIssue('warning', element,
                    'Custom tabindex may disrupt natural tab order',
                    'TAB_ORDER', 'moderate',
                    'Avoid custom tabindex values greater than 0 unless necessary'
                );
            }
        });

        // Check for keyboard event handlers
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
        interactiveElements.forEach(element => {
            const hasKeyboardHandler = element.hasAttribute('onkeydown') ||
                element.hasAttribute('onkeyup') ||
                element.hasAttribute('onkeypress');

            if (!hasKeyboardHandler && element.hasAttribute('onclick')) {
                this.addIssue('error', element,
                    'Clickable element lacks keyboard support',
                    'KEYBOARD_ACCESS', 'serious',
                    'Add keyboard event handlers or use semantic HTML elements'
                );
            }
        });
    }

    /**
     * Check ARIA attributes for correctness
     */
    private async checkARIAAttributes(): Promise<void> {
        // Check for invalid ARIA attributes
        const elementsWithAria = document.querySelectorAll('[aria-*]');

        elementsWithAria.forEach(element => {
            const ariaAttributes = Array.from(element.attributes)
                .filter(attr => attr.name.startsWith('aria-'));

            ariaAttributes.forEach(attr => {
                // Check for common ARIA mistakes
                if (attr.name === 'aria-label' && !attr.value.trim()) {
                    this.addIssue('error', element,
                        'Empty aria-label attribute',
                        'ARIA_EMPTY_LABEL', 'serious',
                        'Provide meaningful text for aria-label or remove the attribute'
                    );
                }

                if (attr.name === 'aria-describedby') {
                    const targetId = attr.value;
                    const targetElement = document.getElementById(targetId);
                    if (!targetElement) {
                        this.addIssue('error', element,
                            `aria-describedby references non-existent element: ${targetId}`,
                            'ARIA_INVALID_REF', 'serious',
                            'Ensure the referenced element exists in the DOM'
                        );
                    }
                }

                if (attr.name === 'aria-expanded' && !['true', 'false'].includes(attr.value)) {
                    this.addIssue('error', element,
                        'aria-expanded must be "true" or "false"',
                        'ARIA_INVALID_VALUE', 'serious',
                        'Set aria-expanded to either "true" or "false"'
                    );
                }
            });
        });

        // Check for missing required ARIA attributes
        const comboboxes = document.querySelectorAll('[role="combobox"]');
        comboboxes.forEach(element => {
            if (!element.hasAttribute('aria-expanded')) {
                this.addIssue('error', element,
                    'Combobox missing aria-expanded attribute',
                    'ARIA_MISSING_EXPANDED', 'serious',
                    'Add aria-expanded attribute to indicate dropdown state'
                );
            }
        });
    }

    /**
     * Check color contrast ratios
     */
    private async checkColorContrast(): Promise<void> {
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button, label');

        textElements.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            const backgroundColor = computedStyle.backgroundColor;
            const color = computedStyle.color;

            if (color && backgroundColor) {
                const contrastRatio = this.calculateContrastRatio(color, backgroundColor);
                const fontSize = parseFloat(computedStyle.fontSize);
                const isBold = computedStyle.fontWeight >= '600';

                // WCAG 2.1 AA requirements
                const minContrast = (fontSize >= 18 || (fontSize >= 14 && isBold)) ? 3.0 : 4.5;

                if (contrastRatio < minContrast) {
                    this.addIssue('error', element,
                        `Insufficient color contrast: ${contrastRatio.toFixed(2)}:1 (required: ${minContrast}:1)`,
                        'CONTRAST_LOW', 'serious',
                        'Increase contrast between text and background colors'
                    );
                } else if (contrastRatio < minContrast + 1) {
                    this.addIssue('warning', element,
                        `Low color contrast: ${contrastRatio.toFixed(2)}:1`,
                        'CONTRAST_MEDIUM', 'moderate',
                        'Consider increasing contrast for better readability'
                    );
                }
            }
        });
    }

    /**
     * Check semantic HTML structure
     */
    private async checkSemanticHTML(): Promise<void> {
        // Check for proper heading hierarchy
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let previousLevel = 0;

        headings.forEach(heading => {
            const currentLevel = parseInt(heading.tagName.charAt(1));
            if (currentLevel - previousLevel > 1) {
                this.addIssue('error', heading,
                    `Heading level skipped: ${previousLevel} → ${currentLevel}`,
                    'HEADING_SKIP', 'serious',
                    'Maintain proper heading hierarchy (h1 → h2 → h3, etc.)'
                );
            }
            previousLevel = currentLevel;
        });

        // Check for proper list structure
        const lists = document.querySelectorAll('ul, ol');
        lists.forEach(list => {
            const listItems = list.querySelectorAll('li');
            if (listItems.length === 0) {
                this.addIssue('error', list,
                    'Empty list element',
                    'LIST_EMPTY', 'moderate',
                    'Remove empty list elements or add list items'
                );
            }
        });

        // Check for proper table structure
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            const hasCaption = table.querySelector('caption');
            const hasHeaders = table.querySelectorAll('th').length > 0;

            if (!hasCaption) {
                this.addIssue('warning', table,
                    'Table missing caption',
                    'TABLE_NO_CAPTION', 'moderate',
                    'Add a caption to describe the table content'
                );
            }

            if (!hasHeaders) {
                this.addIssue('error', table,
                    'Table missing header cells',
                    'TABLE_NO_HEADERS', 'serious',
                    'Add header cells (th) to identify column/row content'
                );
            }
        });
    }

    /**
     * Check focus management
     */
    private async checkFocusManagement(): Promise<void> {
        // Check for focus traps
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            // Check if focus is properly managed in modals/dialogs
            const modals = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
            modals.forEach(modal => {
                const modalFocusable = modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );

                if (modalFocusable.length > 0) {
                    const firstModalElement = modalFocusable[0] as HTMLElement;
                    if (document.activeElement !== firstModalElement) {
                        this.addIssue('warning', modal,
                            'Modal dialog should focus first focusable element',
                            'MODAL_FOCUS', 'moderate',
                            'Set focus to the first focusable element when modal opens'
                        );
                    }
                }
            });
        }

        // Check for visible focus indicators
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
        interactiveElements.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            const outline = computedStyle.outline;
            const boxShadow = computedStyle.boxShadow;

            if (outline === 'none' && !boxShadow.includes('rgb')) {
                this.addIssue('warning', element,
                    'No visible focus indicator',
                    'FOCUS_INDICATOR', 'moderate',
                    'Add visible focus indicators (outline, box-shadow, or background change)'
                );
            }
        });
    }

    /**
     * Check text alternatives for images and media
     */
    private async checkTextAlternatives(): Promise<void> {
        // Check images for alt text
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            const alt = img.getAttribute('alt');
            const role = img.getAttribute('role');

            if (!alt && role !== 'presentation' && role !== 'none') {
                this.addIssue('error', img,
                    'Image missing alt text',
                    'IMG_NO_ALT', 'serious',
                    'Add descriptive alt text or set role="presentation" for decorative images'
                );
            } else if (alt === '') {
                this.addIssue('warning', img,
                    'Empty alt text - image may be decorative',
                    'IMG_EMPTY_ALT', 'moderate',
                    'Consider role="presentation" for decorative images'
                );
            }
        });

        // Check for video/audio captions
        const mediaElements = document.querySelectorAll('video, audio');
        mediaElements.forEach(media => {
            const hasCaptions = media.querySelector('track[kind="captions"]');
            if (!hasCaptions) {
                this.addIssue('warning', media,
                    'Media element missing captions',
                    'MEDIA_NO_CAPTIONS', 'moderate',
                    'Add captions or transcripts for audio/video content'
                );
            }
        });
    }

    /**
     * Check form accessibility
     */
    private async checkFormAccessibility(): Promise<void> {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, select, textarea');

            inputs.forEach(input => {
                const id = input.getAttribute('id');
                const name = input.getAttribute('name');
                const type = input.getAttribute('type');

                // Check for proper labels
                if (type !== 'hidden' && type !== 'submit' && type !== 'button') {
                    const label = form.querySelector(`label[for="${id}"]`);
                    const ariaLabel = input.getAttribute('aria-label');
                    const ariaLabelledby = input.getAttribute('aria-labelledby');

                    if (!label && !ariaLabel && !ariaLabelledby) {
                        this.addIssue('error', input,
                            'Form control missing label',
                            'FORM_NO_LABEL', 'serious',
                            'Add a label, aria-label, or aria-labelledby attribute'
                        );
                    }
                }

                // Check for required field indicators
                if (input.hasAttribute('required')) {
                    const label = form.querySelector(`label[for="${id}"]`);
                    if (label && !label.textContent?.includes('*')) {
                        this.addIssue('info', input,
                            'Required field not visually indicated',
                            'FORM_REQUIRED_INDICATOR', 'minor',
                            'Add visual indicator (*) for required fields'
                        );
                    }
                }
            });
        });
    }

    /**
     * Check dynamic content updates
     */
    private async checkDynamicContent(): Promise<void> {
        // Check for live regions
        const liveRegions = document.querySelectorAll('[aria-live]');
        liveRegions.forEach(region => {
            const liveValue = region.getAttribute('aria-live');
            if (!['polite', 'assertive', 'off'].includes(liveValue || '')) {
                this.addIssue('error', region,
                    'Invalid aria-live value',
                    'ARIA_LIVE_INVALID', 'serious',
                    'Use "polite", "assertive", or "off" for aria-live'
                );
            }
        });

        // Check for status messages
        const statusElements = document.querySelectorAll('[role="status"], [role="alert"]');
        statusElements.forEach(element => {
            if (!element.textContent?.trim()) {
                this.addIssue('warning', element,
                    'Status element has no content',
                    'STATUS_EMPTY', 'moderate',
                    'Add meaningful content to status/alert elements'
                );
            }
        });
    }

    /**
     * Calculate contrast ratio between two colors
     */
    private calculateContrastRatio(color1: string, color2: string): number {
        const luminance1 = this.getLuminance(color1);
        const luminance2 = this.getLuminance(color2);

        const lighter = Math.max(luminance1, luminance2);
        const darker = Math.min(luminance1, luminance2);

        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * Calculate relative luminance of a color
     */
    private getLuminance(color: string): number {
        const rgb = this.parseColor(color);
        if (!rgb) return 0;

        const [r, g, b] = rgb.map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    /**
     * Parse color string to RGB values
     */
    private parseColor(color: string): number[] | null {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.fillStyle = color;
        const computedColor = ctx.fillStyle;

        const match = computedColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (match) {
            return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
        }

        return null;
    }

    /**
     * Add an accessibility issue to the report
     */
    private addIssue(
        type: 'error' | 'warning' | 'info',
        element: Element,
        message: string,
        code: string,
        impact: 'critical' | 'serious' | 'moderate' | 'minor',
        help: string
    ): void {
        this.issues.push({
            type,
            element: this.getElementSelector(element),
            message,
            code,
            impact,
            help
        });
    }

    /**
     * Generate a unique selector for an element
     */
    private getElementSelector(element: Element): string {
        if (element.id) {
            return `#${element.id}`;
        }

        if (element.className) {
            const classes = element.className.split(' ').filter(c => c.trim());
            if (classes.length > 0) {
                return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
            }
        }

        return element.tagName.toLowerCase();
    }

    /**
     * Calculate summary statistics
     */
    private calculateSummary() {
        const errors = this.issues.filter(i => i.type === 'error').length;
        const warnings = this.issues.filter(i => i.type === 'warning').length;
        const info = this.issues.filter(i => i.type === 'info').length;

        // Calculate score (0-100)
        const totalIssues = this.issues.length;
        const criticalIssues = this.issues.filter(i => i.impact === 'critical').length;
        const seriousIssues = this.issues.filter(i => i.impact === 'serious').length;

        let score = 100;
        score -= criticalIssues * 20;
        score -= seriousIssues * 10;
        score -= warnings * 5;
        score -= info * 1;

        return {
            errors,
            warnings,
            info,
            score: Math.max(0, Math.min(100, score))
        };
    }

    /**
     * Generate accessibility report in different formats
     */
    generateReport(format: 'json' | 'html' | 'csv' = 'json'): string {
        const report = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            issues: this.issues,
            summary: this.calculateSummary()
        };

        switch (format) {
            case 'json':
                return JSON.stringify(report, null, 2);
            case 'html':
                return this.generateHTMLReport(report);
            case 'csv':
                return this.generateCSVReport(report);
            default:
                return JSON.stringify(report, null, 2);
        }
    }

    private generateHTMLReport(report: any): string {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Accessibility Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .issue { margin: 10px 0; padding: 10px; border-left: 4px solid; }
            .error { border-color: #d32f2f; background: #ffebee; }
            .warning { border-color: #f57c00; background: #fff3e0; }
            .info { border-color: #1976d2; background: #e3f2fd; }
            .score { font-size: 24px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Accessibility Report</h1>
          <div class="summary">
            <p><strong>URL:</strong> ${report.url}</p>
            <p><strong>Timestamp:</strong> ${report.timestamp}</p>
            <p><strong>Score:</strong> <span class="score">${report.summary.score}/100</span></p>
            <p><strong>Issues:</strong> ${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.info} info</p>
          </div>
          <h2>Issues</h2>
          ${report.issues.map(issue => `
            <div class="issue ${issue.type}">
              <h3>${issue.message}</h3>
              <p><strong>Element:</strong> ${issue.element}</p>
              <p><strong>Code:</strong> ${issue.code}</p>
              <p><strong>Impact:</strong> ${issue.impact}</p>
              <p><strong>Help:</strong> ${issue.help}</p>
            </div>
          `).join('')}
        </body>
      </html>
    `;
    }

    private generateCSVReport(report: any): string {
        const headers = ['Type', 'Element', 'Message', 'Code', 'Impact', 'Help'];
        const rows = report.issues.map(issue => [
            issue.type,
            issue.element,
            issue.message,
            issue.code,
            issue.impact,
            issue.help
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }
}
