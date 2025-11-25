
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { GameModule, GameType } from '../types';

export const useGames = (userId?: string) => {
    const [publicGames, setPublicGames] = useState<GameModule[]>([]);
    const [myGames, setMyGames] = useState<GameModule[]>([]);
    const [loading, setLoading] = useState(true);
    
    // In-memory store for Demo mode
    const [demoGames, setDemoGames] = useState<GameModule[]>([]);

    const mapDbToGame = (dbGame: any): GameModule => ({
        id: dbGame.id,
        title: dbGame.title,
        description: dbGame.description,
        category: 'Custom',
        gameType: dbGame.game_type as GameType,
        data: dbGame.data,
        settings: dbGame.settings,
        author: dbGame.author_name || 'Anonymous',
        author_id: dbGame.author_id,
        plays: dbGame.plays,
        likes: dbGame.likes,
        isPublic: dbGame.is_public
    });

    const fetchGames = useCallback(async () => {
        if (!isSupabaseConfigured()) {
            // Demo Mode: Filter local demoGames
            setMyGames(demoGames.filter(g => g.author_id === (userId || 'demo-user')));
            setPublicGames(demoGames.filter(g => g.isPublic));
            setLoading(false);
            return;
        }

        if (!supabase) return;

        setLoading(true);
        try {
            // Fetch Public Games
            const { data: publicData, error: pubError } = await supabase
                .from('games')
                .select('*')
                .eq('is_public', true)
                .order('created_at', { ascending: false });
            
            if (pubError) throw pubError;
            if (publicData) {
                setPublicGames(publicData.map(mapDbToGame));
            }

            // Fetch My Games (if logged in)
            if (userId) {
                const { data: myData, error: myError } = await supabase
                    .from('games')
                    .select('*')
                    .eq('author_id', userId)
                    .order('created_at', { ascending: false });
                
                if (myError) throw myError;
                if (myData) {
                    setMyGames(myData.map(mapDbToGame));
                }
            } else {
                setMyGames([]);
            }
        } catch (error) {
            console.error("Error fetching games:", error);
        } finally {
            setLoading(false);
        }
    }, [userId, demoGames]); // demoGames dependency ensures refresh when demo state changes

    // Setup Realtime Subscription
    useEffect(() => {
        if (!isSupabaseConfigured() || !supabase) return;

        fetchGames();

        const channel = supabase
            .channel('public:games')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, (payload) => {
                // In a production app, we might merge payload into state intelligently.
                // For simplicity, we refetch to ensure consistency (especially with sorts/filters).
                console.log('Realtime update received:', payload);
                fetchGames();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchGames]);

    const saveGame = async (gameData: Partial<GameModule>, isEdit: boolean): Promise<GameModule> => {
        // Prepare Payload
        const payload = {
            title: gameData.title,
            description: gameData.description,
            game_type: gameData.gameType,
            data: gameData.data,
            settings: gameData.settings,
            author_id: gameData.author_id,
            is_public: gameData.isPublic,
            author_name: gameData.author
        };

        if (!isSupabaseConfigured() || !supabase) {
            // DEMO MODE SAVE
            const newGame: GameModule = {
                ...gameData as GameModule,
                id: isEdit ? gameData.id! : `demo-${Date.now()}`,
                plays: gameData.plays || 0,
                likes: gameData.likes || 0,
            };

            setDemoGames(prev => {
                if (isEdit) return prev.map(g => g.id === newGame.id ? newGame : g);
                return [newGame, ...prev];
            });
            return newGame;
        }

        // SUPABASE SAVE
        let result;
        if (isEdit && gameData.id) {
            const { data, error } = await supabase
                .from('games')
                .update(payload)
                .eq('id', gameData.id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            const { data, error } = await supabase
                .from('games')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        return mapDbToGame(result);
    };

    const deleteGame = async (id: string) => {
        if (!isSupabaseConfigured() || !supabase) {
            setDemoGames(prev => prev.filter(g => g.id !== id));
            return;
        }

        // Attempt to delete associated likes first to prevent FK constraint error
        // Note: This relies on RLS allowing the user to delete likes for their own game,
        // or assumes the user is deleting their own likes.
        // If other users have liked it, this might fail without ON DELETE CASCADE in SQL.
        try {
           await supabase.from('likes').delete().eq('game_id', id);
        } catch (e) {
            console.warn("Could not delete associated likes, proceeding to delete game...", e);
        }

        const { error } = await supabase.from('games').delete().eq('id', id);
        if (error) throw error;
        
        // Optimistic update (Realtime will also trigger)
        setMyGames(prev => prev.filter(g => g.id !== id));
        setPublicGames(prev => prev.filter(g => g.id !== id));
    };

    return {
        publicGames,
        myGames,
        loading,
        fetchGames,
        saveGame,
        deleteGame
    };
};
