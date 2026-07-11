import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="theme-toggle__track">
        <Sun size={12} className="theme-toggle__icon theme-toggle__icon--sun" />
        <Moon size={12} className="theme-toggle__icon theme-toggle__icon--moon" />
        <div className={`theme-toggle__thumb ${theme === 'dark' ? 'theme-toggle__thumb--dark' : ''}`} />
      </div>
    </button>
  );
}
