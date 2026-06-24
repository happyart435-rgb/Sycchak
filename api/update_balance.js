import { createClient } from '@supabase/supabase-client';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    // Разрешаем кросс-доменные запросы (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { 
            user_id, username, points, energy, max_energy, 
            click_power, active_hero_id, owned_heroes, market_levels 
        } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'Missing user_id' });
        }

        // Upsert: если юзера нет — создаст, если есть — обновит данные
        const { data, error } = await supabase
            .from('users_state')
            .upsert({
                user_id: BigInt(user_id),
                username: username || 'Anonymous',
                points: points || 0,
                energy: energy || 0,
                max_energy: max_energy || 1000,
                click_power: click_power || 1,
                active_hero_id: active_hero_id || 0,
                owned_heroes: owned_heroes || [0],
                market_levels: market_levels || {},
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
