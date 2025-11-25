import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Mail, Lock, Loader2, LogIn } from 'lucide-react';

interface AuthProps {
    onSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [msg, setMsg] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMsg('');

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMsg('Registration successful! Check your email or sign in.');
                setMode('signin');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onSuccess();
            }
        } catch (error: any) {
            setMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20 bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-900/50 mb-4">
                    <LogIn className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                    {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-slate-400 mt-2">
                    {mode === 'signin' ? 'Sign in to access your games' : 'Join to start creating'}
                </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="pl-10 w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:border-indigo-500 outline-none"
                            placeholder="you@example.com"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
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

                {msg && (
                    <div className={`text-sm text-center p-2 rounded ${msg.includes('success') ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                        {msg}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
                </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
                {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-indigo-400 hover:underline font-bold">
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
            </div>
        </div>
    );
};

export default Auth;