// lib/badges.js
import { supabase } from "./supabase";

/**
 * Computes which badges the user has actually earned, based on their
 * finished books, reading sessions, and current streak.
 * Returns an object keyed by badge name -> boolean earned.
 */
export async function getBadgeStatus(userId, books, streak) {
  const finished = books.filter((b) => b.shelf === "read");
  const finishedCount = finished.length;
  const distinctGenres = new Set(finished.map((b) => b.genre).filter(Boolean)).size;

  const { data: sessions } = await supabase
    .from("reading_sessions")
    .select("date, pages_read, created_at")
    .eq("user_id", userId);

  const rows = sessions || [];
  const now = new Date();
  const daysAgo = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const pages7 = rows
    .filter((r) => r.date >= daysAgo(7))
    .reduce((sum, r) => sum + (r.pages_read || 0), 0);

  const pages30 = rows
    .filter((r) => r.date >= daysAgo(30))
    .reduce((sum, r) => sum + (r.pages_read || 0), 0);

  const nightOwl = rows.some((r) => {
    const hour = new Date(r.created_at).getHours();
    return hour >= 0 && hour < 5;
  });

  return {
    "First Book": finishedCount >= 1,
    "Speed Reader": pages7 >= 500,
    "Genre Explorer": distinctGenres >= 5,
    "Night Owl": nightOwl,
    "Marathon Reader": pages30 >= 1000,
    "Streak Master": streak >= 30,
    "Social Reader": false, // requires buddy reads backend, not wired yet
  };
}
