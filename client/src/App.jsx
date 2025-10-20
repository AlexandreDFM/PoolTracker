/**
 * ┌────────────────────────────────────────────────────────────────────────────
 * │ @author                    Christophe Vandevoir
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @file           App.jsx
 * │ @path          client/src/App.jsx
 * │ @description   App implementation
 * │ @version       1.0.0
 * │
 * │ @email         christophe.vandevoir@epitech.eu
 * │ @date          2025-04-30
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @copyright     (c) 2025 Christophe Vandevoir
 * └────────────────────────────────────────────────────────────────────────────
 */

import './App.css';
import AppRoutes from './Routes';
import Header from './components/Header';
import { useEffect, useState } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './contexts/AuthContext';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';

// Component to conditionally render the Header
const HeaderHandler = () => {
    const location = useLocation();
    const isDashboardPage = location.pathname === '/dashboard';

    return !isDashboardPage ? <Header /> : null;
};

function App() {
    const [isDarkMode] = useState(false);
    const [isHalloween] = useState(false);
    const [isChristmas] = useState(false);

    // Determine the Mantine color scheme based on theme priorities
    const getMantineColorScheme = () => {
        if (isHalloween && isDarkMode) return 'halloween-dark';
        if (isHalloween) return 'halloween';
        if (isChristmas && isDarkMode) return 'christmas-dark';
        if (isChristmas) return 'christmas';
        if (isDarkMode) return 'dark';
        return 'light';
    };

    // Build className string for backward compatibility
    const appClasses = [
        isHalloween ? 'halloween' : '',
        isChristmas ? 'christmas' : '',
        isDarkMode ? 'dark-mode' : ''
    ].filter(Boolean).join(' ');

    const mantineColorScheme = getMantineColorScheme();

    // Apply theme classes to document root and html element dynamically
    useEffect(() => {
        const rootElement = document.documentElement; // <html> element
        const bodyElement = document.body;

        // Remove all theme classes first
        rootElement.classList.remove('halloween', 'christmas', 'dark-mode', 'halloween-dark', 'christmas-dark');
        bodyElement.classList.remove('halloween', 'christmas', 'dark-mode', 'halloween-dark', 'christmas-dark');

        // Add current theme classes
        if (appClasses) {
            const classes = appClasses.split(' ').filter(Boolean);
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
    }, [isHalloween, isChristmas, isDarkMode, appClasses, mantineColorScheme]);

    return (
        <Router>
            <AuthProvider>
                <div className={`app ${appClasses}`}>
                    <HeaderHandler />
                    <main className="main-content">
                        <AppRoutes />
                    </main>
                    <ToastContainer
                        position="bottom-right"
                        autoClose={5000}
                        hideProgressBar={false}
                        newestOnTop
                        closeOnClick
                        rtl={false}
                        pauseOnFocusLoss
                        draggable
                        pauseOnHover
                    />
                </div>
            </AuthProvider>
        </Router>
    );
}

export default App;
