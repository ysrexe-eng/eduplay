import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GameCard from './components/GameCard';
import CreateGame from './components/CreateGame';
import GamePlayer from './components/GamePlayer';
import Auth from './components/Auth';
import { GameModule, GameType } from './types';
import { PlusCircle, Search, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './services/supabase';

const App: React.FC = () => {
  const [view, setView] = useState('home'); // 'home', 'community', 'create', 'play', 'auth'
  const [session, setSession] = useState<any>(null);
  const [myGames, setMyGames] = useState<GameModule[]>([]);
  const [publicGames, setPublicGames] = useState<GameModule[]>([]);
  const [activeGame, setActiveGame] = useState<GameModule | null>(null);
  const [editingGame, setEditingGame] = useState<GameModule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if(!session) setView('community'); // Default to community if not logged in
      fetchGames(session?.user?.id);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchGames(session?.user?.id);
      if (session) setView('home');
      else setView('community');
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchGames = async (userId?: string) => {
      setLoading(true);
      if (!isSupabaseConfigured()) {
          setLoading(false);
          return; 
      }

      // Fetch Public Games
      const { data: publicData } = await supabase
        .from('games')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      
      if (publicData) {
          const mappedPublic = publicData.map(mapDbToGame);
          setPublicGames(mappedPublic);
      }

      // Fetch My Games (if logged in)
      if (userId) {
          const { data: myData } = await supabase
            .from('games')
            .select('*')
            .eq('author_id', userId)
            .order('created_at', { ascending: false });
          
          if (myData) {
              const mappedMy = myData.map(mapDbToGame);
              setMyGames(mappedMy);
          }
      } else {
          setMyGames([]);
      }
      setLoading(false);
  };

  const mapDbToGame = (dbGame: any): GameModule => ({
      id: dbGame.id,
      title: dbGame.title,
      description: dbGame.description,
      category: 'Custom',
      gameType: dbGame.game_type as GameType,
      data: dbGame.data,
      settings: dbGame.settings,
      author: dbGame.author_name || 'Anonymous',
      author_id: dbGame.author_id,
      plays: dbGame.plays,
      likes: dbGame.likes,
      isPublic: dbGame.is_public
  });

  const handleGameCreated = (newGame: GameModule) => {
    fetchGames(session?.user?.id); // Re-fetch to sync
    setView('home');
    setEditingGame(null);
  };

  const handleEditGame = (game: GameModule) => {
      setEditingGame(game);
      setView('create');
  };

  const handleDeleteGame = async (id: string) => {
      if(window.confirm("Are you sure you want to delete this app?")) {
          const { error } = await supabase.from('games').delete().eq('id', id);
          if (!error) {
              setMyGames(myGames.filter(g => g.id !== id));
              setPublicGames(publicGames.filter(g => g.id !== id));
          } else {
              alert("Error deleting game");
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
                onEdit={handleEditGame}
                onDelete={handleDeleteGame}
                currentUserId={session?.user?.id}
            />
            ))}
        </div>
      );
  };

  const renderContent = () => {
    if (!isSupabaseConfigured()) {
        return (
            <div className="text-center p-10 bg-red-900/20 border border-red-500 rounded-xl text-white">
                <h2 className="text-2xl font-bold mb-4">Database Not Configured</h2>
                <p>Please add your Supabase URL and Key to the environment variables to enable database features.</p>
                <p className="mt-4 text-sm font-mono bg-slate-900 p-4 rounded text-left inline-block">
                    process.env.NEXT_PUBLIC_SUPABASE_URL<br/>
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                </p>
            </div>
        )
    }

    switch (view) {
      case 'auth':
          return <Auth onSuccess={() => setView('home')} />;
      case 'create':
        return session ? (
          <CreateGame 
            onGameCreated={handleGameCreated} 
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
            // If somehow here without session, redirect or show auth
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
    <div className="min-h-screen flex flex-col font-sans text-slate-100">
      <Navbar currentView={view} onChangeView={(v) => {
          if (v === 'create') setEditingGame(null);
          setView(v);
      }} session={session} />
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
      <footer className="bg-slate-900 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-slate-500 text-sm">
            © {new Date().getFullYear()} EduPlay Creator. Powered by Supabase.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;