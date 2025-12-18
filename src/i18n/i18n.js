import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations - Vietnamese only
import viTranslation from './locales/vi.json';

// Configure i18next - Vietnamese only
i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      vi: {
        translation: viTranslation
      }
    },
    lng: 'vi', // Vietnamese only
    fallbackLng: 'vi', // fallback to Vietnamese
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;