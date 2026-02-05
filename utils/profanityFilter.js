/**
 * Фильтр бранных слов для проверки названий команд
 * Поддерживает проверку на русском, английском и других языках
 */

// Список бранных слов (можно расширить)
const profanityWords = [
  // Русские
  'блять', 'блядь', 'ебан', 'ебать', 'хуй', 'хуя', 'пизд', 'сука', 'бля',
  'ебал', 'ебану', 'ебань', 'заеб', 'уеб', 'ебан', 'ебло', 'ебну',
  // Английские
  'fuck', 'shit', 'damn', 'bitch', 'asshole', 'cunt', 'piss', 'cock', 'dick',
  'pussy', 'whore', 'slut', 'bastard', 'motherfucker', 'faggot', 'nigger',
  // Общие (транслитерация)
  'blyat', 'suka', 'cyka', 'pidar', 'gandon',
];

// Функция для нормализации текста (удаление спецсимволов, приведение к нижнему регистру)
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\wа-яё]/gi, '') // Удаляем все кроме букв и цифр
    .replace(/ё/g, 'е')
    .replace(/й/g, 'и');
}

// Функция для проверки на бранные слова
export function containsProfanity(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const normalized = normalizeText(text);
  
  // Проверяем каждое бранное слово
  for (const word of profanityWords) {
    const normalizedWord = normalizeText(word);
    
    // Проверяем точное совпадение или вхождение как подстроки
    if (normalized.includes(normalizedWord)) {
      return true;
    }
  }

  return false;
}

// Функция для получения сообщения об ошибке
export function getProfanityErrorMessage() {
  return 'Название команды содержит недопустимые слова. Пожалуйста, выберите другое название.';
}
