
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Mail, Lock, Loader2, LogIn, AlertTriangle, ArrowLeft, KeyRound, CheckCircle } from 'lucide-react';

interface AuthProps {
    onSuccess: (user?: any) => void;
    initialMode?: 'signin' | 'signup' | 'forgot' | 'update_password';
}

const Auth: React.FC<AuthProps> = ({ onSuccess, initialMode = 'signin' }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'update_password'>(initialMode);
    const [msg, setMsg] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    const isDemo = !isSupabaseConfigured();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMsg('');
        setIsSuccess(false);

        if (isDemo) {
            // Demo Mode Simulation
            setTimeout(() => {
                onSuccess({ id: 'demo-user', email: 'demo@example.com' });
            }, 1000);
            return;
        }

        if (!supabase) return;

        try {
            if (mode === 'forgot') {
                const { error } = await (supabase.auth as any).resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/?view=reset', // Handle reset flow
                });
                if (error) throw error;
                setMsg('Şifre sıfırlama bağlantısı e-postanıza gönderildi.');
                setIsSuccess(true);
            } else if (mode === 'signup') {
                const { error } = await (supabase.auth as any).signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMsg('Kayıt başarılı! Onaylamak için e-postanızı kontrol edin.');
                setIsSuccess(true);
                setMode('signin');
            } else if (mode === 'update_password') {
                const { error } = await (supabase.auth as any).updateUser({
                    password: password
                });
                if (error) throw error;
                setMsg('Şifre başarıyla güncellendi!');
                setIsSuccess(true);
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            } else {
                const { error } = await (supabase.auth as any).signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onSuccess();
            }
        } catch (error: any) {
            console.error("Auth error:", error);
            setMsg(error.message || "Beklenmeyen bir hata oluştu");
            setIsSuccess(false);
        } finally {
            setLoading(false);
        }
    };

    if (isDemo) {
         return (
            <div className="max-w-md mx-auto mt-20 bg-slate-800 p-8 rounded-2xl shadow-2xl border border-yellow-600/50">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Demo Modu</h2>
                    <p className="text-slate-400 mb-6">Veritabanı bağlantısı yapılandırılmamış. Uygulamayı çevrimdışı demo modunda kullanabilirsiniz.</p>
                    <button 
                        onClick={handleAuth}
                        disabled={loading}
                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg flex items-center justify-center transition-colors"
                    >
                         {loading ? <Loader2 className="animate-spin" /> : 'Demo Moduna Gir'}
                    </button>
                </div>
            </div>
         );
    }

    const getTitle = () => {
        switch(mode) {
            case 'signin': return 'Tekrar Hoş Geldiniz';
            case 'signup': return 'Hesap Oluştur';
            case 'forgot': return 'Şifreyi Sıfırla';
            case 'update_password': return 'Yeni Şifre Belirle';
        }
    };

    const getSubtitle = () => {
         switch(mode) {
            case 'signin': return 'Oyunlarınıza erişmek için giriş yapın';
            case 'signup': return 'Oluşturmaya başlamak için katılın';
            case 'forgot': return 'Sıfırlama bağlantısı için e-posta girin';
            case 'update_password': return 'Yeni şifrenizi girin';
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20 bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-900/50 mb-4">
                    {mode === 'forgot' || mode === 'update_password' ? <KeyRound className="w-8 h-8 text-indigo-400" /> : <LogIn className="w-8 h-8 text-indigo-400" />}
                </div>
                <h2 className="text-2xl font-bold text-white">{getTitle()}</h2>
                <p className="text-slate-400 mt-2">{getSubtitle()}</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                {mode !== 'update_password' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">E-posta</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="pl-10 w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:border-indigo-500 outline-none"
                                placeholder="sen@ornek.com"
                            />
                        </div>
                    </div>
                )}
                
                {mode !== 'forgot' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">{mode === 'update_password' ? 'Yeni Şifre' : 'Şifre'}</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="pl-10 w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:border-indigo-500 outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                )}

                {mode === 'signin' && (
                    <div className="flex justify-end">
                        <button type="button" onClick={() => setMode('forgot')} className="text-sm text-indigo-400 hover:text-indigo-300">
                            Şifremi unuttum?
                        </button>
                    </div>
                )}

                {msg && (
                    <div className={`text-sm text-center p-2 rounded flex items-center justify-center ${isSuccess ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                        {isSuccess && <CheckCircle className="w-4 h-4 mr-2"/>} {msg}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || (isSuccess && mode === 'update_password')}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                        (mode === 'signin' ? 'Giriş Yap' : mode === 'signup' ? 'Kayıt Ol' : mode === 'update_password' ? 'Şifreyi Güncelle' : 'Bağlantı Gönder')}
                </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
                {mode === 'forgot' ? (
                     <button onClick={() => setMode('signin')} className="text-indigo-400 hover:underline font-bold flex items-center justify-center w-full">
                        <ArrowLeft className="w-4 h-4 mr-1"/> Giriş Yap'a Dön
                     </button>
                ) : mode === 'update_password' ? (
                     <span/>
                ) : (
                    <>
                        {mode === 'signin' ? "Hesabın yok mu? " : "Zaten hesabın var mı? "}
                        <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-indigo-400 hover:underline font-bold">
                            {mode === 'signin' ? 'Kayıt Ol' : 'Giriş Yap'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default Auth;
