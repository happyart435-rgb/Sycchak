import { supabase } from '@/services/supabase'; // твой файл инициализации
import { useTelegram } from '@/services/telegram';

const { user } = useTelegram();
const MY_ID = user?.id || 12345; // ID для теста

export async function getOrCreatePlayer() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', MY_ID)
    .single();

  if (data) return data;

  const { data: newPlayer } = await supabase
    .from('players')
    .insert([{ user_id: MY_ID, points: 0, energy: 1000, active_hero_id: 0 }])
    .select()
    .single();
  
  return newPlayer;
}
