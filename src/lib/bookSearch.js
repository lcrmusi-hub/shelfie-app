// lib/bookSearch.js
// -------------------------------------------------------------
// Search flow: Supabase cache -> Google Books API -> Open Library -> manual entry
// Google Books free tier: 1000 requests/day, no key strictly required for
// search (but get one anyway to raise your quota):
// https://console.cloud.google.com/apis/library/books.googleapis.com
// -------------------------------------------------------------
import { supabase } from "./supabase";

const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY; // optional but recommended

/**
 * Search for books. Checks the local Supabase cache first (fast, free),
 * then Google Books, then falls back to Open Library if Google returns nothing.
 * Every result that comes back from an external API gets cached in `books`
 * so the next person who searches the same title doesn't cost an API call.
 */
export async function searchBooks(query) {
  if (!query || query.trim().length < 2) return [];

  // 1. Check cache first
  const { data: cached, error: cacheError } = await supabase
    .from("books")
    .select("*")
    .textSearch("title", query, { type: "websearch" })
    .limit(10);

  if (!cacheError && cached && cached.length > 0) {
    return cached;
  }

  // 2. Try Google Books
  try {
    const results = await searchGoogleBooks(query);
    if (results.length > 0) {
      await cacheBooks(results);
      return results;
    }
  } catch (e) {
    console.warn("Google Books search failed, trying Open Library:", e);
  }

  // 3. Fall back to Open Library
  try {
    const results = await searchOpenLibrary(query);
    await cacheBooks(results);
    return results;
  } catch (e) {
    console.warn("Open Library search also failed:", e);
    return []; // caller should show the "Add Manually" form
  }
}

async function searchGoogleBooks(query) {
  const key = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : "";
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Books API error: ${res.status}`);
  const json = await res.json();

  return (json.items || [])
    .filter((item) => item.volumeInfo?.title)
    .map((item) => ({
      google_books_id: item.id,
      title: item.volumeInfo.title,
      author: (item.volumeInfo.authors || []).join(", ") || "Unknown",
      cover_url: item.volumeInfo.imageLinks?.thumbnail?.replace("http://", "https://") || null,
      page_count: item.volumeInfo.pageCount || null,
      isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier || null,
      genre: item.volumeInfo.categories?.[0] || null,
      description: item.volumeInfo.description || null,
      source: "google_books",
    }));
}

async function searchOpenLibrary(query) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Library API error: ${res.status}`);
  const json = await res.json();

  return (json.docs || []).map((doc) => ({
    google_books_id: null,
    title: doc.title,
    author: (doc.author_name || []).join(", ") || "Unknown",
    cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
    page_count: doc.number_of_pages_median || null,
    isbn: doc.isbn?.[0] || null,
    genre: doc.subject?.[0] || null,
    description: null,
    source: "open_library",
  }));
}

/** Upsert search results into the shared `books` cache table. */
async function cacheBooks(books) {
  if (books.length === 0) return;
  const { error } = await supabase
    .from("books")
    .upsert(books, { onConflict: "google_books_id", ignoreDuplicates: true });
  if (error) console.warn("Failed to cache books:", error);
}

/** Add a book the user typed in by hand (no API match found). */
export async function addManualBook({ title, author, pageCount, coverFile }) {
  let cover_url = null;

  if (coverFile) {
    const path = `manual-covers/${crypto.randomUUID()}-${coverFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("book-covers")
      .upload(path, coverFile, { upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("book-covers").getPublicUrl(path);
    cover_url = data.publicUrl;
  }

  const { data, error } = await supabase
    .from("books")
    .insert({ title, author, page_count: pageCount, cover_url, source: "manual" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Add a searched/cached book to the current user's shelf. */
export async function addToShelf(userId, bookId, shelf = "want_to_read") {
  const { data, error } = await supabase
    .from("user_books")
    .insert({ user_id: userId, book_id: bookId, shelf })
    .select()
    .single();
  if (error) throw error;
  return data;
}
