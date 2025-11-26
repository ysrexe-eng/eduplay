import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GameCard from './components/GameCard';
import CreateGame from './components/CreateGame';
import GamePlayer from './components/GamePlayer';
import Auth from './components/Auth';
import Settings from './components/Settings';
import { GameModule } from './types';
import { PlusCircle, Search, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { useGames } from './hooks/useGames';

const App: React.FC = () => {
  const [view, setView] = useState('home'); // 'home', 'community', 'create', 'play', 'auth', 'settings'
  const [session, setSession] = useState<any>(null);
  const [activeGame, setActiveGame] = useState<GameModule | null>(null);
  const [editingGame, setEditingGame] = useState<GameModule | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'update_password'>('signin');

  // Use custom hook for data management
  const { publicGames, myGames, loading, saveGame, deleteGame, deleteAllUserData } = useGames(session?.user?.id);

  useEffect(() => {
    const checkSession = async () => {
        const params = new URLSearchParams(window.location.search);
        
        // Handle QR Login
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (accessToken && refreshToken && type === 'qr_login' && supabase) {
             const { error } = await (supabase.auth as any).setSession({
                 access_token: accessToken,
                 refresh_token: refreshToken
             });
             if (!error) {
                 // Clean URL without reloading
                 window.history.replaceState({}, document.title, window.location.pathname);
                 // Session logic below will pick this up
             } else {
                 console.error("QR Login Error:", error);
             }
        }
        
        // Handle Password Reset Redirect from Email
        if (params.get('view') === 'reset' || window.location.hash.includes('type=recovery')) {
             setView('auth');
             setAuthMode('update_password');
        } else if (params.get('view') === 'reset') {
            setView('auth');
        }

        if (!isSupabaseConfigured()) {
            setIsAuthChecking(false);
            return; // Demo mode
        }

        if (supabase) {
            // Get initial session
            const { data: { session: initialSession } } = await (supabase.auth as any).getSession();
            setSession(initialSession);
            
            // Listen for changes
            const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((event: string, currentSession: any) => {
                setSession(currentSession);
                
                if (event === 'PASSWORD_RECOVERY') {
                    setAuthMode('update_password');
                    setView('auth');
                } else if (event === 'SIGNED_IN') {
                    // Stay on current view or go to home if in auth
                    if (view === 'auth') setView('home');
                } else if (event === 'SIGNED_OUT') {
                    // Don't force auth view, just update session state
                    setAuthMode('signin');
                }
            });

            setIsAuthChecking(false);
            return () => subscription.unsubscribe();
        }
    };

    checkSession();
  }, [view, authMode]);

  const handleSaveGame = async (gameData: Partial<GameModule>, isEdit: boolean) => {
      await saveGame(gameData, isEdit);
      setView('home');
      setEditingGame(null);
  };

  const handleDeleteGame = async (id: string) => {
      if(window.confirm("Bu uygulamayı silmek istediğinizden emin misiniz?")) {
          try {
              await deleteGame(id);
          } catch(e: any) {
              alert("Silme hatası: " + e.message);
          }
      }
  };

  const handleDeleteAccount = async () => {
      const confirmMsg = "Hesabınızı silmek istediğinizden emin misiniz?\n\nTüm oyunlarınız, beğenileriniz ve verileriniz KALICI OLARAK SİLİNECEKTİR. Bu işlem geri alınamaz.";
      if(window.confirm(confirmMsg)) {
          // Double confirm
          if(window.confirm("Lütfen son kez onaylayın: Her şeyi sil?")) {
              try {
                  await deleteAllUserData();
                  if (supabase) {
                      await (supabase.auth as any).signOut();
                  }
                  setView('auth');
                  setAuthMode('signin');
              } catch(e: any) {
                  alert("Hesap silme hatası: " + e.message);
              }
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
                <h3 className="text-lg font-medium text-white">Uygulama bulunamadı</h3>
                <p className="text-slate-400 mt-2">İlk oluşturan sen ol!</p>
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
    // Show loader while checking auth status
    if (isAuthChecking) {
         return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500"/></div>;
    }

    // Special case: If in recovery mode, show Auth regardless of session
    if (authMode === 'update_password' && view === 'auth') {
        return <Auth onSuccess={() => { setAuthMode('signin'); setView('home'); }} initialMode="update_password" />;
    }

    // If not logged in and explicitly trying to create or access settings
    if (!session && (view === 'create' || view === 'settings')) {
         return <Auth onSuccess={(user) => {
            setSession(user ? { user } : null);
            setView(view); // Stay on target view
        }} initialMode={authMode} />;
    }

    if (view === 'auth') {
          return <Auth onSuccess={() => { setView('home'); }} initialMode={authMode} />;
    }

    switch (view) {
      case 'settings':
          return <Settings session={session} onSignOut={async () => { if(supabase) await (supabase.auth as any).signOut(); }} />;
      case 'create':
        return (
          <CreateGame 
            onSave={handleSaveGame} 
            onCancel={() => {
                setEditingGame(null);
                setView('home');
            }} 
            initialGame={editingGame}
            userId={session.user.id}
          />
        );
      case 'play':
        if (!activeGame) return <div>Hata: Oyun seçilmedi</div>;
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
                    <h1 className="text-3xl font-bold text-white mb-2">Topluluk Uygulamaları</h1>
                    <p className="text-slate-400">Başkaları tarafından oluşturulan eğitici oyunları keşfet.</p>
                </div>
                {renderGameGrid(publicGames)}
             </div>
         );
      case 'home':
      default:
        // Default View: Show My Apps if logged in, otherwise just a welcome or empty state (or force community)
        if (!session) {
             // If not logged in, show Community by default or a landing page
             return (
                 <div className="space-y-8 animate-fade-in">
                    <div className="text-center py-10">
                        <h1 className="text-4xl font-bold text-white mb-4">EduPlay TR'ye Hoş Geldiniz</h1>
                        <p className="text-xl text-slate-300 mb-8">Kendi eğitici oyunlarını oluştur, paylaş ve oyna.</p>
                        <div className="flex justify-center space-x-4">
                            <button onClick={() => setView('community')} className="px-6 py-3 bg-indigo-600 rounded-lg text-white font-bold hover:bg-indigo-500">Keşfetmeye Başla</button>
                            <button onClick={() => setView('auth')} className="px-6 py-3 bg-slate-700 rounded-lg text-white font-bold hover:bg-slate-600">Giriş Yap</button>
                        </div>
                    </div>
                    <div>
                         <h2 className="text-2xl font-bold text-white mb-6">Popüler Uygulamalar</h2>
                         {renderGameGrid(publicGames)}
                    </div>
                 </div>
             );
        }
        
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-indigo-900 to-slate-800 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden border border-slate-700">
                <div className="relative z-10 max-w-xl">
                   <h1 className="text-3xl font-bold mb-4">Panelim</h1>
                   <p className="text-slate-300 mb-6 text-lg">
                     Eğitim modüllerini yönet.
                   </p>
                   <button 
                     onClick={() => { setEditingGame(null); setView('create'); }}
                     className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-500 transition-colors flex items-center shadow-md ring-1 ring-white/10"
                   >
                     <PlusCircle className="mr-2 h-5 w-5" />
                     Yeni Uygulama Oluştur
                   </button>
                </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-xl font-bold text-white">Uygulamalarım</h2>
              </div>
              {renderGameGrid(myGames)}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-100 bg-slate-900">
      <Navbar 
        currentView={view} 
        onChangeView={(v) => {
          if (v === 'create') setEditingGame(null);
          setView(v);
          setAuthMode('signin');
        }} 
        session={session} 
        onDeleteAccount={handleDeleteAccount}
      />
      
      {!isSupabaseConfigured() && (
          <div className="bg-yellow-600/20 border-b border-yellow-600/50 text-yellow-200 text-xs text-center py-1">
              Demo Modu: Veritabanı bağlı değil. Değişiklikler tarayıcı hafızasına kaydedilir.
          </div>
      )}

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
      <footer className="bg-slate-900 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-slate-500 text-sm">
            © {new Date().getFullYear()} EduPlay TR.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;