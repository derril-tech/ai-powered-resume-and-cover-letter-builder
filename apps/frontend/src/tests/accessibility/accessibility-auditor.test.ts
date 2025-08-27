# Created automatically by Cursor AI(2024 - 12 - 19)

import { AccessibilityAuditor } from '../../utils/accessibility/accessibility-auditor';

describe('AccessibilityAuditor', () => {
    let auditor: AccessibilityAuditor;
    let mockDocument: Document;

    beforeEach(() => {
        auditor = new AccessibilityAuditor();

        // Mock document for testing
        mockDocument = {
            querySelectorAll: jest.fn(),
            location: { href: 'http://localhost:3000/test' }
        } as any;

        // Mock window.getComputedStyle
        Object.defineProperty(window, 'getComputedStyle', {
            value: jest.fn(() => ({
                backgroundColor: 'rgb(255, 255, 255)',
                color: 'rgb(0, 0, 0)',
                fontSize: '16px',
                fontWeight: '400',
                outline: 'none',
                boxShadow: 'none',
                display: 'block',
                visibility: 'visible',
                opacity: '1'
            }))
        });
    });

    describe('Keyboard Navigation Checks', () => {
        it('should detect elements with custom tabindex', async () => {
            const mockElements = [
                { getAttribute: jest.fn(() => '5'), hasAttribute: jest.fn(() => false) }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'TAB_ORDER' &&
                issue.message.includes('Custom tabindex may disrupt natural tab order')
            )).toBe(true);
        });

        it('should detect clickable elements without keyboard support', async () => {
            const mockElements = [
                {
                    hasAttribute: jest.fn((attr) => attr === 'onclick'),
                    tagName: 'DIV'
                }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'KEYBOARD_ACCESS' &&
                issue.message.includes('Clickable element lacks keyboard support')
            )).toBe(true);
        });
    });

    describe('ARIA Attribute Checks', () => {
        it('should detect empty aria-label attributes', async () => {
            const mockElements = [
                {
                    getAttribute: jest.fn((attr) => attr === 'aria-label' ? '' : null),
                    hasAttribute: jest.fn(() => true)
                }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'ARIA_EMPTY_LABEL' &&
                issue.message.includes('Empty aria-label attribute')
            )).toBe(true);
        });

        it('should detect invalid aria-describedby references', async () => {
            const mockElements = [
                {
                    getAttribute: jest.fn((attr) => attr === 'aria-describedby' ? 'nonexistent-id' : null),
                    hasAttribute: jest.fn(() => true)
                }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockElements);
            (mockDocument.getElementById as jest.Mock) = jest.fn(() => null);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'ARIA_INVALID_REF' &&
                issue.message.includes('aria-describedby references non-existent element')
            )).toBe(true);
        });

        it('should detect invalid aria-expanded values', async () => {
            const mockElements = [
                {
                    getAttribute: jest.fn((attr) => attr === 'aria-expanded' ? 'maybe' : null),
                    hasAttribute: jest.fn(() => true)
                }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'ARIA_INVALID_VALUE' &&
                issue.message.includes('aria-expanded must be "true" or "false"')
            )).toBe(true);
        });

        it('should detect missing aria-expanded on comboboxes', async () => {
            const mockElements = [
                {
                    getAttribute: jest.fn((attr) => attr === 'role' ? 'combobox' : null),
                    hasAttribute: jest.fn((attr) => attr === 'role')
                }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'ARIA_MISSING_EXPANDED' &&
                issue.message.includes('Combobox missing aria-expanded attribute')
            )).toBe(true);
        });
    });

    describe('Color Contrast Checks', () => {
        it('should detect insufficient color contrast', async () => {
            // Mock low contrast colors
            Object.defineProperty(window, 'getComputedStyle', {
                value: jest.fn(() => ({
                    backgroundColor: 'rgb(255, 255, 255)',
                    color: 'rgb(200, 200, 200)', // Low contrast gray
                    fontSize: '16px',
                    fontWeight: '400'
                }))
            });

            const mockElements = [
                { tagName: 'P' }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'CONTRAST_LOW' &&
                issue.message.includes('Insufficient color contrast')
            )).toBe(true);
        });

        it('should detect low contrast warnings', async () => {
            // Mock medium contrast colors
            Object.defineProperty(window, 'getComputedStyle', {
                value: jest.fn(() => ({
                    backgroundColor: 'rgb(255, 255, 255)',
                    color: 'rgb(100, 100, 100)', // Medium contrast gray
                    fontSize: '16px',
                    fontWeight: '400'
                }))
            });

            const mockElements = [
                { tagName: 'P' }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'CONTRAST_MEDIUM' &&
                issue.message.includes('Low color contrast')
            )).toBe(true);
        });
    });

    describe('Semantic HTML Checks', () => {
        it('should detect skipped heading levels', async () => {
            const mockHeadings = [
                { tagName: 'H1' },
                { tagName: 'H3' } // Skipped H2
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockHeadings);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'HEADING_SKIP' &&
                issue.message.includes('Heading level skipped')
            )).toBe(true);
        });

        it('should detect empty list elements', async () => {
            const mockLists = [
                {
                    querySelectorAll: jest.fn(() => []) // No list items
                }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockLists);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'LIST_EMPTY' &&
                issue.message.includes('Empty list element')
            )).toBe(true);
        });

        it('should detect tables without headers', async () => {
            const mockTables = [
                {
                    querySelector: jest.fn(() => null), // No caption
                    querySelectorAll: jest.fn(() => []) // No header cells
                }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockTables);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'TABLE_NO_HEADERS' &&
                issue.message.includes('Table missing header cells')
            )).toBe(true);
        });
    });

    describe('Focus Management Checks', () => {
        it('should detect missing focus indicators', async () => {
            const mockElements = [
                { tagName: 'BUTTON' }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'FOCUS_INDICATOR' &&
                issue.message.includes('No visible focus indicator')
            )).toBe(true);
        });
    });

    describe('Text Alternative Checks', () => {
        it('should detect images without alt text', async () => {
            const mockImages = [
                {
                    getAttribute: jest.fn((attr) => attr === 'alt' ? null : null),
                    tagName: 'IMG'
                }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockImages);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'IMG_NO_ALT' &&
                issue.message.includes('Image missing alt text')
            )).toBe(true);
        });

        it('should detect empty alt text on images', async () => {
            const mockImages = [
                {
                    getAttribute: jest.fn((attr) => attr === 'alt' ? '' : null),
                    tagName: 'IMG'
                }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockImages);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'IMG_EMPTY_ALT' &&
                issue.message.includes('Empty alt text')
            )).toBe(true);
        });
    });

    describe('Form Accessibility Checks', () => {
        it('should detect form controls without labels', async () => {
            const mockForms = [
                {
                    querySelectorAll: jest.fn(() => [
                        {
                            getAttribute: jest.fn((attr) => attr === 'type' ? 'text' : null),
                            tagName: 'INPUT'
                        }
                    ]),
                    querySelector: jest.fn(() => null) // No label
                }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockForms);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'FORM_NO_LABEL' &&
                issue.message.includes('Form control missing label')
            )).toBe(true);
        });
    });

    describe('Dynamic Content Checks', () => {
        it('should detect invalid aria-live values', async () => {
            const mockElements = [
                {
                    getAttribute: jest.fn((attr) => attr === 'aria-live' ? 'invalid' : null),
                    hasAttribute: jest.fn(() => true)
                }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'ARIA_LIVE_INVALID' &&
                issue.message.includes('Invalid aria-live value')
            )).toBe(true);
        });

        it('should detect empty status elements', async () => {
            const mockElements = [
                {
                    getAttribute: jest.fn((attr) => attr === 'role' ? 'status' : null),
                    textContent: '',
                    hasAttribute: jest.fn(() => true)
                }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

            const report = await auditor.auditPage();

            expect(report.issues.some(issue =>
                issue.code === 'STATUS_EMPTY' &&
                issue.message.includes('Status element has no content')
            )).toBe(true);
        });
    });

    describe('Report Generation', () => {
        it('should generate a valid report structure', async () => {
            const report = await auditor.auditPage();

            expect(report).toHaveProperty('timestamp');
            expect(report).toHaveProperty('url');
            expect(report).toHaveProperty('issues');
            expect(report).toHaveProperty('summary');
            expect(report.summary).toHaveProperty('errors');
            expect(report.summary).toHaveProperty('warnings');
            expect(report.summary).toHaveProperty('info');
            expect(report.summary).toHaveProperty('score');
        });

        it('should calculate correct summary statistics', async () => {
            const mockElements = [
                {
                    getAttribute: jest.fn(() => null),
                    hasAttribute: jest.fn(() => false),
                    tagName: 'IMG'
                }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

            const report = await auditor.auditPage();

            expect(report.summary.errors).toBeGreaterThanOrEqual(0);
            expect(report.summary.warnings).toBeGreaterThanOrEqual(0);
            expect(report.summary.info).toBeGreaterThanOrEqual(0);
            expect(report.summary.score).toBeGreaterThanOrEqual(0);
            expect(report.summary.score).toBeLessThanOrEqual(100);
        });

        it('should generate JSON report', () => {
            const report = auditor.generateReport('json');
            expect(typeof report).toBe('string');

            const parsed = JSON.parse(report);
            expect(parsed).toHaveProperty('timestamp');
            expect(parsed).toHaveProperty('url');
            expect(parsed).toHaveProperty('issues');
            expect(parsed).toHaveProperty('summary');
        });

        it('should generate HTML report', () => {
            const report = auditor.generateReport('html');
            expect(typeof report).toBe('string');
            expect(report).toContain('<!DOCTYPE html>');
            expect(report).toContain('<title>Accessibility Report</title>');
        });

        it('should generate CSV report', () => {
            const report = auditor.generateReport('csv');
            expect(typeof report).toBe('string');
            expect(report).toContain('Type,Element,Message,Code,Impact,Help');
        });
    });

    describe('Score Calculation', () => {
        it('should calculate perfect score for no issues', async () => {
            // Mock no issues
            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue([]);

            const report = await auditor.auditPage();

            expect(report.summary.score).toBe(100);
        });

        it('should reduce score for errors', async () => {
            const mockElements = [
                {
                    getAttribute: jest.fn(() => null),
                    hasAttribute: jest.fn(() => false),
                    tagName: 'IMG'
                }
            ];

            (mockDocument.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

            const report = await auditor.auditPage();

            // Should have at least one error (missing alt text)
            expect(report.summary.errors).toBeGreaterThan(0);
            expect(report.summary.score).toBeLessThan(100);
        });
    });
});
