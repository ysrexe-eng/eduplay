import React from 'react';
import { User, Smartphone, LogOut } from 'lucide-react';

interface SettingsProps {
    session: any;
    onSignOut: () => void;
}

const Settings: React.FC<SettingsProps> = ({ session, onSignOut }) => {
    const getQrCodeUrl = () => {
        if (!session) return '';
        // Construct the login URL for other devices
        const baseUrl = window.location.origin;
        // Use standard query parameters for robust parsing
        const loginUrl = `${baseUrl}/?access_token=${session.access_token}&refresh_token=${session.refresh_token}&type=qr_login`;
        // Encode for QR API
        return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(loginUrl)}`;
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
             <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Ayarlar</h1>
                <p className="text-slate-400">Hesap ve cihaz yönetimi.</p>
            </div>

            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
                 <div className="p-6 border-b border-slate-700">
                     <h2 className="text-xl font-bold text-white flex items-center">
                         <User className="w-5 h-5 mr-2 text-indigo-400"/> Hesap Bilgileri
                     </h2>
                 </div>
                 <div className="p-6">
                     <div className="mb-4">
                         <label className="text-sm text-gray-400">E-posta Adresi</label>
                         <p className="text-white font-medium text-lg">{session?.user?.email}</p>
                     </div>
                     <button onClick={onSignOut} className="px-4 py-2 border border-slate-600 text-gray-300 hover:text-white rounded hover:bg-slate-700 transition-colors flex items-center">
                         <LogOut className="w-4 h-4 mr-2"/> Çıkış Yap
                     </button>
                 </div>
            </div>

            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
                 <div className="p-6 border-b border-slate-700">
                     <h2 className="text-xl font-bold text-white flex items-center">
                         <Smartphone className="w-5 h-5 mr-2 text-indigo-400"/> Başka Cihaz Bağla
                     </h2>
                 </div>
                 <div className="p-6 flex flex-col items-center text-center">
                     <p className="text-gray-300 mb-6">Başka bir cihazda veya telefonunda anında giriş yapmak için bu karekodu tarat.</p>
                     
                     <div className="bg-white p-4 rounded-lg shadow-inner mb-6">
                         <img src={getQrCodeUrl()} alt="Login QR Code" className="w-48 h-48" />
                     </div>
                     
                     <p className="text-xs text-yellow-500/80 max-w-sm">
                         Uyarı: Bu karekodu başkalarıyla paylaşmayın. Hesabınıza tam erişim sağlar.
                     </p>
                 </div>
            </div>
        </div>
    );
};

export default Settings;