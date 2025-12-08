import React, { useState, useEffect } from 'react';
import { User } from './types';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { GroupDetail } from './components/GroupDetail';
import { ApiDocs } from './components/ApiDocs';
import { LogOut, Wallet } from 'lucide-react';
import api, { setAuthToken } from './services/api';
import { supabase } from './services/supabase'; // Import Supabase client

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Supabase auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Set Supabase token for API calls
          setAuthToken(session.access_token);
          // Sync user with our backend
          try {
            const { data: syncedUser } = await api.post('/auth/sync', {}); // Pass empty body for POST request
            setUser(syncedUser);
          } catch (error) {
            console.error('Error syncing user with backend:', error);
            // Handle error, e.g., show a message or sign out from Supabase
            await supabase.auth.signOut();
            setUser(null);
            setAuthToken(null);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setAuthToken(null);
          setActiveGroupId(null);
          setShowDocs(false);
        }
        setLoading(false);
      }
    );

    // Check for existing session on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthToken(session.access_token);
        // Also sync user with backend if session already exists on load
        api.post('/auth/sync', {}).then(response => {
          setUser(response.data);
        }).catch(error => {
          console.error('Error syncing user on initial load:', error);
          supabase.auth.signOut();
        }).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // Empty dependency array means this runs once on mount

  // handleLogin is no longer needed as Auth component doesn't emit login event directly
  // const handleLogin = (newUser: User) => {
  //   setUser(newUser);
  // };

  const handleLogout = async () => {
    // Supabase handles token removal and session invalidation
    await supabase.auth.signOut();
    // The onAuthStateChange listener will handle updating the state (setUser(null) etc.)
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    // No onLogin prop needed for Auth component anymore
    return <Auth /* onLogin={handleLogin} */ />;
  }

  if (showDocs) {
    return <ApiDocs onBack={() => setShowDocs(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        {/* Global Nav */}
      {!activeGroupId && (
        <nav className="bg-white border-b sticky top-0 z-20">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl cursor-pointer" onClick={() => setShowDocs(false)}>
                    <Wallet className="fill-indigo-600 text-white" /> Kanak
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-right hidden sm:block">
                        <p className="font-medium text-gray-900">{user.username}</p>
                        <p className="text-gray-500 text-xs">{user.email}</p>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sign Out"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </nav>
      )}

      <main className="flex-1">
        {activeGroupId ? (
          <GroupDetail 
            user={user} 
            groupId={activeGroupId} 
            onBack={() => setActiveGroupId(null)} 
          />
        ) : (
          <Dashboard 
            user={user} 
            onSelectGroup={setActiveGroupId} 
            onViewDocs={() => setShowDocs(true)}
          />
        )}
      </main>
    </div>
  );
};

export default App;