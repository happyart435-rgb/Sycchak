import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    try {
        const now = new Date().toISOString();

        // 1. Ищем все карточки пользователя, у которых истек срок годности
        const { data: expiredCards } = await supabase
            .from('user_cards')
            .select('card_id, points_per_hour_snapshot')
            .eq('user_id', user_id)
            .lt('expires_at', now);

        // 2. Если есть истекшие карты, вычитаем их доход и удаляем из активных
        if (expiredCards && expiredCards.length > 0) {
            const minusIncome = expiredCards.reduce((acc, c) => acc + parseInt(c.points_per_hour_snapshot), 0);
            const expiredIds = expiredCards.map(c => c.card_id);

            // Удаляем просроченные записи из связующей таблицы
            await supabase.from('user_cards').delete().eq('user_id', user_id).in('card_id', expiredIds);

            // Получаем текущего юзера, чтобы обновить массивы
            const { data: p } = await supabase.from('users').select('owned_db_cards, passive_income_per_hour').eq('user_id', user_id).single();
            if (p) {
                const newOwned = (p.owned_db_cards || []).filter(id => !expiredIds.includes(id));
                const newIncome = Math.max(0, parseInt(p.passive_income_per_hour || 0) - minusIncome);

                await supabase.from('users').update({
                    owned_db_cards: newOwned,
                    passive_income_per_hour: newIncome
                }).eq('user_id', user_id);
            }
        }

        // 3. Берем актуальные данные пользователя
        const { data: player, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', user_id)
            .single();

        if (error || !player) return res.status(444).json({ error: 'Player not found' });

        // 4. Получаем список оставшихся активных карточек с датами окончания
        const { data: activeUserCards } = await supabase
            .from('user_cards')
            .select('card_id, expires_at')
            .eq('user_id', user_id)
            .gt('expires_at', now);

        // Формируем объект с таймстампами для фронтенда
        const timers = {};
        if (activeUserCards) {
            activeUserCards.forEach(c => {
                timers[c.card_id] = new Date(c.expires_at).getTime(); // Передаем как Unix-миллисекунды
            });
        }

        return res.status(200).json({
            points: player.points,
            energy: player.energy,
            max_energy: player.max_energy,
            click_power: player.click_power,
            active_hero_id: player.active_hero_id,
            owned_heroes: player.owned_heroes,
            market_levels: player.market_levels,
            last_charge_unix: player.last_charge_unix,
            passive_income_per_hour: player.passive_income_per_hour,
            owned_db_cards: player.owned_db_cards || [],
            card_timers: timers // <--- Отправляем таймеры на фронтенд!
        });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
