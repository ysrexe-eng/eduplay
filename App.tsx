import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GameCard from './components/GameCard';
import CreateGame from './components/CreateGame';
import GamePlayer from './components/GamePlayer';
import Auth from './components/Auth';
import Settings from './components/Settings';
import { GameModule } from './types';
import { PlusCircle, Search, Loader2, ArrowDown } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { useGames } from './hooks/useGames';

const App: React.FC = () => {
  const [view, setView] = useState('home'); // 'home', 'community', 'create', 'play', 'auth', 'settings'
  const [session, setSession] = useState<any>(null);
  const [activeGame, setActiveGame] = useState<GameModule | null>(null);
  const [editingGame, setEditingGame] = useState<GameModule | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'update_password'>('signin');

  const { 
    publicGames, 
    myGames, 
    loading, 
    saveGame, 
    deleteGame, 
    deleteAllUserData,
    hasMorePublic,
    loadMore,
    handleSearch,
    searchQuery
  } = useGames(session?.user?.id);

  useEffect(() => {
    const checkSession = async () => {
        const params = new URLSearchParams(window.location.search);
        
        if (params.get('view') === 'reset' || window.location.hash.includes('type=recovery')) {
             setView('auth');
             setAuthMode('update_password');
        } else if (params.get('view') === 'reset') {
            setView('auth');
        }

        if (!isSupabaseConfigured()) {
            setIsAuthChecking(false);
            return;
        }

        if (supabase) {
            const { data: { session: initialSession } } = await (supabase.auth as any).getSession();
            setSession(initialSession);
            
            const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((event: string, currentSession: any) => {
                setSession(currentSession);
                if (event === 'PASSWORD_RECOVERY') {
                    setAuthMode('update_password');
                    setView('auth');
                } else if (event === 'SIGNED_IN') {
                    if (view === 'auth') setView('home');
                } else if (event === 'SIGNED_OUT') {
                    setSession(null);
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
      const confirmMsg = "Hesabınızı silmek istediğinizden emin misiniz?\n\nTüm oyunlarınız ve verileriniz KALICI OLARAK SİLİNECEKTİR. Bu işlem geri alınamaz.";
      if(window.confirm(confirmMsg)) {
          if(window.confirm("Lütfen son kez onaylayın: Her şeyi sil?")) {
              try {
                  await deleteAllUserData();
                  if (supabase) {
                      await (supabase.auth as any).signOut();
                  }
                  setSession(null);
                  setView('auth');
                  setAuthMode('signin');
              } catch(e: any) {
                  alert("Hesap silme hatası: " + e.message);
              }
          }
      }
  };

  const handleLogout = () => {
      setSession(null);
      setAuthMode('signin');
      setView('auth');
  };

  const handlePlayGame = (game: GameModule) => {
    setActiveGame(game);
    setView('play');
  };

  const renderSearchBar = () => (
      <div className="mb-6 relative">
          <input 
             type="text" 
             placeholder="Uygulama veya açıklama ara..." 
             value={searchQuery}
             onChange={(e) => handleSearch(e.target.value)}
             className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm"
          />
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
      </div>
  );

  const renderGameGrid = (gamesList: GameModule[], isPaginationEnabled = false) => {
      if (loading && gamesList.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-500"/></div>;
      
      if (gamesList.length === 0) {
          return (
            <div className="text-center py-20 bg-slate-800 rounded-xl border border-slate-700 border-dashed">
                <Search className="mx-auto h-12 w-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-white">Uygulama bulunamadı</h3>
                <p className="text-slate-400 mt-2">{searchQuery ? 'Arama kriterlerine uygun sonuç yok.' : 'Henüz içerik eklenmemiş.'}</p>
            </div>
          );
      }
      return (
        <div className="flex flex-col space-y-8">
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
            {isPaginationEnabled && hasMorePublic && (
                <div className="flex justify-center mt-6">
                    <button 
                        onClick={loadMore}
                        disabled={loading}
                        className="flex items-center px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-medium transition-colors border border-slate-700 shadow-lg"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <ArrowDown className="w-4 h-4 mr-2" />}
                        Daha Fazla Yükle
                    </button>
                </div>
            )}
        </div>
      );
  };

  const renderContent = () => {
    if (isAuthChecking) {
         return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500"/></div>;
    }

    if (authMode === 'update_password' && view === 'auth') {
        return <Auth onSuccess={() => { setAuthMode('signin'); setView('home'); }} initialMode="update_password" />;
    }

    if (!session && (view === 'create' || view === 'settings')) {
         return <Auth onSuccess={(user) => {
            setSession(user ? { user } : null);
            setView(view); 
        }} initialMode={authMode} />;
    }

    if (view === 'auth') {
          return <Auth onSuccess={() => { setView('home'); }} initialMode={authMode} />;
    }

    switch (view) {
      case 'settings':
          return <Settings session={session} onSignOut={handleLogout} />;
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
             <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Topluluk Uygulamaları</h1>
                    <p className="text-slate-400">Keşfet, Oyna ve Öğren.</p>
                </div>
                {renderSearchBar()}
                {renderGameGrid(publicGames, true)}
             </div>
         );
      case 'home':
      default:
        if (!session) {
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
                         {renderSearchBar()}
                         {renderGameGrid(publicGames, true)}
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
                     Uygulamalarını yönet ve düzenle.
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
              {renderSearchBar()}
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
        onLogout={handleLogout}
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