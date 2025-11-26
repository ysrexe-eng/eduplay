import React from 'react';
import { GameModule, GameType } from '../types';
import { Brain, Copy, CheckSquare, Layers, ListOrdered, Type, Edit, Trash2, Play, Globe, Lock, Shuffle, Dna } from 'lucide-react';

interface GameCardProps {
  game: GameModule;
  onPlay: (game: GameModule) => void;
  onEdit: (game: GameModule) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
}

const GameCard: React.FC<GameCardProps> = ({ game, onPlay, onEdit, onDelete, currentUserId }) => {
  const isOwner = currentUserId === game.author_id;

  const getIcon = () => {
    switch(game.gameType) {
      case GameType.QUIZ: return <CheckSquare className="h-8 w-8 text-emerald-400" />;
      case GameType.MATCHING: return <Layers className="h-8 w-8 text-blue-400" />;
      case GameType.TRUE_FALSE: return <Brain className="h-8 w-8 text-orange-400" />;
      case GameType.FLASHCARD: return <Copy className="h-8 w-8 text-purple-400" />;
      case GameType.SEQUENCE: return <ListOrdered className="h-8 w-8 text-yellow-400" />;
      case GameType.CLOZE: return <Type className="h-8 w-8 text-pink-400" />;
      case GameType.SCRAMBLE: return <Dna className="h-8 w-8 text-red-400" />;
      case GameType.MIXED: return <Shuffle className="h-8 w-8 text-cyan-400" />;
      default: return <Brain className="h-8 w-8 text-slate-400" />;
    }
  };

  const getLabel = () => {
     switch(game.gameType) {
      case GameType.QUIZ: return "Test";
      case GameType.MATCHING: return "Eşleştirme";
      case GameType.TRUE_FALSE: return "Doğru / Yanlış";
      case GameType.FLASHCARD: return "Kartlar";
      case GameType.SEQUENCE: return "Sıralama";
      case GameType.CLOZE: return "Boşluk Doldurma";
      case GameType.SCRAMBLE: return "Kelime Avı";
      case GameType.MIXED: return "Oyun";
      default: return "Oyun";
    }
  };

  return (
    <div className="card-hover bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden flex flex-col h-full group relative hover:border-slate-500 transition-colors">
      
      {/* Edit/Delete Actions - Only for Owner */}
      {isOwner && (
          <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(game); }}
              className="p-2 bg-slate-900/80 backdrop-blur rounded-full hover:bg-indigo-600 hover:text-white text-white shadow-lg border border-slate-600 transition-colors"
              title="Düzenle"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(game.id); }}
              className="p-2 bg-slate-900/80 backdrop-blur rounded-full hover:bg-red-600 text-white shadow-lg border border-slate-600 transition-colors"
              title="Sil"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
      )}

      {/* Visibility Badge for Owner */}
      {isOwner && (
         <div className="absolute top-2 left-2 z-10">
             <span className={`flex items-center text-[10px] uppercase font-bold px-2 py-1 rounded-full border ${game.isPublic ? 'bg-black/50 text-emerald-400 border-emerald-900' : 'bg-black/50 text-slate-400 border-slate-600'}`}>
                 {game.isPublic ? <Globe className="w-3 h-3 mr-1"/> : <Lock className="w-3 h-3 mr-1"/>}
                 {game.isPublic ? 'Herkese Açık' : 'Gizli'}
             </span>
         </div>
      )}

      <div className="h-32 w-full flex items-center justify-center bg-slate-900/50 group-hover:bg-slate-900/70 transition-colors cursor-pointer border-b border-slate-700" onClick={() => onPlay(game)}>
        {getIcon()}
      </div>
      
      <div className="p-5 flex-grow flex flex-col cursor-pointer" onClick={() => onPlay(game)}>
        <div className="flex items-center justify-between mb-3">
           <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-700 rounded text-slate-300">
             {getLabel()}
           </span>
        </div>
        <h3 className="font-bold text-white mb-2 line-clamp-1 text-lg leading-snug break-words">{game.title}</h3>
        <p className="text-sm text-slate-400 line-clamp-2 break-words leading-relaxed">{game.description}</p>
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-700/50">
            <span className="text-xs text-slate-500 truncate max-w-[100px]">{game.author}</span>
            <span className="text-xs text-white flex items-center font-semibold bg-slate-700 px-2 py-1 rounded-full">
              <Play className="w-3 h-3 mr-1 fill-white" /> {game.plays || 0}
            </span>
        </div>
      </div>
    </div>
  );
};

export default GameCard;