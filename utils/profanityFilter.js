

import { Filter } from 'bad-words';


const englishFilter = new Filter();



const russianProfanityWords = [

  'блять', 'блядь', 'бля', 'бляд', 'ебан', 'ебать', 'ебал', 'ебану', 'ебань', 
  'заеб', 'уеб', 'ебло', 'ебну', 'ебу', 'ебут', 'ебат', 'ебаш', 'ебись',
  'хуй', 'хуя', 'хуе', 'хуи', 'хуё', 'хуев', 'хуйня', 'хуйло', 'похуй',
  'пизд', 'пизда', 'пиздец', 'пиздить', 'пиздюк', 'пиздюх', 'пиздюш',
  'сука', 'суки', 'сукин', 'сучар', 'сучий', 'сучка',
  'пидор', 'пидорас', 'пидарас', 'пидорок', 'пидр', 'педик', 'педофил',
  'гандон', 'гандончик', 'кондом',
  'мудак', 'мудила', 'мудло', 'мудачок',
  'долбоеб', 'долбоёб', 'долбаеб', 'долбаёб',
  'еблан', 'ебла', 'еблань',
  'залупа', 'залуп', 'залупиться',
  'шлюха', 'шлюх', 'шлюшка',
  'проститутка', 'проститутк',
  'гомик', 'гомосек',
  'педераст', 'педерастия',
  'дебил', 'дебилка', 'дебильный',
  'идиот', 'идиотка', 'идиотский',
  'кретин', 'кретинка',
  'тупой', 'тупая',
  'дурак', 'дура', 'дурацкий',
  'мразь', 'мразота',
  'гад', 'гадина', 'гадкий',
  'сволочь', 'сволочи',
  'ублюдок', 'ублюдки',
  'выродок', 'выродки',
  

  'блять', 'блядь', 'бля', 'бляд', 'єбан', 'єбать', 'єбал', 'єбану',
  'хуй', 'хуя', 'хуе', 'хуйня', 'хуйло',
  'пізд', 'пізда', 'піздець',
  'сука', 'суки', 'сучар',
  'підор', 'підорас', 'підарас',
  'гандон', 'кондом',
  'мудак', 'мудила',
  'долбоєб', 'долбаєб',
  'єблан', 'єбла',
  'залупа', 'залуп',
  'шльоха', 'шльох',
  'проститутка',
  'гомік', 'гомосек',
  'педераст',
  'дебіл', 'дебілка',
  'ідіот', 'ідіотка',
  'кретин', 'кретинка',
  'тупий', 'тупа',
  'дурак', 'дура',
  'мразь', 'мразота',
  'гад', 'гадина',
  'сволочь', 'сволочі',
  'ублюдок', 'ублюдки',
  'виродок', 'виродки',
  

  'blyat', 'blyad', 'blya', 'blat', 'bljad',
  'suka', 'cyka', 'sucka', 'sukka',
  'pidor', 'pidar', 'pidaras', 'pidoras', 'pedar', 'pedarast',
  'gandon', 'condom',
  'ebat', 'ebal', 'eban', 'eblan', 'eblo',
  'hui', 'huy', 'huev', 'huevo',
  'pizd', 'pizda', 'pizdec', 'pizdet',
  'mudak', 'mudila', 'mudlo',
  'dolboeb', 'dolboёb', 'dolbaeb',
  'zalupa', 'zalup',
  'shluha', 'shluh', 'shlukha',
  'prostitutka',
  'gomik', 'gomosek',
  'pederast',
  'debil', 'debilka',
  'idiot', 'idiotka',
  'kretin', 'kretinka',
  'tupoy', 'tupaya',
  'durak', 'dura',
  'mraz', 'mrazota',
  'gad', 'gadina',
  'svоloch', 'svоlochi',
  'ublyudok', 'ublyudki',
  'vyrodok', 'vyrodki',
  

  'puta', 'putas', 'puto', 'putos', // испанский
  'merde', 'merdes', // французский
  'scheisse', 'scheiße', 'arsch', 'arschloch', // немецкий
  'cazzo', 'cazzi', 'merda', // итальянский
  'kurwa', 'chuj', // польский
  'caralho', 'foda', 'merda', // португальский
];


