import React, { useState, useEffect } from 'react';
import { User, Save, Loader2 } from 'lucide-react';
import { useGames } from '../hooks/useGames';

interface SettingsProps {
    session: any;
    onSignOut: () => void;
}

const Settings: React.FC<SettingsProps> = ({ session, onSignOut }) => {
    const { username, updateProfile } = useGames(session?.user?.id);
    const [inputUsername, setInputUsername] = useState('');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        if (username) setInputUsername(username);
    }, [username]);

    const handleSaveProfile = async () => {
        if (!inputUsername.trim()) return;
        setSaving(true);
        try {
            await updateProfile(inputUsername.trim());
            setMsg('Kullanıcı adı güncellendi.');
        } catch (e: any) {
            setMsg('Hata: ' + e.message);
        } finally {
            setSaving(false);
            setTimeout(() => setMsg(''), 3000);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
             <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Ayarlar</h1>
                <p className="text-slate-400">Hesap ve profil yönetimi.</p>
            </div>

            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
                 <div className="p-6 border-b border-slate-700">
                     <h2 className="text-xl font-bold text-white flex items-center">
                         <User className="w-5 h-5 mr-2 text-indigo-400"/> Profil Bilgileri
                     </h2>
                 </div>
                 <div className="p-6 space-y-6">
                     <div>
                         <label className="text-sm text-gray-400">E-posta Adresi</label>
                         <p className="text-white font-medium text-lg bg-slate-900 p-3 rounded mt-1 opacity-50 cursor-not-allowed">{session?.user?.email}</p>
                     </div>
                     <div>
                         <label className="text-sm text-gray-400">Kullanıcı Adı (Herkese Açık)</label>
                         <div className="flex space-x-2 mt-1">
                             <input 
                                value={inputUsername}
                                onChange={(e) => setInputUsername(e.target.value)}
                                className="flex-grow bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-indigo-500 outline-none"
                                placeholder="Kullanıcı adı belirle..."
                             />
                             <button 
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="bg-indigo-600 text-white px-6 rounded font-bold hover:bg-indigo-500 disabled:opacity-50"
                             >
                                 {saving ? <Loader2 className="animate-spin"/> : <Save size={20}/>}
                             </button>
                         </div>
                         {msg && <p className={`text-sm mt-2 ${msg.includes('Hata') ? 'text-red-400' : 'text-emerald-400'}`}>{msg}</p>}
                     </div>
                 </div>
            </div>
        </div>
    );
};

export default Settings;