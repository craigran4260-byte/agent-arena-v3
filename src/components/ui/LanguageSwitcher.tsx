'use client';

import { useTranslation } from '@/contexts/LanguageContext';
import styles from './LanguageSwitcher.module.css';

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'zh' : 'en');
  };

  return (
    <button
      className={styles.switcher}
      onClick={toggleLocale}
      aria-label="Switch language"
    >
      <span className={styles.icon}>🌐</span>
      <span className={styles.label}>
        {locale === 'en' ? 'EN' : '中文'}
      </span>
    </button>
  );
}

LanguageSwitcher.displayName = 'LanguageSwitcher';