import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { GameModule, GameType } from '../types';

const ITEMS_PER_PAGE = 12;

export const useGames = (userId?: string) => {
    const [publicGames, setPublicGames] = useState<GameModule[]>([]);
    const [myGames, setMyGames] = useState<GameModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMorePublic, setHasMorePublic] = useState(true);
    const [publicPage, setPublicPage] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Helper to map DB columns to our Typescript Interface
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

    // 1. Fetch Games Function (Paginated & Searchable)
    const fetchGames = useCallback(async (page = 0, query = '', reset = false) => {
        // DEMO MODE
        if (!isSupabaseConfigured()) {
            const localData = localStorage.getItem('demo_games');
            const demoGames: GameModule[] = localData ? JSON.parse(localData) : [];
            
            let filtered = demoGames;
            if (query) {
                const lowerQ = query.toLowerCase();
                filtered = demoGames.filter(g => 
                    g.title.toLowerCase().includes(lowerQ) || 
                    g.description.toLowerCase().includes(lowerQ)
                );
            }

            // Simple client-side pagination simulation
            const start = page * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const slice = filtered.slice(start, end);

            if (reset) {
                setMyGames(filtered.filter(g => g.author_id === (userId || 'demo-user')));
                setPublicGames(slice.filter(g => g.isPublic));
            } else {
                setPublicGames(prev => [...prev, ...slice.filter(g => g.isPublic)]);
            }
            
            setHasMorePublic(end < filtered.filter(g => g.isPublic).length);
            setLoading(false);
            return;
        }

        // SUPABASE MODE
        if (!supabase) return;

        if (reset) setLoading(true);
        
        try {
            const from = page * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            // A. Fetch Public Games
            let queryBuilder = supabase
                .from('games')
                .select('*')
                .eq('is_public', true)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (query) {
                queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
            }

            const { data: publicData, error: pubError } = await queryBuilder;
            
            if (pubError) {
                console.error("Error fetching public games:", pubError);
            } else if (publicData) {
                const mappedGames = publicData.map(mapDbToGame);
                if (reset) {
                    setPublicGames(mappedGames);
                } else {
                    setPublicGames(prev => {
                        // Avoid duplicates if realtime pushed something that pagination also fetched
                        const existingIds = new Set(prev.map(p => p.id));
                        const newUnique = mappedGames.filter(g => !existingIds.has(g.id));
                        return [...prev, ...newUnique];
                    });
                }
                setHasMorePublic(publicData.length === ITEMS_PER_PAGE);
            }

            // B. Fetch My Games (if logged in) - Fetch all for now or separate pagination later
            // For "My Games", we usually want to see them all, but let's just fetch recent ones
            if (userId && reset) {
                let myQuery = supabase
                    .from('games')
                    .select('*')
                    .eq('author_id', userId)
                    .order('created_at', { ascending: false });
                
                if (query) {
                    myQuery = myQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
                }

                const { data: myData, error: myError } = await myQuery;
                
                if (myError) {
                    console.error("Error fetching my games:", myError);
                } else if (myData) {
                    setMyGames(myData.map(mapDbToGame));
                }
            } else if (!userId) {
                setMyGames([]);
            }
        } catch (error) {
            console.error("Unexpected error fetching games:", error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Initial Load & Search change
    useEffect(() => {
        setPublicPage(0);
        fetchGames(0, searchQuery, true);
    }, [fetchGames, searchQuery]);

    const loadMore = () => {
        const nextPage = publicPage + 1;
        setPublicPage(nextPage);
        fetchGames(nextPage, searchQuery, false);
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    // 2. Realtime Subscription Setup
    useEffect(() => {
        if (!isSupabaseConfigured() || !supabase) return;

        const channel = supabase
            .channel('public:games')
            .on(
                'postgres_changes', 
                { event: '*', schema: 'public', table: 'games' }, 
                (payload) => {
                    const newGame = payload.new ? mapDbToGame(payload.new) : null;
                    const oldGameId = payload.old ? (payload.old as any).id : null;

                    if (payload.eventType === 'INSERT' && newGame) {
                        // Only add if it matches current search
                        const matchesSearch = !searchQuery || 
                            newGame.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            newGame.description.toLowerCase().includes(searchQuery.toLowerCase());

                        if (matchesSearch) {
                            if (newGame.isPublic) {
                                setPublicGames(prev => [newGame, ...prev]);
                            }
                            if (userId && newGame.author_id === userId) {
                                setMyGames(prev => [newGame, ...prev]);
                            }
                        }
                    } else if (payload.eventType === 'UPDATE' && newGame) {
                         setPublicGames(prev => {
                            if (newGame.isPublic) {
                                const exists = prev.some(g => g.id === newGame.id);
                                return exists 
                                    ? prev.map(g => g.id === newGame.id ? newGame : g) 
                                    : [newGame, ...prev]; 
                            } else {
                                return prev.filter(g => g.id !== newGame.id);
                            }
                        });
                        if (userId) {
                            setMyGames(prev => prev.map(g => g.id === newGame.id ? newGame : g));
                        }
                    } else if (payload.eventType === 'DELETE' && oldGameId) {
                        setPublicGames(prev => prev.filter(g => g.id !== oldGameId));
                        setMyGames(prev => prev.filter(g => g.id !== oldGameId));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, searchQuery]);

    // 3. Save Function
    const saveGame = async (gameData: Partial<GameModule>, isEdit: boolean): Promise<GameModule> => {
        // DEMO MODE SAVE
        if (!isSupabaseConfigured() || !supabase) {
            const localData = localStorage.getItem('demo_games');
            let demoGames: GameModule[] = localData ? JSON.parse(localData) : [];

            const newGame: GameModule = {
                ...gameData as GameModule,
                id: isEdit ? gameData.id! : `demo-${Date.now()}`,
                plays: gameData.plays || 0,
                likes: gameData.likes || 0,
                author_id: userId || 'demo-user',
                author: 'You'
            };

            if (isEdit) {
                demoGames = demoGames.map(g => g.id === newGame.id ? newGame : g);
            } else {
                demoGames = [newGame, ...demoGames];
            }

            localStorage.setItem('demo_games', JSON.stringify(demoGames));
            setMyGames(demoGames.filter(g => g.author_id === (userId || 'demo-user'))); // Update local state immediately
            return newGame;
        }

        const payload = {
            title: gameData.title,
            description: gameData.description,
            game_type: gameData.gameType,
            data: gameData.data,
            settings: gameData.settings,
            author_id: userId,
            is_public: gameData.isPublic,
            author_name: gameData.author
        };

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

    // 4. Delete Function
    const deleteGame = async (id: string) => {
        if (!isSupabaseConfigured() || !supabase) {
            const localData = localStorage.getItem('demo_games');
            if (localData) {
                const demoGames: GameModule[] = JSON.parse(localData);
                const filtered = demoGames.filter(g => g.id !== id);
                localStorage.setItem('demo_games', JSON.stringify(filtered));
                setMyGames(prev => prev.filter(g => g.id !== id));
                setPublicGames(prev => prev.filter(g => g.id !== id));
            }
            return;
        }

        const { error: likeError } = await supabase.from('likes').delete().eq('game_id', id);
        if (likeError) console.warn("Error cleaning up likes:", likeError.message);

        const { error } = await supabase.from('games').delete().eq('id', id);
        if (error) throw error;
    };

    // 5. Delete All User Data
    const deleteAllUserData = async () => {
        if (!isSupabaseConfigured() || !supabase || !userId) {
            const localData = localStorage.getItem('demo_games');
            if (localData) {
                const demoGames: GameModule[] = JSON.parse(localData);
                const filtered = demoGames.filter(g => g.author_id !== 'demo-user');
                localStorage.setItem('demo_games', JSON.stringify(filtered));
                setMyGames([]);
            }
            return;
        }

        try {
            await supabase.from('likes').delete().eq('user_id', userId);
            
            const { data: userGames } = await supabase.from('games').select('id').eq('author_id', userId);
            if (userGames && userGames.length > 0) {
                const gameIds = userGames.map(g => g.id);
                await supabase.from('likes').delete().in('game_id', gameIds);
                await supabase.from('games').delete().in('id', gameIds);
            }
        } catch (error) {
            console.error("Error deleting user data:", error);
            throw error;
        }
    };

    return {
        publicGames,
        myGames,
        loading,
        hasMorePublic,
        loadMore,
        handleSearch,
        searchQuery,
        saveGame,
        deleteGame,
        deleteAllUserData
    };
};