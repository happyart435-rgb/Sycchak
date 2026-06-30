import { createClient } from '@supabase/supabase-js';

// Инициализируем Supabase с SERVICE_ROLE_KEY (серверный ключ, у которого есть полный доступ)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { userId, betType, betAmount } = req.body;

  if (!userId || !betType || !betAmount || betAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Неверные параметры' });
  }

  try {
    // 1. Получаем баланс игрока напрямую из базы
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('Stars, balance')
      .eq('user_id', userId)
      .single();

    if (userError || !user) throw new Error('Пользователь не найден');

    const currentBalance = betType === 'stars' ? user.Stars : user.balance;
    if (currentBalance < betAmount) throw new Error('Недостаточно баланса');

    // 2. Списываем ставку
    const balanceField = betType === 'stars' ? 'Stars' : 'balance';
    const { error: updateError } = await supabase
      .from('users')
      .update({ [balanceField]: currentBalance - betAmount })
      .eq('user_id', userId);

    if (updateError) throw new Error('Ошибка списания средств');

    // 3. Создаем игровую комнату
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert([{ player_1: userId, bet_type: betType, bet_amount: betAmount, status: 'waiting' }])
      .select()
      .single();

    if (gameError) {
      // Возвращаем деньги, если комната не создалась
      await supabase.from('users').update({ [balanceField]: currentBalance }).eq('user_id', userId);
      throw new Error('Не удалось создать комнату');
    }

    return res.status(200).json({ success: true, gameId: game.id });

  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}
