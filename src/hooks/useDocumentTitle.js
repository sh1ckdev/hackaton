import { useEffect } from 'react';

export const useDocumentTitle = (title) => {
  useEffect(() => {
    const baseTitle = 'Платформа';
    const fullTitle = title ? `${title} | ${baseTitle}` : baseTitle;
    
    document.title = fullTitle;
    

    return () => {
      document.title = 'Платформа';
    };
  }, [title]);
};
