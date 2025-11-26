import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GameCard from './components/GameCard';
import CreateGame from './components/CreateGame';
import GamePlayer from './components/GamePlayer';
import Auth from './components/Auth';
import Settings from './components/Settings';
import { GameModule } from './types';
import { PlusCircle, Search, Loader2, ArrowDown, Sparkles } from 'lucide-react';
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
                  handleLogout();
              } catch(e: any) {
                  alert("Hesap silme hatası: " + e.message);
              }
          }
      }
  };

  const handleLogout = async () => {
      if (supabase) {
          await (supabase.auth as any).signOut();
      }
      setSession(null);
      setActiveGame(null);
      setEditingGame(null);
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
             className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm transition-all"
          />
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
      </div>
  );

  const renderGameGrid = (gamesList: GameModule[], isPaginationEnabled = false) => {
      if (loading && gamesList.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-500"/></div>;
      
      if (gamesList.length === 0) {
          return (
            <div className="text-center py-20 bg-slate-800 rounded-xl border border-slate-700 border-dashed mx-4 sm:mx-0">
                <Search className="mx-auto h-12 w-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-white">Uygulama bulunamadı</h3>
                <p className="text-slate-400 mt-2">{searchQuery ? 'Arama kriterlerine uygun sonuç yok.' : 'Henüz içerik eklenmemiş.'}</p>
            </div>
          );
      }
      return (
        <div className="flex flex-col space-y-8 px-2 sm:px-0">
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
                <div className="flex justify-center mt-6 mb-12">
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
            onBack={() => {
                setActiveGame(null);
                setView(session ? 'home' : 'community');
            }} 
          />
        );
      case 'community':
         return (
             <div className="space-y-6 animate-fade-in pb-10">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-yellow-400 mr-2" />
                        Keşfet
                    </h1>
                    <p className="text-slate-400 max-w-lg mx-auto">Topluluk tarafından oluşturulan en yeni ve popüler içerikleri keşfedin.</p>
                </div>
                {renderSearchBar()}
                {!searchQuery && (
                    <div className="flex items-center space-x-2 text-sm text-slate-400 mb-4 px-2">
                        <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700">Önerilen</span>
                        <span>•</span>
                        <span>Karışık Sıralama</span>
                    </div>
                )}
                {renderGameGrid(publicGames, true)}
             </div>
         );
      case 'home':
      default:
        if (!session) {
             return (
                 <div className="space-y-12 animate-fade-in pb-10">
                    <div className="text-center py-16 px-4">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">EduPlay TR'ye Hoş Geldiniz</h1>
                        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">Kendi eğitici oyunlarını oluştur, paylaş ve yapay zeka desteğiyle öğrenmeyi eğlenceli hale getir.</p>
                        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <button onClick={() => setView('community')} className="px-8 py-4 bg-indigo-600 rounded-lg text-white font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-900/50 transition-all transform hover:-translate-y-1">Keşfetmeye Başla</button>
                            <button onClick={() => setView('auth')} className="px-8 py-4 bg-slate-700 rounded-lg text-white font-bold hover:bg-slate-600 border border-slate-600 transition-all">Giriş Yap</button>
                        </div>
                    </div>
                    <div>
                         <div className="flex items-center mb-6 px-4">
                             <Sparkles className="text-yellow-400 mr-2" />
                             <h2 className="text-2xl font-bold text-white">Topluluktan Seçmeler</h2>
                         </div>
                         {renderSearchBar()}
                         {renderGameGrid(publicGames, true)}
                    </div>
                 </div>
             );
        }
        
        return (
          <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-indigo-900 to-slate-800 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden border border-slate-700 mx-4 sm:mx-0">
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

            <div className="px-4 sm:px-0">
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

      <main className="flex-grow max-w-7xl w-full mx-auto sm:px-6 lg:px-8 py-8">
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