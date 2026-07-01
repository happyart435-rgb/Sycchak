import asyncio
import logging
import sys
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import InlineKeyboardButton, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder
from supabase import create_client

logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)

TOKEN = "8877027563:AAER5zuqzfpzHZESBvj_Qd44sUkSCQT4kjI"
BOT_USERNAME = "Dimkalox3330_bot"

SUPABASE_URL = "https://ypvvoqbvzfmirprevazq.supabase.co"
SUPABASE_SERVICE_KEY = "ssb_secret_FXNRKRiKlkZh-8lUBNnBqA_1wVhbRVd"
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

bot = Bot(token=TOKEN)
dp = Dispatcher()


async def handle_referral(new_user_id: int, username: str, ref_id):
    existing = supabase.table("users").select("user_id").eq("user_id", new_user_id).execute()
    if existing.data:
        return

    new_row = {"user_id": new_user_id, "username": username or ""}
    if ref_id and ref_id != new_user_id:
        new_row["referred_by"] = ref_id
    supabase.table("users").insert(new_row).execute()
    logger.info(f"Создан новый пользователь {new_user_id}, referred_by={ref_id}")

    if ref_id and ref_id != new_user_id:
        ref_row = supabase.table("users").select("referral_count, tickets").eq("user_id", ref_id).execute()
        if ref_row.data:
            current = ref_row.data[0]
            supabase.table("users").update({
                "referral_count": (current.get("referral_count") or 0) + 1,
                "tickets": (current.get("tickets") or 0) + 1,
            }).eq("user_id", ref_id).execute()
            try:
                await bot.send_message(ref_id, "🎉 По вашей ссылке присоединился новый друг!\nВам начислен 1 билет 🎫")
            except Exception as e:
                logger.warning(f"Не удалось уведомить реферера {ref_id}: {e}")


@dp.message(Command("start"))
async def start(message: types.Message):
    logger.info(f"Получена команда /start от пользователя {message.from_user.id}")

    parts = message.text.split(maxsplit=1)
    ref_id = None
    if len(parts) > 1 and parts[1].startswith("ref_"):
        payload = parts[1].replace("ref_", "").strip()
        if payload.isdigit():
            ref_id = int(payload)

    try:
        await handle_referral(message.from_user.id, message.from_user.username, ref_id)
    except Exception as e:
        logger.error(f"Ошибка реферальной логики: {e}")

    builder = InlineKeyboardBuilder()
    builder.add(InlineKeyboardButton(
        text="🎮 Играть",
        web_app=WebAppInfo(url="https://stars-droper-main.vercel.app/")
    ))
    builder.add(InlineKeyboardButton(text="📢 Канал", url="https://t.me/nowear_FREE"))
    builder.adjust(1)

    text = "👋 Привет! Нажми кнопку ниже, чтобы войти в игру:"
    await message.answer(text, reply_markup=builder.as_markup())
    logger.info("Ответ отправлен")


async def main():
    logger.info("Запуск бота...")
    try:
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Бот остановлен")
