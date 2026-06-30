export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { userId, gameId } = req.body; // ID второго игрока и ID комнаты

  try {
    // 1. Ищем комнату
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) throw new Error('Игра не найдена');
    if (game.status !== 'waiting') throw new Error('В этой игре уже есть соперник или она завершена');
    if (game.player_1 === userId) throw new Error('Нельзя играть против самого себя');

    // 2. Проверяем и списываем баланс у Второго игрока
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('Stars, balance')
      .eq('user_id', userId)
      .single();

    if (userError || !user) throw new Error('Пользователь не найден');

    const balanceField = game.bet_type === 'stars' ? 'Stars' : 'balance';
    const currentBalance = user[balanceField];

    if (currentBalance < game.bet_amount) throw new Error('Недостаточно средств для принятия ставки');

    // Списываем
    await supabase.from('users').update({ [balanceField]: currentBalance - game.bet_amount }).eq('user_id', userId);

    // 3. Обновляем статус игры
    await supabase
      .from('games')
      .update({ player_2: userId, status: 'playing' })
      .eq('id', gameId);

    // 4. Создаем запись в game_state, чтобы запустить блейды на арене
    await supabase
      .from('game_state')
      .insert([{ 
        game_id: gameId, 
        p1_x: 100, p1_y: 200, p1_hp: 100, // координаты первого круга
        p2_x: 300, p2_y: 200, p2_hp: 100  // координаты второго круга
      }]);

    return res.status(200).json({ success: true, message: 'Вы успешно вошли в игру!' });

  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}