const charReplacements = {

  'а': ['a', '@'],
  'б': ['b', '6'],
  'в': ['v', 'b'],
  'г': ['g'],
  'д': ['d'],
  'е': ['e', 'ё', '3'],
  'ё': ['e', 'е', '3'],
  'ж': ['zh', 'z'],
  'з': ['z', '3'],
  'и': ['i', 'й', '1'],
  'й': ['i', 'и', 'y', 'j', '1'],
  'к': ['k', 'c'],
  'л': ['l', '1'],
  'м': ['m'],
  'н': ['n', 'h'],
  'о': ['o', '0'],
  'п': ['p', 'n'],
  'р': ['r', 'p'],
  'с': ['s', 'c', '5'],
  'т': ['t', '7'],
  'у': ['u', 'y'],
  'ф': ['f'],
  'х': ['x', 'h', 'kh'],
  'ц': ['c', 'ts', 'tc'],
  'ч': ['ch', '4'],
  'ш': ['sh', 'sch'],
  'щ': ['sch', 'shch'],
  'ъ': [''],
  'ы': ['y', 'i'],
  'ь': [''],
  'э': ['e', 'э'],
  'ю': ['yu', 'ju', 'u'],
  'я': ['ya', 'ja', 'a'],
  

  'a': ['а', '@', '4'],
  'b': ['б', 'в', '6'],
  'c': ['с', 'к', 'ц'],
  'd': ['д'],
  'e': ['е', 'ё', '3'],
  'f': ['ф'],
  'g': ['г'],
  'h': ['н', 'х'],
  'i': ['и', 'й', '1'],
  'j': ['й', 'ж'],
  'k': ['к', 'c'],
  'l': ['л', '1'],
  'm': ['м'],
  'n': ['н', 'п'],
  'o': ['о', '0'],
  'p': ['п', 'р'],
  'q': ['к'],
  'r': ['р', 'p'],
  's': ['с', '5'],
  't': ['т', '7'],
  'u': ['у', 'ю'],
  'v': ['в', 'b'],
  'w': ['в'],
  'x': ['х', 'кс'],
  'y': ['у', 'ы', 'й'],
  'z': ['з', 'ж', '3'],
  '0': ['о', 'o'],
  '1': ['и', 'й', 'i', 'l'],
  '3': ['з', 'е', 'z', 'e'],
  '4': ['ч', 'a'],
  '5': ['с', 's'],
  '6': ['б', 'b'],
  '7': ['т', 't'],
  '@': ['а', 'a'],
};


function normalizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  let normalized = text.toLowerCase();
  

  normalized = normalized.replace(/[^\wа-яё]/gi, '');
  

  normalized = normalized.replace(/ё/g, 'е');
  

  for (const [original, replacements] of Object.entries(charReplacements)) {
    for (const replacement of replacements) {
      normalized = normalized.replace(new RegExp(replacement, 'gi'), original);
    }
  }
  
  return normalized;
}


export function containsProfanity(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const lowerText = text.toLowerCase();
  

  if (englishFilter.isProfane(text)) {
    return true;
  }


  for (const word of russianProfanityWords) {
    const lowerWord = word.toLowerCase();
    

    if (lowerText.includes(lowerWord) && lowerWord.length >= 3) {
      return true;
    }
  }
  

  const normalized = normalizeText(text);
  for (const word of russianProfanityWords) {
    const normalizedWord = normalizeText(word);
    
    if (normalized.includes(normalizedWord) && normalizedWord.length >= 3) {
      return true;
    }
  }
  

  const words = lowerText.split(/[\s\-_\.]+/).filter(w => w.length >= 3);
  for (const textWord of words) {
    for (const profanityWord of russianProfanityWords) {
      const lowerProfanity = profanityWord.toLowerCase();

      if (lowerProfanity.length >= 3 && textWord.includes(lowerProfanity)) {
        return true;
      }
    }
  }

  return false;
}


export function getProfanityErrorMessage() {
  return 'Название команды содержит недопустимые слова. Пожалуйста, выберите другое название.';
}
