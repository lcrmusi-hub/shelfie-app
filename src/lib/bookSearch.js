// lib/bookSearch.js
import { supabase } from "./supabase";

const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;

export async function searchBooks(query) {
  if (!query || query.trim().length < 2) return [];

  const { data: cached } = await supabase
    .from("books")
    .select("*")
    .ilike("title", `%${query}%`)
    .limit(10);

  if (cached && cached.length > 0) return cached;

  try {
    const raw = await searchGoogleBooks(query);
    if (raw.length > 0) {
      const cachedRows = await cacheBooks(raw);
      return cachedRows.length ? cachedRows : raw;
    }
  } catch (e) {
    console.warn("Google Books search failed, trying Open Library:", e);
  }

  try {
    const raw = await searchOpenLibrary(query);
    const cachedRows = await cacheBooks(raw);
    return cachedRows.length ? cachedRows : raw;
  } catch (e) {
    console.warn("Open Library search also failed:", e);
    return [];
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

async function cacheBooks(books) {
  const rows = [];
  for (const book of books) {
    const { data, error } = await supabase
      .from("books")
      .upsert(book, { onConflict: "google_books_id" })
      .select()
      .single();
    if (!error && data) rows.push(data);
  }
  return rows;
}

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

export async function addToShelf(userId, bookId, shelf = "want_to_read") {
  const { data, error } = await supabase
    .from("user_books")
    .upsert({ user_id: userId, book_id: bookId, shelf }, { onConflict: "user_id,book_id" })
    .select("*, books(*)")
    .single();
  if (error) throw error;
  return data;
}

export async function getShelf(userId) {
  const { data, error } = await supabase
    .from("user_books")
    .select("*, books(*)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateShelfEntry(userBookId, patch) {
  const { data, error } = await supabase
    .from("user_books")
    .update(patch)
    .eq("id", userBookId)
    .select("*, books(*)")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fills in missing page_count / description / genre for a book by looking
 * it up on Google Books (used when the original source, e.g. Open Library,
 * didn't have that data). Persists the result to the shared books cache.
 */
export async function enrichBookDetails(bookId, title, author) {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title + " " + (author || ""))}&maxResults=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const info = json.items?.[0]?.volumeInfo;
    if (!info) return null;

    const patch = {};
    if (info.pageCount) patch.page_count = info.pageCount;
    if (info.description) patch.description = info.description;
    if (info.categories?.[0]) patch.genre = info.categories[0];
    if (Object.keys(patch).length === 0) return null;

    const { data, error } = await supabase
      .from("books")
      .update(patch)
      .eq("id", bookId)
      .select()
      .single();
    if (error) return null;
    return data;
  } catch (e) {
    console.warn("Enrichment failed:", e);
    return null;
  }
}
