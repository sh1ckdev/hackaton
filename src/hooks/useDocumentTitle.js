import { useEffect } from 'react';


export const useDocumentTitle = (title) => {
  useEffect(() => {
    const baseTitle = 'Hackathon Platform';
    const fullTitle = title ? `${title} | ${baseTitle}` : baseTitle;
    
    document.title = fullTitle;
    

    return () => {
      document.title = baseTitle;
    };
  }, [title]);
};
