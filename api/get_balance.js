import { createClient } from '@supabase/supabase-client';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Получаем user_id из query параметров
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: 'Missing user_id' });
    }

    try {
        const { data, error } = await supabase
            .from('users_state')
            .select('*')
            .eq('user_id', user_id)
            .single();

        if (error && error.code !== 'PGRST116') { 
            // PGRST116 означает, что строка не найдена — это нормально для новых юзеров
            throw error;
        }

        // Если юзера еще нет в базе, возвращаем дефолтные стартовые значения
        if (!data) {
            return res.status(200).json({
                points: 0,
                energy: 1000,
                max_energy: 1000,
                click_power: 1,
                active_hero_id: 0,
                owned_heroes: [0],
                market_levels: {}
            });
        }

        // Превращаем BigInt в строку/число для JSON, иначе будет ошибка
        data.user_id = data.user_id.toString();

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
