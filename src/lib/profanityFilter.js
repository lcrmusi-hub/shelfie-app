// lib/profanityFilter.js
// -------------------------------------------------------------
// Basic word-list profanity filter for buddy read messages.
// This is a lightweight first line of defense, not a moderation
// system — pair it with the Report button + host "remove member"
// power already in the schema for anything a word-list can't catch.
//
// Fill BANNED_WORDS with your own list; kept empty/generic here
// since I won't generate a slur/profanity list myself. Plenty of
// open-source word lists exist (search "banned words list json")
// that you can drop in directly.
// -------------------------------------------------------------

const BANNED_WORDS = [
  // e.g. "badword1", "badword2", ...
];

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // strip punctuation used to dodge filters (e.g. "b@dword")
    .replace(/(.)\1{2,}/g, "$1$1"); // collapse repeated letters ("sooooo" -> "soo")
}

export function containsProfanity(message) {
  if (!message || BANNED_WORDS.length === 0) return false;
  const words = normalize(message).split(/\s+/);
  return words.some((w) => BANNED_WORDS.includes(w));
}

/** Replace banned words with asterisks instead of blocking the message outright. */
export function cleanMessage(message) {
  if (!message || BANNED_WORDS.length === 0) return message;
  return message
    .split(/\s+/)
    .map((word) => (BANNED_WORDS.includes(normalize(word)) ? "*".repeat(word.length) : word))
    .join(" ");
}
