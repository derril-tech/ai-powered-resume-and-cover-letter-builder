# Created automatically by Cursor AI(2024 - 12 - 19)

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import {
    getLocaleConfig,
    getDateFormat,
    getTimeFormat,
    getCurrency,
    isRTL,
    type Locale
} from '../i18n/config';

export interface LocalizationHelpers {
    locale: Locale;
    config: ReturnType<typeof getLocaleConfig>;
    isRTL: boolean;
    dateFormat: string;
    timeFormat: string;
    currency: string;
    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
    formatTime: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
    formatCurrency: (amount: number, currency?: string) => string;
    formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string;
    formatRelativeTime: (date: Date | string) => string;
    getDirection: () => 'ltr' | 'rtl';
}

export function useLocalization(): LocalizationHelpers {
    const locale = useLocale() as Locale;

    const config = useMemo(() => getLocaleConfig(locale), [locale]);
    const rtl = useMemo(() => isRTL(locale), [locale]);
    const dateFormat = useMemo(() => getDateFormat(locale), [locale]);
    const timeFormat = useMemo(() => getTimeFormat(locale), [locale]);
    const currency = useMemo(() => getCurrency(locale), [locale]);

    const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;

        const defaultOptions: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...options
        };

        return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
    };

    const formatTime = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;

        const defaultOptions: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            ...options
        };

        return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
    };

    const formatCurrency = (amount: number, currencyCode?: string): string => {
        const currencyToUse = currencyCode || currency;

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyToUse,
        }).format(amount);
    };

    const formatNumber = (number: number, options?: Intl.NumberFormatOptions): string => {
        const defaultOptions: Intl.NumberFormatOptions = {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
            ...options
        };

        return new Intl.NumberFormat(locale, defaultOptions).format(number);
    };

    const formatRelativeTime = (date: Date | string): string => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

        if (diffInSeconds < 60) {
            return rtf.format(-diffInSeconds, 'second');
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return rtf.format(-minutes, 'minute');
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return rtf.format(-hours, 'hour');
        } else if (diffInSeconds < 2592000) {
            const days = Math.floor(diffInSeconds / 86400);
            return rtf.format(-days, 'day');
        } else if (diffInSeconds < 31536000) {
            const months = Math.floor(diffInSeconds / 2592000);
            return rtf.format(-months, 'month');
        } else {
            const years = Math.floor(diffInSeconds / 31536000);
            return rtf.format(-years, 'year');
        }
    };

    const getDirection = (): 'ltr' | 'rtl' => {
        return rtl ? 'rtl' : 'ltr';
    };

    return {
        locale,
        config,
        isRTL: rtl,
        dateFormat,
        timeFormat,
        currency,
        formatDate,
        formatTime,
        formatCurrency,
        formatNumber,
        formatRelativeTime,
        getDirection
    };
}

// Specialized hooks for common use cases
export function useDateFormat() {
    const { formatDate, dateFormat } = useLocalization();
    return { formatDate, dateFormat };
}

export function useTimeFormat() {
    const { formatTime, timeFormat } = useLocalization();
    return { formatTime, timeFormat };
}

export function useCurrencyFormat() {
    const { formatCurrency, currency } = useLocalization();
    return { formatCurrency, currency };
}

export function useNumberFormat() {
    const { formatNumber } = useLocalization();
    return { formatNumber };
}

export function useRelativeTimeFormat() {
    const { formatRelativeTime } = useLocalization();
    return { formatRelativeTime };
}

export function useRTL() {
    const { isRTL, getDirection } = useLocalization();
    return { isRTL, direction: getDirection() };
}
