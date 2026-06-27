import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'No user_id provided' });

    try {
        const { data, error } = await supabase
            .from('users')
            .select('inventory')
            .eq('user_id', user_id)
            .single();

        if (error || !data) {
            return res.status(200).json({ success: true, inventory: [] });
        }

        return res.status(200).json({ success: true, inventory: data.inventory || [] });
    } catch (e) {
        return res.status(500).json({ error: 'Server error' });
    }
}
