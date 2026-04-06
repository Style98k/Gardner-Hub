/**
 * Bad Words Filter Utility
 * Filters and censors bad words in English and Tagalog
 */

// Comprehensive list of bad words (English and Tagalog)
const badWordsList = [
  // English bad words
  'fuck', 'shit', 'ass', 'asshole', 'bitch', 'bastard', 'damn', 'crap',
  'dick', 'cock', 'pussy', 'cunt', 'whore', 'slut', 'fag', 'faggot',
  'nigger', 'nigga', 'retard', 'motherfucker', 'fucker', 'bullshit',
  'piss', 'douche', 'douchebag', 'jackass', 'dipshit', 'shithead',
  
  // Tagalog bad words and slurs
  'puta', 'putangina', 'pota', 'potangina', 'tangina', 'taena', 'tena',
  'gago', 'gaga', 'gagu',
  'tanga', 'tange', 'tangna',
  'bobo', 'boba', 'bubu', 'obob',
  'hayop', 'hayup', 'ayop',
  'ulol', 'olol', 'ulul',
  'inutil', 'imbisil',
  'tarantado', 'tarantada',
  'punyeta', 'ponyeta', 'punieta',
  'leche', 'letse', 'lintik',
  'hinayupak', 'hayupak',
  'pakyu', 'pakshet', 'paksheet',
  'kupal', 'kingina', 'kengkoy',
  'peste', 'sira', 'siraulo',
  'gunggong', 'ogag', 'engot',
  'ungas', 'unggas',
  'hudas', 'demonyo',
  'bwisit', 'bwiset',
  'yawa', 'yudiputa',
  'animal', 'bruha', 'bruhang',
  'puke', 'pokpok', 'malandi',
  'kantot', 'kantut', 'jakol', 'jabol',
  'titi', 'tite', 'pepe', 'etits', 'betlog', 'ogag', 'atup', 'ampot', 'amputa', 'enaet', 'anignat',
    'monggoloid', 'mongoloid', 'abnoy', 'timang', 'tungaw', 'ugok',
    'kys', 'stfu', 'gtfo',
    'iyot', 'hindot', 'burat', 'bayag', 'tamod', 'manyak', 'manyakis', 'kepyas', 'bilat', 'utin', 'pucha', 'puchangina', 'potek', 'paktay',
    'shunga', 'syonga', 'bugok', 'tungak', 'buang', 
    'wtf', 'wth', 'lmao', 'lmfao', 'bs',
    'porn', 'porno', 'cum', 'jizz', 'horny', 'libog', 'uhaw',
    'bayot', 'bading', 'bakla', 'silahis'
];

/**
 * Escapes special regex characters in a string
 * @param {string} str - The string to escape
 * @returns {string} - Escaped string safe for regex
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Creates a regex pattern that matches a word even with symbols/dots between letters
 * @param {string} word - The bad word to create pattern for
 * @returns {RegExp} - Regex pattern that catches variations of the word
 */
const createFlexiblePattern = (word) => {
  const chars = word.split('');
  
  // Build pattern with common letter substitutions (leetspeak)
  const charPatterns = chars.map((char) => {
    const substitutions = {
      'a': '[a@4]',
      'e': '[e3]',
      'i': '[i1!|]',
      'o': '[o0]',
      's': '[s$5]',
      'g': '[g9]',
      't': '[t7+]',
      'u': '[uv]'
    };
    
    const charPattern = substitutions[char.toLowerCase()] || escapeRegex(char);
    return charPattern;
  });
  
  // Join with optional separators (dots, spaces, symbols, etc.) between each character
  const separatorPattern = '[.\\-_*@#$%^&()\\s]*';
  const fullPattern = charPatterns.join(separatorPattern);
  
  // Case insensitive matching
  return new RegExp(fullPattern, 'gi');
};

/**
 * Cleans text by replacing bad words with asterisks
 * @param {string} inputString - The text to clean
 * @returns {string} - Cleaned text with bad words replaced by asterisks
 */
const cleanText = (inputString) => {
  if (!inputString || typeof inputString !== 'string') {
    return inputString;
  }
  
  let cleanedText = inputString;
  
  // Process each bad word
  for (const word of badWordsList) {
    const pattern = createFlexiblePattern(word);
    
    // Replace matches with asterisks of the same length as the match
    cleanedText = cleanedText.replace(pattern, (match) => {
      return '*'.repeat(match.length);
    });
  }
  
  return cleanedText;
};

/**
 * Checks if text contains any bad words
 * @param {string} inputString - The text to check
 * @returns {boolean} - True if bad word is found, false otherwise
 */
const containsBadWords = (inputString) => {
  if (!inputString || typeof inputString !== 'string') {
    return false;
  }
  
  for (const word of badWordsList) {
    const pattern = createFlexiblePattern(word);
    if (pattern.test(inputString)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Gets list of detected bad words in text
 * @param {string} inputString - The text to analyze
 * @returns {string[]} - Array of detected bad words/phrases
 */
const getDetectedBadWords = (inputString) => {
  if (!inputString || typeof inputString !== 'string') {
    return [];
  }
  
  const detected = [];
  
  for (const word of badWordsList) {
    const pattern = createFlexiblePattern(word);
    const matches = inputString.match(pattern);
    if (matches) {
      detected.push(...matches);
    }
  }
  
  return [...new Set(detected)]; // Remove duplicates
};

module.exports = {
  cleanText,
  containsBadWords,
  getDetectedBadWords,
  badWordsList
};
