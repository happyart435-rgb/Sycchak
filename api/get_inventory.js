import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // 1. Исправляем CORS заголовки для метода GET
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    // Если браузер или телеграм делает предварительный запрос OPTIONS, сразу отвечаем 200
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'No user_id provided' });

    try {
        // 2. ОШИБКА ТИПА ДАННЫХ (Главный подозреваемый)
        // Telegram передает ID как число. Если в Supabase колонка user_id имеет тип bigint или numeric, 
        // то поиск по строке eq('user_id', "12345") может вернуть ошибку.
        // Пробуем искать и по числу, и по строке, если упадет.
        const parsedUserId = isNaN(user_id) ? user_id : Number(user_id);

        const { data, error } = await supabase
            .from('users')
            .select('inventory')
            .eq('user_id', parsedUserId)
            .single();

        // Если произошла ошибка БД, давай её НЕ глушить, а возвращать, чтобы увидеть в консоли
        if (error) {
            return res.status(500).json({ 
                success: false, 
                error: 'Supabase error', 
                details: error.message,
                hint: error.hint 
            });
        }

        if (!data) {
            return res.status(404).json({ success: false, error: 'User not found in database' });
        }

        // 3. ПРОВЕРКА ФОРМАТА МАССИВА
        // Если в поле inventory лежит строка (например, из-за неправильного импорта в БД),
        // превращаем её в массив, чтобы фронтенд не сошел с ума.
        let inventoryData = data.inventory;
        if (typeof inventoryData === 'string') {
            try {
                inventoryData = JSON.parse(inventoryData);
            } catch (e) {
                inventoryData = [inventoryData];
            }
        }

        return res.status(200).json({ 
            success: true, 
            inventory: Array.isArray(inventoryData) ? inventoryData : [] 
        });

    } catch (e) {
        return res.status(500).json({ error: 'Server error', message: e.message });
    }
}
