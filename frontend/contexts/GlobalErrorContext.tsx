import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface GlobalErrorContextType {
  error: string | null;
  showError: (message: string) => void;
  clearError: () => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextType | undefined>(undefined);

// This variable will hold the showError function from the context provider
let globalShowError: ((message: string) => void) | undefined;

interface GlobalErrorProviderProps {
  children: ReactNode;
}

export const GlobalErrorProvider: React.FC<GlobalErrorProviderProps> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);

  const showError = useCallback((message: string) => {
    setError(message);
    // Optionally, clear the error after some time
    // setTimeout(() => setError(null), 5000);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Set the globalShowError function here so it's accessible outside the component
  React.useEffect(() => {
    globalShowError = showError;
    return () => {
      globalShowError = undefined;
    };
  }, [showError]);

  return (
    <GlobalErrorContext.Provider value={{ error, showError, clearError }}>
      {children}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white p-3 rounded-lg shadow-lg z-[100] flex items-center space-x-2">
          <span>{error}</span>
          <button onClick={clearError} className="ml-2 text-white font-bold text-lg leading-none">&times;</button>
        </div>
      )}
    </GlobalErrorContext.Provider>
  );
};

export const useGlobalError = () => {
  const context = useContext(GlobalErrorContext);
  if (context === undefined) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider');
  }
  return context;
};

// Function to call showError from outside React components
export const showGlobalError = (message: string) => {
  if (globalShowError) {
    globalShowError(message);
  } else {
    console.error("Global error handler not yet initialized:", message);
  }
};
