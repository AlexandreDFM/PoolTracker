/**
 * ┌────────────────────────────────────────────────────────────────────────────
 * │ @author                    Alexandre DE FREITAS MARTINS
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @file          ThemeContext.js
 * │ @path          client/src/contexts/ThemeContext.js
 * │ @description   Theme context for managing dark mode and seasonal themes
 * │ @version       1.0.0
 * │
 * │ @date          2025-10-21
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @copyright     (c) 2025
 * └────────────────────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    // Initialize from localStorage or default to false
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved === 'true';
    });

    // Global seasonal theme state (fetched from server)
    const [globalSeasonalTheme, setGlobalSeasonalTheme] = useState('default');
    const [isLoadingTheme, setIsLoadingTheme] = useState(true);

    // Computed seasonal states based on global theme
    const isHalloween = globalSeasonalTheme === 'halloween';
    const isChristmas = globalSeasonalTheme === 'christmas';

    // Fetch global theme from server
    const fetchGlobalTheme = async () => {
        try {
            const response = await api.get('/settings/theme');
            setGlobalSeasonalTheme(response.data.theme);
        } catch (error) {
            console.error('Failed to fetch global theme:', error);
            // Fallback to default theme
            setGlobalSeasonalTheme('default');
        } finally {
            setIsLoadingTheme(false);
        }
    };

    // Update global theme on server (admin only)
    const updateGlobalTheme = async (theme) => {
        try {
            const response = await api.put('/settings/theme', { theme });
            setGlobalSeasonalTheme(theme);
            return response.data;
        } catch (error) {
            console.error('Failed to update global theme:', error);
            throw error;
        }
    };

    // Determine the Mantine color scheme based on theme priorities
    const getMantineColorScheme = () => {
        if (isChristmas && isDarkMode) return 'christmas-dark';
        if (isHalloween && isDarkMode) return 'halloween-dark';
        if (isHalloween) return 'halloween';
        if (isChristmas) return 'christmas';
        if (isDarkMode) return 'dark';
        return 'light';
    };

    // Build className string for backward compatibility
    const getThemeClasses = () => {
        return [
            isHalloween ? 'halloween' : '',
            isChristmas ? 'christmas' : '',
            isDarkMode ? 'dark-mode' : ''
        ].filter(Boolean).join(' ');
    };

    // Toggle dark mode
    const toggleDarkMode = () => {
        setIsDarkMode(prev => {
            const newValue = !prev;
            localStorage.setItem('darkMode', newValue.toString());
            return newValue;
        });
    };

    // Set seasonal theme (admin only - updates global theme)
    const setSeasonalTheme = async (theme) => {
        try {
            await updateGlobalTheme(theme);
        } catch (error) {
            console.error('Failed to update seasonal theme:', error);
            // Re-throw the error so the UI can handle it
            throw error;
        }
    };

    // Fetch global theme on component mount
    useEffect(() => {
        fetchGlobalTheme();
    }, []);

    // Poll for theme updates every 2 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            fetchGlobalTheme();
        }, 2 * 60 * 1000); // 2 minutes

        return () => clearInterval(interval);
    }, []);

    // Apply theme classes to document root and html element dynamically
    useEffect(() => {
        const rootElement = document.documentElement;
        const bodyElement = document.body;

        // Determine the Mantine color scheme
        let mantineColorScheme = 'light';
        if (isChristmas && isDarkMode) {
            mantineColorScheme = 'christmas-dark';
        } else if (isHalloween && isDarkMode) {
            mantineColorScheme = 'halloween-dark';
        } else if (isHalloween) {
            mantineColorScheme = 'halloween';
        } else if (isChristmas) {
            mantineColorScheme = 'christmas';
        } else if (isDarkMode) {
            mantineColorScheme = 'dark';
        }

        // Build theme classes
        const themeClasses = [
            isHalloween ? 'halloween' : '',
            isChristmas ? 'christmas' : '',
            isDarkMode ? 'dark-mode' : ''
        ].filter(Boolean).join(' ');

        // Remove all theme classes first
        rootElement.classList.remove('halloween', 'christmas', 'dark-mode', 'halloween-dark', 'christmas-dark');
        bodyElement.classList.remove('halloween', 'christmas', 'dark-mode', 'halloween-dark', 'christmas-dark');

        // Add current theme classes
        if (themeClasses) {
            const classes = themeClasses.split(' ').filter(Boolean);
            rootElement.classList.add(...classes);
            bodyElement.classList.add(...classes);
        }

        // Set data attributes on root element
        rootElement.setAttribute('data-mantine-color-scheme', mantineColorScheme);
        rootElement.setAttribute('data-theme', mantineColorScheme);
        rootElement.setAttribute('data-color-scheme', isDarkMode ? 'dark' : 'light');

        // Cleanup function
        return () => {
            rootElement.classList.remove('halloween', 'christmas', 'dark-mode', 'halloween-dark', 'christmas-dark');
            bodyElement.classList.remove('halloween', 'christmas', 'dark-mode', 'halloween-dark', 'christmas-dark');
        };
    }, [isDarkMode, isHalloween, isChristmas]);

    const value = {
        isDarkMode,
        isHalloween,
        isChristmas,
        globalSeasonalTheme,
        isLoadingTheme,
        toggleDarkMode,
        setSeasonalTheme,
        getMantineColorScheme,
        getThemeClasses
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};
