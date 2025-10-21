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
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';

// Component to conditionally render the Header
const HeaderHandler = () => {
    const location = useLocation();
    const isDashboardPage = location.pathname === '/dashboard';

    return !isDashboardPage ? <Header /> : null;
};

// Main App wrapper with theme
function AppContent() {
    const { getThemeClasses } = useTheme();
    const appClasses = getThemeClasses();

    return (
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
    );
}

export default function App() {
    return (
        <Router>
            <ThemeProvider>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </ThemeProvider>
        </Router>
    );
}
