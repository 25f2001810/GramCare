import { useLanguage } from '../i18n/index.js';

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="language-toggle">
      <span>{t('login.language')}</span>
      <select aria-label={t('login.language')} value={language} onChange={(event) => setLanguage(event.target.value)}>
        <option value="en">English</option>
        <option value="ta">தமிழ்</option>
        <option value="hi">हिन्दी</option>
      </select>
    </label>
  );
}
