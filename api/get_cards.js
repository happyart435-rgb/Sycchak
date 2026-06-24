import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Выбираем все карточки из базы данных
        const { data: cards, error } = await supabase
            .from('game_cards')
            .select('*')
            .order('price', { ascending: true });

        if (error) throw error;

        return res.status(200).json(cards);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
