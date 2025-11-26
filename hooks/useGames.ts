import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { GameModule, GameType } from '../types';

const ITEMS_PER_PAGE = 5;

export const useGames = (userId?: string) => {
    const [publicGames, setPublicGames] = useState<GameModule[]>([]);
    const [myGames, setMyGames] = useState<GameModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMorePublic, setHasMorePublic] = useState(true);
    const [publicPage, setPublicPage] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [username, setUsername] = useState('');

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
        isPublic: dbGame.is_public
    });

    // Fetch User Profile
    const fetchProfile = useCallback(async () => {
        if (!userId || !supabase) return;
        const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', userId)
            .single();
        
        if (data) setUsername(data.username);
    }, [userId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const updateProfile = async (newUsername: string) => {
        if (!userId || !supabase) return;
        const { error } = await supabase
            .from('profiles')
            .upsert({ id: userId, username: newUsername });
        if (error) throw error;
        setUsername(newUsername);
    };

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

        if (!supabase) return;

        if (reset) setLoading(true);
        
        try {
            const from = page * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            // Fetch Public Games with Author Username lookup
            let queryBuilder = supabase
                .from('games')
                .select('*, profiles(username)')
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
                const mappedGames = publicData.map(g => ({
                    ...mapDbToGame(g),
                    author: g.profiles?.username || g.author_name || 'Bilinmeyen'
                }));

                if (reset) {
                    setPublicGames(mappedGames);
                } else {
                    setPublicGames(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const newUnique = mappedGames.filter(g => !existingIds.has(g.id));
                        return [...prev, ...newUnique];
                    });
                }
                setHasMorePublic(publicData.length === ITEMS_PER_PAGE);
            }

            // Fetch My Games
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

    const saveGame = async (gameData: Partial<GameModule>, isEdit: boolean): Promise<GameModule> => {
        const authorName = username || 'Anonymous';

        if (!isSupabaseConfigured() || !supabase) {
            const localData = localStorage.getItem('demo_games');
            let demoGames: GameModule[] = localData ? JSON.parse(localData) : [];

            const newGame: GameModule = {
                ...gameData as GameModule,
                id: isEdit ? gameData.id! : `demo-${Date.now()}`,
                plays: gameData.plays || 0,
                author_id: userId || 'demo-user',
                author: authorName
            };

            if (isEdit) {
                demoGames = demoGames.map(g => g.id === newGame.id ? newGame : g);
            } else {
                demoGames = [newGame, ...demoGames];
            }

            localStorage.setItem('demo_games', JSON.stringify(demoGames));
            setMyGames(demoGames.filter(g => g.author_id === (userId || 'demo-user')));
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
            author_name: authorName
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

        const { error } = await supabase.from('games').delete().eq('id', id);
        if (error) throw error;
        
        setMyGames(prev => prev.filter(g => g.id !== id));
        setPublicGames(prev => prev.filter(g => g.id !== id));
    };

    const deleteAllUserData = async () => {
        if (!isSupabaseConfigured() || !supabase || !userId) {
            localStorage.removeItem('demo_games');
            setMyGames([]);
            return;
        }

        await supabase.from('games').delete().eq('author_id', userId);
        // Cascading deletes on Auth user removal is handled by DB usually, 
        // but here we just clear data as requested
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
        deleteAllUserData,
        username,
        updateProfile
    };
};