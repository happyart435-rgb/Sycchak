import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { user_id, card_id } = req.body;

    if (!user_id || !card_id) {
        return res.status(400).json({ error: 'Missing user_id or card_id' });
    }

    try {
        // 1. Получаем информацию о карточке
        const { data: card, error: cardError } = await supabase
            .from('game_cards')
            .select('*')
            .eq('id', card_id)
            .single();

        if (cardError || !card) {
            return res.status(444).json({ error: 'Карточка не найдена' });
        }

        // 2. Получаем текущий баланс и профиль игрока (предполагаем, что таблица называется 'users')
        const { data: player, error: playerError } = await supabase
            .from('users') // Замените на ваше название таблицы игроков, если отличается
            .select('points, passive_income_per_hour, owned_db_cards')
            .eq('user_id', user_id)
            .single();

        if (playerError || !player) {
            return res.status(444).json({ error: 'Игрок не найден в базе данных' });
        }

        // Проверяем, не куплена ли уже эта карта
        const ownedDbCards = Array.isArray(player.owned_db_cards) ? player.owned_db_cards : [];
        if (ownedDbCards.includes(card_id)) {
            return res.status(400).json({ error: 'Вы уже приобрели эту карточку' });
        }

        // Проверяем, хватает ли монет
        if (parseInt(player.points) < parseInt(card.price)) {
            return res.status(400).json({ error: 'Недостаточно Nova Token для покупки' });
        }

        // 3. Высчитываем время окончания действия карточки
        const boughtAt = new Date();
        const expiresAt = new Date();
        expiresAt.setHours(boughtAt.getHours() + parseInt(card.duration_hours));

        // 4. Проводим транзакцию покупки
        // Записываем факт покупки лимитированной карты
        const { error: insertError } = await supabase
            .from('user_cards')
            .insert({
                user_id: user_id,
                card_id: card_id,
                bought_at: boughtAt.toISOString(),
                expires_at: expiresAt.toISOString(),
                points_per_hour_snapshot: card.points_per_hour
            });

        if (insertError) throw insertError;

        // Обновляем массив купленных карточек, баланс и общий пассивный доход в профиле пользователя
        const updatedOwnedCards = [...ownedDbCards, card_id];
        const newPoints = parseInt(player.points) - parseInt(card.price);
        const newPassiveIncome = parseInt(player.passive_income_per_hour || 0) + parseInt(card.points_per_hour);

        const { error: updatePlayerError } = await supabase
            .from('users')
            .update({
                points: newPoints,
                passive_income_per_hour: newPassiveIncome,
                owned_db_cards: updatedOwnedCards
            })
            .eq('user_id', user_id);

        if (updatePlayerError) throw updatePlayerError;

        // Возвращаем успешный ответ клиенту
        return res.status(200).json({ 
            success: true, 
            message: 'Карточка успешно активирована!',
            new_points: newPoints,
            new_passive_income: newPassiveIncome
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
