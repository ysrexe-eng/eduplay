import React, { useState, useEffect } from 'react';
import { GameModule, GameType } from '../types';
import { Brain, Copy, CheckSquare, Layers, ListOrdered, Type, Edit, Trash2, Play, Heart, Globe, Lock, Shuffle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface GameCardProps {
  game: GameModule;
  onPlay: (game: GameModule) => void;
  onEdit: (game: GameModule) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
}

const GameCard: React.FC<GameCardProps> = ({ game, onPlay, onEdit, onDelete, currentUserId }) => {
  const [likes, setLikes] = useState(game.likes || 0);
  const [liked, setLiked] = useState(false);
  
  const isOwner = currentUserId === game.author_id;

  // Sync with parent props when realtime update occurs
  useEffect(() => {
      setLikes(game.likes || 0);
  }, [game.likes]);

  // Check like status
  useEffect(() => {
      const checkLikeStatus = async () => {
          if (currentUserId && supabase) {
              // Check DB for logged in user to ensure cross-device consistency
              const { data } = await supabase
                .from('likes')
                .select('id')
                .match({ user_id: currentUserId, game_id: game.id })
                .maybeSingle(); // Use maybeSingle to avoid 406 error on no rows
              
              if (data) {
                  setLiked(true);
              }
          } else {
              // Check local storage for anonymous user
              const localLikes = JSON.parse(localStorage.getItem('liked_games') || '[]');
              if (localLikes.includes(game.id)) {
                  setLiked(true);
              }
          }
      };
      checkLikeStatus();
  }, [currentUserId, game.id]);

  const handleLike = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (liked) return;

      // Optimistic UI update
      setLikes(l => l + 1);
      setLiked(true);

      // Local Storage Update (for everyone, serves as a cache/check for anonymous)
      const localLikes = JSON.parse(localStorage.getItem('liked_games') || '[]');
      if (!localLikes.includes(game.id)) {
          localLikes.push(game.id);
          localStorage.setItem('liked_games', JSON.stringify(localLikes));
      }

      if (isSupabaseConfigured() && supabase) {
          try {
             if (currentUserId) {
                 // 1. Logged in: Insert into likes table to enforce uniqueness per user in DB
                 const { error: likeError } = await supabase.from('likes').insert({ user_id: currentUserId, game_id: game.id });
                 if (likeError && likeError.code !== '23505') { // 23505 is duplicate key
                     console.warn("Like insert error", likeError);
                 }
             }

             // 2. Increment the counter on the game table
             const { error: rpcError } = await supabase.rpc('increment_likes', { row_id: game.id });
             
             if (rpcError) {
                console.warn("RPC increment_likes failed, falling back to manual update", rpcError);
                const { data: current, error: fetchError } = await supabase.from('games').select('likes').eq('id', game.id).single();
                if (!fetchError && current) {
                    await supabase.from('games').update({ likes: (current.likes || 0) + 1 }).eq('id', game.id);
                }
             }
          } catch (err) {
              console.error("Error liking game:", err);
          }
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
      case GameType.MIXED: return <Shuffle className="h-8 w-8 text-cyan-400" />;
      default: return <Brain className="h-8 w-8 text-gray-400" />;
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
      case GameType.MIXED: return "Karışık Mod";
      default: return "Oyun";
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
              title="Düzenle"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(game.id); }}
              className="p-2 bg-slate-700 rounded-full hover:bg-red-600 text-white shadow-lg border border-slate-600 transition-colors"
              title="Sil"
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
                 {game.isPublic ? 'Herkese Açık' : 'Gizli'}
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
           <div 
             className={`flex items-center text-xs transition-colors p-1 rounded ${liked ? 'text-red-400' : 'text-gray-400 hover:text-red-400 hover:bg-slate-700'}`} 
             onClick={handleLike}
           >
               <Heart className={`w-3 h-3 mr-1 ${liked ? 'fill-red-500' : ''}`} /> {likes}
           </div>
        </div>
        <h3 className="font-bold text-white mb-1 line-clamp-1 text-lg">{game.title}</h3>
        <p className="text-sm text-gray-400 line-clamp-2">{game.description}</p>
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-700/50">
            <span className="text-xs text-gray-500 truncate max-w-[100px]">{game.author}</span>
            <span className="text-xs text-indigo-400 flex items-center font-semibold">
              <Play className="w-3 h-3 mr-1" /> Oyna
            </span>
        </div>
      </div>
    </div>
  );
};

export default GameCard;