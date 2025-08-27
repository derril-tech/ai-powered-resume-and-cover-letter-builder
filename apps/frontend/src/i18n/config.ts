# Created automatically by Cursor AI(2024 - 12 - 19)

import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Define supported locales
export const locales = ['en', 'es', 'fr', 'de', 'pt', 'it', 'ja', 'ko', 'zh', 'ar'] as const;
export type Locale = typeof locales[number];

// Default locale
export const defaultLocale: Locale = 'en';

// Locale configuration
export const localeConfig = {
    en: {
        name: 'English',
        flag: '🇺🇸',
        direction: 'ltr' as const,
        dateFormat: 'MM/DD/YYYY',
        timeFormat: 'HH:mm',
        currency: 'USD'
    },
    es: {
        name: 'Español',
        flag: '🇪🇸',
        direction: 'ltr' as const,
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        currency: 'EUR'
    },
    fr: {
        name: 'Français',
        flag: '🇫🇷',
        direction: 'ltr' as const,
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        currency: 'EUR'
    },
    de: {
        name: 'Deutsch',
        flag: '🇩🇪',
        direction: 'ltr' as const,
        dateFormat: 'DD.MM.YYYY',
        timeFormat: 'HH:mm',
        currency: 'EUR'
    },
    pt: {
        name: 'Português',
        flag: '🇵🇹',
        direction: 'ltr' as const,
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        currency: 'EUR'
    },
    it: {
        name: 'Italiano',
        flag: '🇮🇹',
        direction: 'ltr' as const,
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        currency: 'EUR'
    },
    ja: {
        name: '日本語',
        flag: '🇯🇵',
        direction: 'ltr' as const,
        dateFormat: 'YYYY/MM/DD',
        timeFormat: 'HH:mm',
        currency: 'JPY'
    },
    ko: {
        name: '한국어',
        flag: '🇰🇷',
        direction: 'ltr' as const,
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
        currency: 'KRW'
    },
    zh: {
        name: '中文',
        flag: '🇨🇳',
        direction: 'ltr' as const,
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
        currency: 'CNY'
    },
    ar: {
        name: 'العربية',
        flag: '🇸🇦',
        direction: 'rtl' as const,
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        currency: 'SAR'
    }
};

// Next-intl configuration
export default getRequestConfig(async ({ locale }) => {
    // Validate that the incoming `locale` parameter is valid
    if (!locales.includes(locale as Locale)) {
        notFound();
    }

    return {
        messages: (await import(`../messages/${locale}.json`)).default
    };
});

// Helper functions for locale management
export function isValidLocale(locale: string): locale is Locale {
    return locales.includes(locale as Locale);
}

export function getLocaleConfig(locale: Locale) {
    return localeConfig[locale];
}

export function getSupportedLocales() {
    return locales.map(locale => ({
        code: locale,
        ...localeConfig[locale]
    }));
}

// RTL support
export function isRTL(locale: Locale): boolean {
    return localeConfig[locale].direction === 'rtl';
}

// Date formatting helpers
export function getDateFormat(locale: Locale): string {
    return localeConfig[locale].dateFormat;
}

export function getTimeFormat(locale: Locale): string {
    return localeConfig[locale].timeFormat;
}

// Currency formatting helpers
export function getCurrency(locale: Locale): string {
    return localeConfig[locale].currency;
}

// Locale detection
export function detectLocale(acceptLanguage: string): Locale {
    const preferredLocales = acceptLanguage
        .split(',')
        .map(lang => lang.split(';')[0].trim().toLowerCase())
        .map(lang => lang.split('-')[0]);

    for (const preferred of preferredLocales) {
        if (isValidLocale(preferred)) {
            return preferred as Locale;
        }
    }

    return defaultLocale;
}
