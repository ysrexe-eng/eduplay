import React from 'react';
import { Gamepad2, PlusCircle, Home, LogOut, User, Globe } from 'lucide-react';
import { supabase } from '../services/supabase';

interface NavbarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  session: any;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onChangeView, session }) => {
  
  const handleSignOut = async () => {
      await supabase.auth.signOut();
  };

  return (
    <nav className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => onChangeView('home')}>
            <div className="flex-shrink-0 flex items-center text-indigo-400">
              <Gamepad2 className="h-8 w-8 mr-2" />
              <span className="font-bold text-xl tracking-tight text-white hidden sm:block">EduPlay</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button 
              onClick={() => onChangeView('home')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'home' ? 'bg-slate-800 text-indigo-400' : 'text-gray-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <Home className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">My Apps</span>
            </button>
            
            <button 
              onClick={() => onChangeView('community')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'community' ? 'bg-slate-800 text-indigo-400' : 'text-gray-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <Globe className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Community</span>
            </button>

            {session ? (
                <>
                    <button 
                    onClick={() => onChangeView('create')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'create' ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                    >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Create</span>
                    </button>
                    <button 
                        onClick={handleSignOut}
                        className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-full"
                        title="Sign Out"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </>
            ) : (
                <button 
                    onClick={() => onChangeView('auth')}
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 border border-slate-600"
                >
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;