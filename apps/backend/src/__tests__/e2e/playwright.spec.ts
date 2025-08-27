import { test, expect } from '@playwright/test';

test.describe('Resume Builder E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto('http://localhost:3000');

        // Wait for the app to load
        await page.waitForSelector('[data-testid="app-loaded"]');
    });

    test('Complete user journey: upload resume, parse JD, optimize, generate cover letter, export', async ({ page }) => {
        // Step 1: Upload Resume
        await test.step('Upload resume', async () => {
            await page.click('[data-testid="upload-resume-btn"]');

            // Upload a sample resume file
            const fileChooser = await page.waitForEvent('filechooser');
            await fileChooser.setFiles('test-data/sample-resume.pdf');

            // Wait for upload to complete
            await page.waitForSelector('[data-testid="resume-uploaded"]');

            // Verify resume was parsed correctly
            await expect(page.locator('[data-testid="resume-name"]')).toContainText('John Doe');
            await expect(page.locator('[data-testid="resume-email"]')).toContainText('john.doe@email.com');
        });

        // Step 2: Input Job Description
        await test.step('Input job description', async () => {
            await page.click('[data-testid="add-jd-btn"]');

            // Paste job description
            await page.fill('[data-testid="jd-input"]', `
        Senior Software Engineer
        TechCorp Inc.
        
        Requirements:
        • 5+ years of experience with JavaScript, React, Node.js
        • Experience with AWS, Docker, PostgreSQL
        • Knowledge of TypeScript and modern frameworks
        • Experience with microservices architecture
        • Strong problem-solving skills
      `);

            await page.click('[data-testid="parse-jd-btn"]');

            // Wait for parsing to complete
            await page.waitForSelector('[data-testid="jd-parsed"]');

            // Verify JD was parsed correctly
            await expect(page.locator('[data-testid="jd-title"]')).toContainText('Senior Software Engineer');
            await expect(page.locator('[data-testid="jd-company"]')).toContainText('TechCorp Inc.');
        });

        // Step 3: Optimize Resume
        await test.step('Optimize resume', async () => {
            await page.click('[data-testid="optimize-resume-btn"]');

            // Configure optimization settings
            await page.selectOption('[data-testid="target-length"]', '2_pages');
            await page.selectOption('[data-testid="style"]', 'modern');
            await page.check('[data-testid="focus-leadership"]');
            await page.check('[data-testid="focus-technical"]');

            await page.click('[data-testid="start-optimization-btn"]');

            // Wait for optimization to complete
            await page.waitForSelector('[data-testid="optimization-complete"]');

            // Verify optimization results
            await expect(page.locator('[data-testid="ats-score"]')).toContainText(/[0-9]+%/);
            await expect(page.locator('[data-testid="keyword-match"]')).toContainText(/[0-9]+%/);

            // Check that score is reasonable
            const atsScore = await page.locator('[data-testid="ats-score"]').textContent();
            const scoreValue = parseInt(atsScore!.replace('%', ''));
            expect(scoreValue).toBeGreaterThan(70);
        });

        // Step 4: Generate Cover Letter
        await test.step('Generate cover letter', async () => {
            await page.click('[data-testid="generate-cover-letter-btn"]');

            // Configure cover letter settings
            await page.selectOption('[data-testid="cover-letter-tone"]', 'professional');
            await page.selectOption('[data-testid="cover-letter-length"]', 'medium');
            await page.check('[data-testid="focus-experience-match"]');
            await page.check('[data-testid="focus-achievements"]');

            await page.click('[data-testid="generate-cover-letter-btn"]');

            // Wait for generation to complete
            await page.waitForSelector('[data-testid="cover-letter-generated"]');

            // Verify cover letter content
            const coverLetterText = await page.locator('[data-testid="cover-letter-content"]').textContent();
            expect(coverLetterText).toContain('JavaScript');
            expect(coverLetterText).toContain('React');
            expect(coverLetterText).toContain('Node.js');
            expect(coverLetterText!.length).toBeGreaterThan(500);
        });

        // Step 5: Export Documents
        await test.step('Export documents', async () => {
            // Export resume as PDF
            await page.click('[data-testid="export-resume-btn"]');
            await page.selectOption('[data-testid="export-format"]', 'pdf');
            await page.selectOption('[data-testid="export-template"]', 'modern');
            await page.click('[data-testid="export-btn"]');

            // Wait for export to complete
            await page.waitForSelector('[data-testid="export-complete"]');

            // Verify download link
            const downloadLink = page.locator('[data-testid="download-link"]');
            await expect(downloadLink).toBeVisible();

            // Export cover letter as PDF
            await page.click('[data-testid="export-cover-letter-btn"]');
            await page.selectOption('[data-testid="cover-letter-format"]', 'pdf');
            await page.click('[data-testid="export-cover-letter-btn"]');

            await page.waitForSelector('[data-testid="cover-letter-export-complete"]');

            const coverLetterDownloadLink = page.locator('[data-testid="cover-letter-download-link"]');
            await expect(coverLetterDownloadLink).toBeVisible();
        });

        // Step 6: Verify ATS Report
        await test.step('Verify ATS report', async () => {
            await page.click('[data-testid="view-ats-report-btn"]');

            // Check ATS report sections
            await expect(page.locator('[data-testid="keyword-match-section"]')).toBeVisible();
            await expect(page.locator('[data-testid="readability-section"]')).toBeVisible();
            await expect(page.locator('[data-testid="format-section"]')).toBeVisible();
            await expect(page.locator('[data-testid="length-section"]')).toBeVisible();

            // Verify scores are displayed
            await expect(page.locator('[data-testid="keyword-score"]')).toContainText(/[0-9]+/);
            await expect(page.locator('[data-testid="readability-score"]')).toContainText(/[0-9]+/);
            await expect(page.locator('[data-testid="format-score"]')).toContainText(/[0-9]+/);
            await expect(page.locator('[data-testid="length-score"]')).toContainText(/[0-9]+/);
        });
    });

    test('Error handling and edge cases', async ({ page }) => {
        // Test with invalid file upload
        await test.step('Handle invalid file upload', async () => {
            await page.click('[data-testid="upload-resume-btn"]');

            const fileChooser = await page.waitForEvent('filechooser');
            await fileChooser.setFiles('test-data/invalid-file.txt');

            // Should show error message
            await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
            await expect(page.locator('[data-testid="upload-error"]')).toContainText('Please upload a valid PDF or DOCX file');
        });

        // Test with empty job description
        await test.step('Handle empty job description', async () => {
            await page.click('[data-testid="add-jd-btn"]');
            await page.click('[data-testid="parse-jd-btn"]');

            // Should show validation error
            await expect(page.locator('[data-testid="jd-error"]')).toBeVisible();
            await expect(page.locator('[data-testid="jd-error"]')).toContainText('Please enter a job description');
        });

        // Test optimization with minimal data
        await test.step('Handle minimal resume data', async () => {
            // Upload minimal resume
            await page.click('[data-testid="upload-resume-btn"]');
            const fileChooser = await page.waitForEvent('filechooser');
            await fileChooser.setFiles('test-data/minimal-resume.pdf');

            await page.waitForSelector('[data-testid="resume-uploaded"]');

            // Add basic JD
            await page.click('[data-testid="add-jd-btn"]');
            await page.fill('[data-testid="jd-input"]', 'Software Engineer\nRequirements: JavaScript');
            await page.click('[data-testid="parse-jd-btn"]');

            // Try to optimize
            await page.click('[data-testid="optimize-resume-btn"]');
            await page.click('[data-testid="start-optimization-btn"]');

            // Should show recommendations for improvement
            await page.waitForSelector('[data-testid="optimization-complete"]');
            await expect(page.locator('[data-testid="improvement-suggestions"]')).toBeVisible();
        });
    });

    test('Performance and responsiveness', async ({ page }) => {
        // Test page load performance
        await test.step('Page load performance', async () => {
            const startTime = Date.now();
            await page.goto('http://localhost:3000');
            await page.waitForSelector('[data-testid="app-loaded"]');
            const loadTime = Date.now() - startTime;

            expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
        });

        // Test optimization performance
        await test.step('Optimization performance', async () => {
            // Upload resume and add JD first
            await page.click('[data-testid="upload-resume-btn"]');
            const fileChooser = await page.waitForEvent('filechooser');
            await fileChooser.setFiles('test-data/sample-resume.pdf');
            await page.waitForSelector('[data-testid="resume-uploaded"]');

            await page.click('[data-testid="add-jd-btn"]');
            await page.fill('[data-testid="jd-input"]', 'Software Engineer\nRequirements: JavaScript, React');
            await page.click('[data-testid="parse-jd-btn"]');
            await page.waitForSelector('[data-testid="jd-parsed"]');

            // Measure optimization time
            const startTime = Date.now();
            await page.click('[data-testid="optimize-resume-btn"]');
            await page.click('[data-testid="start-optimization-btn"]');
            await page.waitForSelector('[data-testid="optimization-complete"]');
            const optimizationTime = Date.now() - startTime;

            expect(optimizationTime).toBeLessThan(30000); // Should complete within 30 seconds
        });

        // Test mobile responsiveness
        await test.step('Mobile responsiveness', async () => {
            await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

            // Verify UI elements are properly sized
            await expect(page.locator('[data-testid="upload-resume-btn"]')).toBeVisible();
            await expect(page.locator('[data-testid="add-jd-btn"]')).toBeVisible();

            // Check that text is readable
            const buttonText = await page.locator('[data-testid="upload-resume-btn"]').textContent();
            expect(buttonText!.length).toBeLessThan(20); // Button text should be concise
        });
    });

    test('Accessibility compliance', async ({ page }) => {
        await test.step('Keyboard navigation', async () => {
            // Navigate using Tab key
            await page.keyboard.press('Tab');
            await expect(page.locator('[data-testid="upload-resume-btn"]')).toBeFocused();

            await page.keyboard.press('Tab');
            await expect(page.locator('[data-testid="add-jd-btn"]')).toBeFocused();

            // Activate button with Enter key
            await page.keyboard.press('Enter');
            await expect(page.locator('[data-testid="jd-modal"]')).toBeVisible();
        });

        await test.step('Screen reader compatibility', async () => {
            // Check for proper ARIA labels
            await expect(page.locator('[data-testid="upload-resume-btn"]')).toHaveAttribute('aria-label');
            await expect(page.locator('[data-testid="add-jd-btn"]')).toHaveAttribute('aria-label');

            // Check for proper heading structure
            await expect(page.locator('h1')).toBeVisible();
            await expect(page.locator('h2')).toBeVisible();
        });

        await test.step('Color contrast', async () => {
            // Check that text has sufficient contrast
            const button = page.locator('[data-testid="upload-resume-btn"]');
            const backgroundColor = await button.evaluate(el =>
                window.getComputedStyle(el).backgroundColor
            );
            const color = await button.evaluate(el =>
                window.getComputedStyle(el).color
            );

            // This is a simplified check - in practice, you'd use a proper contrast calculation
            expect(backgroundColor).not.toBe(color);
        });
    });
});
