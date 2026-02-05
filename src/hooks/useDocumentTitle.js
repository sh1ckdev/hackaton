import { useEffect } from 'react';

/**
 * Хук для установки динамического title страницы
 * @param {string} title - Заголовок страницы
 */
export const useDocumentTitle = (title) => {
  useEffect(() => {
    const baseTitle = 'Hackathon Platform';
    const fullTitle = title ? `${title} | ${baseTitle}` : baseTitle;
    
    document.title = fullTitle;
    
    // Восстанавливаем оригинальный title при размонтировании
    return () => {
      document.title = baseTitle;
    };
  }, [title]);
};
