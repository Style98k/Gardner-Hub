/**
 * Bad Words Filter Utility
 * Filters and censors bad words in English and Tagalog
 * Uses word boundaries and whitelist to avoid false positives on academic terms
 */

// Whitelist of academic terms that should NEVER be censored
const whiteList = [
  'BSIT', 'BSCS', 'BSBA', 'BSCpE', 'BSREM', 
  'assessment', 'assignment', 'class', 'pass',
  'bass', 'brass', 'grass', 'mass', 'associate', 'assist', 'assistant',
  'classic', 'classify', 'password', 'bypass', 'compass', 'trespass'
];

// Comprehensive list of bad words (English and Tagalog)
// NOTE: 'bs' removed to avoid false positives with Bachelor of Science degrees
const badWordsList = [
  // English bad words
  'fuck', 'shit', 'asshole', 'bitch', 'bastard', 'damn', 'crap',
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
    'wtf', 'wth', 'lmao', 'lmfao',
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
 * Uses word boundaries to avoid matching substrings within larger words
 * @param {string} word - The bad word to create pattern for
 * @param {boolean} useWordBoundary - Whether to enforce word boundaries (default: true)
 * @returns {RegExp} - Regex pattern that catches variations of the word
 */
const createFlexiblePattern = (word, useWordBoundary = true) => {
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
  
  // Use word boundaries to prevent matching substrings (e.g., 'ass' in 'assessment')
  const boundedPattern = useWordBoundary ? `\\b${fullPattern}\\b` : fullPattern;
  
  // Case insensitive matching
  return new RegExp(boundedPattern, 'gi');
};

/**
 * Checks if a word is in the whitelist (case-insensitive)
 * @param {string} word - The word to check
 * @returns {boolean} - True if word is whitelisted
 */
const isWhitelisted = (word) => {
  return whiteList.some(w => w.toLowerCase() === word.toLowerCase());
};

/**
 * Extracts words from text for whitelist checking
 * @param {string} text - The text to extract words from
 * @returns {string[]} - Array of words
 */
const extractWords = (text) => {
  return text.match(/\b[a-zA-Z]+\b/g) || [];
};

/**
 * Cleans text by replacing bad words with asterisks
 * Respects whitelist and uses word boundaries for smart filtering
 * @param {string} inputString - The text to clean
 * @returns {string} - Cleaned text with bad words replaced by asterisks
 */
const cleanText = (inputString) => {
  if (!inputString || typeof inputString !== 'string') {
    return inputString;
  }
  
  let cleanedText = inputString;
  
  // Extract all words from the text
  const wordsInText = extractWords(inputString);
  
  // Create a set of whitelisted words found in the input (case-insensitive match)
  const whitelistedWordsInText = new Set();
  for (const word of wordsInText) {
    if (isWhitelisted(word)) {
      whitelistedWordsInText.add(word);
    }
  }
  
  // Temporarily replace whitelisted words with placeholders
  const placeholders = new Map();
  let placeholderIndex = 0;
  for (const word of whitelistedWordsInText) {
    const placeholder = `__WHITELIST_${placeholderIndex}__`;
    const whitelistPattern = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
    cleanedText = cleanedText.replace(whitelistPattern, placeholder);
    placeholders.set(placeholder, word);
    placeholderIndex++;
  }
  
  // Process each bad word with word boundaries
  for (const word of badWordsList) {
    const pattern = createFlexiblePattern(word, true);
    
    // Replace matches with asterisks of the same length as the match
    cleanedText = cleanedText.replace(pattern, (match) => {
      return '*'.repeat(match.length);
    });
  }
  
  // Restore whitelisted words from placeholders
  for (const [placeholder, originalWord] of placeholders) {
    cleanedText = cleanedText.split(placeholder).join(originalWord);
  }
  
  return cleanedText;
};

/**
 * Checks if text contains any bad words (respects whitelist)
 * @param {string} inputString - The text to check
 * @returns {boolean} - True if bad word is found, false otherwise
 */
const containsBadWords = (inputString) => {
  if (!inputString || typeof inputString !== 'string') {
    return false;
  }
  
  // Extract words and check for whitelisted terms
  const wordsInText = extractWords(inputString);
  let testText = inputString;
  
  // Remove whitelisted words from consideration
  for (const word of wordsInText) {
    if (isWhitelisted(word)) {
      const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
      testText = testText.replace(pattern, ' ');
    }
  }
  
  for (const word of badWordsList) {
    const pattern = createFlexiblePattern(word, true);
    if (pattern.test(testText)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Gets list of detected bad words in text (respects whitelist)
 * @param {string} inputString - The text to analyze
 * @returns {string[]} - Array of detected bad words/phrases
 */
const getDetectedBadWords = (inputString) => {
  if (!inputString || typeof inputString !== 'string') {
    return [];
  }
  
  // Extract words and check for whitelisted terms
  const wordsInText = extractWords(inputString);
  let testText = inputString;
  
  // Remove whitelisted words from consideration
  for (const word of wordsInText) {
    if (isWhitelisted(word)) {
      const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
      testText = testText.replace(pattern, ' ');
    }
  }
  
  const detected = [];
  
  for (const word of badWordsList) {
    const pattern = createFlexiblePattern(word, true);
    const matches = testText.match(pattern);
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
  badWordsList,
  whiteList
};
