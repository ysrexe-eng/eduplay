import React, { useState, useRef, useEffect } from 'react';
import { Gamepad2, PlusCircle, Home, LogOut, User, Globe, ChevronDown, Trash2, Settings } from 'lucide-react';
import { supabase } from '../services/supabase';

interface NavbarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  session: any;
  onDeleteAccount?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onChangeView, session, onDeleteAccount }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
      setShowDropdown(false);
      if (supabase) {
          await (supabase.auth as any).signOut();
      }
  };

  const handleDelete = () => {
      setShowDropdown(false);
      if (onDeleteAccount) onDeleteAccount();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => onChangeView('home')}>
            <div className="flex-shrink-0 flex items-center text-indigo-400">
              <Gamepad2 className="h-8 w-8 mr-2" />
              <span className="font-bold text-xl tracking-tight text-white hidden sm:block">EduPlay TR</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button 
              onClick={() => onChangeView('home')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'home' ? 'bg-slate-800 text-indigo-400' : 'text-gray-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <Home className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Uygulamalarım</span>
            </button>
            
            <button 
              onClick={() => onChangeView('community')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'community' ? 'bg-slate-800 text-indigo-400' : 'text-gray-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <Globe className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Topluluk</span>
            </button>

            {session ? (
                <>
                    <button 
                    onClick={() => onChangeView('create')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'create' ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                    >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Oluştur</span>
                    </button>
                    
                    {/* User Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center p-2 text-gray-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors focus:outline-none"
                        >
                            <User className="h-5 w-5" />
                            <ChevronDown className="h-3 w-3 ml-1" />
                        </button>

                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-md shadow-lg py-1 border border-slate-700 ring-1 ring-black ring-opacity-5 animate-fade-in origin-top-right">
                                <div className="px-4 py-2 border-b border-slate-700">
                                    <p className="text-xs text-gray-500">Giriş yapıldı</p>
                                    <p className="text-sm font-medium text-white truncate">{session.user.email}</p>
                                </div>
                                <button
                                    onClick={() => { onChangeView('settings'); setShowDropdown(false); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white flex items-center"
                                >
                                    <Settings className="h-4 w-4 mr-2" /> Ayarlar
                                </button>
                                <button
                                    onClick={handleSignOut}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white flex items-center"
                                >
                                    <LogOut className="h-4 w-4 mr-2" /> Çıkış Yap
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 flex items-center border-t border-slate-700 mt-1"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" /> Hesabı Sil
                                </button>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <button 
                    onClick={() => onChangeView('auth')}
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 border border-slate-600"
                >
                    <User className="h-4 w-4 mr-2" />
                    Giriş Yap
                </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;