import React, { useState } from 'react';
import { GameModule, GameType } from '../types';
import { Brain, Copy, CheckSquare, Layers, ListOrdered, Type, Edit, Trash2, Play, Heart, Globe, Lock } from 'lucide-react';
import { supabase } from '../services/supabase';

interface GameCardProps {
  game: GameModule;
  onPlay: (game: GameModule) => void;
  onEdit: (game: GameModule) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
}

const GameCard: React.FC<GameCardProps> = ({ game, onPlay, onEdit, onDelete, currentUserId }) => {
  const [likes, setLikes] = useState(game.likes || 0);
  const [liked, setLiked] = useState(false); // Simple local state for UX, real sync via refetching usually
  
  const isOwner = currentUserId === game.author_id;

  const handleLike = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!currentUserId) return; // Prevent liking if not logged in

      try {
          if (!liked) {
              setLikes(l => l + 1);
              setLiked(true);
              await supabase.from('likes').insert({ user_id: currentUserId, game_id: game.id });
              await supabase.rpc('increment_likes', { row_id: game.id });
          }
      } catch (err) {
          // ignore duplicate key error
      }
  };
  
  const getIcon = () => {
    switch(game.gameType) {
      case GameType.QUIZ: return <CheckSquare className="h-8 w-8 text-emerald-400" />;
      case GameType.MATCHING: return <Layers className="h-8 w-8 text-blue-400" />;
      case GameType.TRUE_FALSE: return <Brain className="h-8 w-8 text-orange-400" />;
      case GameType.FLASHCARD: return <Copy className="h-8 w-8 text-purple-400" />;
      case GameType.SEQUENCE: return <ListOrdered className="h-8 w-8 text-yellow-400" />;
      case GameType.CLOZE: return <Type className="h-8 w-8 text-pink-400" />;
      default: return <Brain className="h-8 w-8 text-gray-400" />;
    }
  };

  const getLabel = () => {
     switch(game.gameType) {
      case GameType.QUIZ: return "Quiz";
      case GameType.MATCHING: return "Matching";
      case GameType.TRUE_FALSE: return "True / False";
      case GameType.FLASHCARD: return "Flashcards";
      case GameType.SEQUENCE: return "Ordering";
      case GameType.CLOZE: return "Fill Blanks";
      default: return "Game";
    }
  };

  return (
    <div className="card-hover bg-slate-800 rounded-xl shadow-md border border-slate-700 overflow-hidden flex flex-col h-full group relative">
      
      {/* Edit/Delete Actions - Only for Owner */}
      {isOwner && (
          <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(game); }}
              className="p-2 bg-slate-700 rounded-full hover:bg-indigo-600 text-white shadow-lg border border-slate-600 transition-colors"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(game.id); }}
              className="p-2 bg-slate-700 rounded-full hover:bg-red-600 text-white shadow-lg border border-slate-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
      )}

      {/* Visibility Badge for Owner */}
      {isOwner && (
         <div className="absolute top-2 left-2 z-10">
             <span className={`flex items-center text-[10px] uppercase font-bold px-2 py-1 rounded-full ${game.isPublic ? 'bg-emerald-900/80 text-emerald-400' : 'bg-slate-900/80 text-slate-400'}`}>
                 {game.isPublic ? <Globe className="w-3 h-3 mr-1"/> : <Lock className="w-3 h-3 mr-1"/>}
                 {game.isPublic ? 'Public' : 'Private'}
             </span>
         </div>
      )}

      <div className="h-32 w-full flex items-center justify-center bg-slate-700 group-hover:bg-slate-600 transition-colors cursor-pointer" onClick={() => onPlay(game)}>
        {getIcon()}
      </div>
      
      <div className="p-4 flex-grow flex flex-col cursor-pointer" onClick={() => onPlay(game)}>
        <div className="flex items-center justify-between mb-2">
           <span className="text-xs font-semibold px-2 py-1 bg-slate-700 rounded-full text-gray-300 border border-slate-600">
             {getLabel()}
           </span>
           <div className="flex items-center text-gray-400 text-xs" onClick={handleLike}>
               <Heart className={`w-3 h-3 mr-1 ${liked ? 'fill-red-500 text-red-500' : ''}`} /> {likes}
           </div>
        </div>
        <h3 className="font-bold text-white mb-1 line-clamp-1 text-lg">{game.title}</h3>
        <p className="text-sm text-gray-400 line-clamp-2">{game.description}</p>
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-700/50">
            <span className="text-xs text-gray-500 truncate max-w-[100px]">By {game.author}</span>
            <span className="text-xs text-indigo-400 flex items-center font-semibold">
              <Play className="w-3 h-3 mr-1" /> Play
            </span>
        </div>
      </div>
    </div>
  );
};

export default GameCard;