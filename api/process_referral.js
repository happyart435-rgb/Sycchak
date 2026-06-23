// api/process_referral.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
    const { referrerId, invitedId } = req.body;

    if (!referrerId || !invitedId || referrerId === invitedId) return res.status(400).send('Invalid IDs');

    // Проверяем, был ли уже приглашен этот юзер
    const { data: existing } = await supabase
        .from('referrals')
        .select('id')
        .eq('invited_id', invitedId)
        .single();

    if (existing) return res.status(200).send('Already referred');

    // Вызываем SQL функцию начисления бонуса
    await supabase.rpc('add_referral_bonus', { inviter_id: referrerId, new_user_id: invitedId });

    res.status(200).json({ success: true });
}
