import React, { useState, useEffect } from 'react';
import { User } from '../types';
// Removed api import and setAuthToken as they are no longer directly used here
// import api, { setAuthToken } from '../services/api';
import { Wallet } from 'lucide-react'; // Keep Wallet icon for branding
import { supabase } from '../services/supabase'; // Import Supabase client

interface AuthProps {
  onLogin: (user: User) => void; // onLogin will now be called by App.tsx
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Can be used for Google button loading state

  // Removed old useEffect for token check
  // Removed isLogin, email, password, username states as they are not needed for Google OAuth form

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      // Initiate Google OAuth flow
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin, // Redirects back to your app's origin
        },
      });

      if (error) {
        setError(error.message);
      }
      // Supabase handles the redirect, so no further code here for successful login
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during Google sign-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 p-3 rounded-full mb-4">
                <Wallet className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Kanak</h2>
            <p className="text-gray-500 mt-2 text-center">Manage group expenses easily.</p>
        </div>

        {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100 mb-4">{error}</div>}

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 font-medium transition-colors shadow-sm"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          ) : (
            <>
              <img src="https://www.svgrepo.com/show/303108/google-icon-logo.svg" alt="Google logo" className="h-5 w-5 mr-3" />
              Sign in with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
};
