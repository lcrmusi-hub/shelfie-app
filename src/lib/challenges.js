// lib/challenges.js
import { supabase } from "./supabase";

const GENRE_KEYWORDS = ["fantasy", "romance", "horror", "mystery", "sci-fi", "science fiction", "thriller", "historical"];

/** Fetch the list of available challenges (seeded in the database). */
export async function getChallenges() {
  const { data, error } = await supabase.from("challenges").select("*").order("created_at");
  if (error) throw error;
  return data;
}

/**
 * Figures out how close the user is to completing a challenge, based on
 * their finished books. Parses simple rules out of the challenge title
 * since our seeded challenges don't have a structured "criteria" field:
 *   - "Under N Pages"      -> count finished books shorter than N pages
 *   - contains a genre word -> count finished books in that genre
 *   - otherwise             -> count total finished books (a plain reading goal)
 */
export function computeChallengeProgress(challenge, finishedBooks) {
  const title = (challenge.title || "").toLowerCase();

  const pagesMatch = title.match(/under (\d+) pages/);
  if (pagesMatch) {
    const maxPages = parseInt(pagesMatch[1], 10);
    return finishedBooks.filter((b) => b.pages && b.pages < maxPages).length;
  }

  const genreHit = GENRE_KEYWORDS.find((g) => title.includes(g));
  if (genreHit) {
    return finishedBooks.filter((b) => (b.genre || "").toLowerCase().includes(genreHit)).length;
  }

  return finishedBooks.length;
}
