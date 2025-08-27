# Created automatically by Cursor AI(2024 - 12 - 19)

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
    Box,
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Typography,
    Divider,
    Tooltip
} from '@mui/material';
import { Language, ExpandMore } from '@mui/icons-material';
import { locales, getLocaleConfig, type Locale } from '../../i18n/config';

interface LanguageSelectorProps {
    variant?: 'button' | 'menu' | 'dropdown';
    size?: 'small' | 'medium' | 'large';
    showFlags?: boolean;
    showNames?: boolean;
    showCodes?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
    variant = 'button',
    size = 'medium',
    showFlags = true,
    showNames = true,
    showCodes = false
}) => {
    const router = useRouter();
    const pathname = usePathname();
    const currentLocale = useLocale() as Locale;
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLanguageChange = (locale: Locale) => {
        handleClose();

        // Remove current locale from pathname
        const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '');

        // Navigate to new locale
        const newPath = locale === 'en' ? pathWithoutLocale : `/${locale}${pathWithoutLocale}`;
        router.push(newPath);
    };

    const currentConfig = getLocaleConfig(currentLocale);
    const open = Boolean(anchorEl);

    const renderLanguageItem = (locale: Locale) => {
        const config = getLocaleConfig(locale);
        const isCurrent = locale === currentLocale;

        return (
            <MenuItem
                key={locale}
                onClick={() => handleLanguageChange(locale)}
                selected={isCurrent}
                sx={{
                    minWidth: 200,
                    '&.Mui-selected': {
                        backgroundColor: 'primary.light',
                        '&:hover': {
                            backgroundColor: 'primary.main',
                        },
                    },
                }}
            >
                {showFlags && (
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        <Typography variant="h6">{config.flag}</Typography>
                    </ListItemIcon>
                )}
                <ListItemText
                    primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {showNames && (
                                <Typography variant="body1">
                                    {config.name}
                                </Typography>
                            )}
                            {showCodes && (
                                <Typography variant="caption" color="text.secondary">
                                    ({locale.toUpperCase()})
                                </Typography>
                            )}
                        </Box>
                    }
                />
            </MenuItem>
        );
    };

    const renderButton = () => (
        <Button
            variant="outlined"
            size={size}
            onClick={handleClick}
            startIcon={<Language />}
            endIcon={<ExpandMore />}
            sx={{
                minWidth: 120,
                justifyContent: 'space-between',
                textTransform: 'none',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {showFlags && (
                    <Typography variant="h6">{currentConfig.flag}</Typography>
                )}
                {showNames && (
                    <Typography variant="body2">
                        {currentConfig.name}
                    </Typography>
                )}
                {showCodes && (
                    <Typography variant="caption" color="text.secondary">
                        {currentLocale.toUpperCase()}
                    </Typography>
                )}
            </Box>
        </Button>
    );

    const renderMenu = () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Select Language">
                <Button
                    variant="text"
                    size={size}
                    onClick={handleClick}
                    startIcon={<Language />}
                    sx={{ textTransform: 'none' }}
                >
                    {showFlags && (
                        <Typography variant="h6" sx={{ mr: 1 }}>
                            {currentConfig.flag}
                        </Typography>
                    )}
                    {showNames && (
                        <Typography variant="body2">
                            {currentConfig.name}
                        </Typography>
                    )}
                </Button>
            </Tooltip>
        </Box>
    );

    const renderDropdown = () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
                Language:
            </Typography>
            <Button
                variant="text"
                size={size}
                onClick={handleClick}
                endIcon={<ExpandMore />}
                sx={{ textTransform: 'none', minWidth: 'auto' }}
            >
                {showFlags && (
                    <Typography variant="h6" sx={{ mr: 1 }}>
                        {currentConfig.flag}
                    </Typography>
                )}
                {showNames && (
                    <Typography variant="body2">
                        {currentConfig.name}
                    </Typography>
                )}
                {showCodes && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        ({currentLocale.toUpperCase()})
                    </Typography>
                )}
            </Button>
        </Box>
    );

    const renderTrigger = () => {
        switch (variant) {
            case 'menu':
                return renderMenu();
            case 'dropdown':
                return renderDropdown();
            default:
                return renderButton();
        }
    };

    return (
        <Box>
            {renderTrigger()}

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                PaperProps={{
                    sx: {
                        mt: 1,
                        minWidth: 200,
                        maxHeight: 400,
                        overflow: 'auto',
                    },
                }}
            >
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Select Language
                    </Typography>
                </Box>
                <Divider />

                {locales.map((locale) => renderLanguageItem(locale))}
            </Menu>
        </Box>
    );
};
