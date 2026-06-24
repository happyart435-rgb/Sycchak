import { createClient } from '@supabase/supabase-client';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Берем топ-20 игроков по количеству поинтов
        const { data, error } = await supabase
            .from('users_state')
            .select('user_id, username, points')
            .order('points', { ascending: false })
            .limit(20);

        if (error) throw error;

        const formattedData = data.map(user => ({
            ...user,
            user_id: user.user_id.toString()
        }));

        return res.status(200).json(formattedData);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
