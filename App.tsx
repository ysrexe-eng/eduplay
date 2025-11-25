
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GameCard from './components/GameCard';
import CreateGame from './components/CreateGame';
import GamePlayer from './components/GamePlayer';
import Auth from './components/Auth';
import { GameModule } from './types';
import { PlusCircle, Search, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { useGames } from './hooks/useGames';

const App: React.FC = () => {
  const [view, setView] = useState('home'); // 'home', 'community', 'create', 'play', 'auth'
  const [session, setSession] = useState<any>(null);
  const [activeGame, setActiveGame] = useState<GameModule | null>(null);
  const [editingGame, setEditingGame] = useState<GameModule | null>(null);

  // Use custom hook for data management
  const { publicGames, myGames, loading, saveGame, deleteGame } = useGames(session?.user?.id);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'reset') {
        setView('auth');
    }

    if (!isSupabaseConfigured()) {
        return;
    }

    if (supabase) {
        (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
            setSession(session);
            if(!session) setView('community');
        });

        const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
            setSession(session);
            if (session) setView('home');
            else setView('community');
        });

        return () => subscription.unsubscribe();
    }
  }, []);

  const handleSaveGame = async (gameData: Partial<GameModule>, isEdit: boolean) => {
      await saveGame(gameData, isEdit);
      setView('home');
      setEditingGame(null);
  };

  const handleDeleteGame = async (id: string) => {
      if(window.confirm("Are you sure you want to delete this app?")) {
          try {
              await deleteGame(id);
          } catch(e: any) {
              alert("Error deleting game: " + e.message);
          }
      }
  };

  const handlePlayGame = (game: GameModule) => {
    setActiveGame(game);
    setView('play');
  };

  const renderGameGrid = (gamesList: GameModule[]) => {
      if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-500"/></div>;
      
      if (gamesList.length === 0) {
          return (
            <div className="text-center py-20 bg-slate-800 rounded-xl border border-slate-700 border-dashed">
                <Search className="mx-auto h-12 w-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-white">No apps found</h3>
                <p className="text-slate-400 mt-2">Be the first to create one!</p>
            </div>
          );
      }
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {gamesList.map((game) => (
            <GameCard 
                key={game.id} 
                game={game} 
                onPlay={handlePlayGame} 
                onEdit={(g) => { setEditingGame(g); setView('create'); }}
                onDelete={handleDeleteGame}
                currentUserId={session?.user?.id}
            />
            ))}
        </div>
      );
  };

  const renderContent = () => {
    if (!session && view === 'auth') {
        return <Auth onSuccess={(user) => {
            setSession(user ? { user } : null);
            setView('home');
        }} />;
    }

    switch (view) {
      case 'auth':
          return <Auth onSuccess={() => setView('home')} />;
      case 'create':
        return session ? (
          <CreateGame 
            onSave={handleSaveGame} 
            onCancel={() => {
                setEditingGame(null);
                setView('home');
            }} 
            initialGame={editingGame}
            userId={session.user.id}
          />
        ) : <Auth onSuccess={() => setView('create')}/>;
      case 'play':
        if (!activeGame) return <div>Error: No game selected</div>;
        return (
          <GamePlayer 
            game={activeGame} 
            onBack={() => setView(session ? 'home' : 'community')} 
          />
        );
      case 'community':
         return (
             <div className="space-y-8 animate-fade-in">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Community Apps</h1>
                    <p className="text-slate-400">Explore educational games created by others.</p>
                </div>
                {renderGameGrid(publicGames)}
             </div>
         );
      case 'home':
      default:
        if (!session) {
             return <Auth onSuccess={() => setView('home')} />;
        }
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-indigo-900 to-slate-800 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden border border-slate-700">
                <div className="relative z-10 max-w-xl">
                   <h1 className="text-3xl font-bold mb-4">My Dashboard</h1>
                   <p className="text-slate-300 mb-6 text-lg">
                     Manage your educational modules.
                   </p>
                   <button 
                     onClick={() => { setEditingGame(null); setView('create'); }}
                     className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-500 transition-colors flex items-center shadow-md ring-1 ring-white/10"
                   >
                     <PlusCircle className="mr-2 h-5 w-5" />
                     Create New App
                   </button>
                </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-xl font-bold text-white">My Apps</h2>
              </div>
              {renderGameGrid(myGames)}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-100 bg-slate-900">
      <Navbar currentView={view} onChangeView={(v) => {
          if (v === 'create') setEditingGame(null);
          setView(v);
      }} session={session} />
      
      {!isSupabaseConfigured() && (
          <div className="bg-yellow-600/20 border-b border-yellow-600/50 text-yellow-200 text-xs text-center py-1">
              Demo Mode: Database not connected. Changes are local and temporary.
          </div>
      )}

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
      <footer className="bg-slate-900 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-slate-500 text-sm">
            © {new Date().getFullYear()} EduPlay Creator.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
