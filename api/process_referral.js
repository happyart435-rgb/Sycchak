// api/process_referral.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { referrerId, invitedId } = req.body;

    // 1. Проверяем, не пытается ли он пригласить сам себя
    if (!referrerId || !invitedId || String(referrerId) === String(invitedId)) {
        return res.status(400).json({ error: 'Invalid IDs' });
    }

    // 2. Проверяем, нет ли уже записи об этом приглашении (защита от накрутки)
    const { data: existing } = await supabase
        .from('referrals')
        .select('id')
        .eq('invited_id', invitedId)
        .maybeSingle();

    if (existing) return res.status(200).json({ message: 'Already referred' });

    // 3. Записываем в таблицу referrals
    await supabase.from('referrals').insert({
        referrer_id: referrerId,
        invited_id: invitedId
    });

    // 4. Начисляем билеты тому, кто пригласил
    await supabase.rpc('increment_tickets', { 
        uid: referrerId, 
        amount: 5 
    });

    res.status(200).json({ success: true });
}
