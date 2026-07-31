import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search, Flame, BookOpen, BarChart3, Trophy, User, Moon, Sun,
  Plus, Star, ChevronLeft, Users, Share2, LogOut, Mail, Lock
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip
} from "recharts";
import { supabase } from "./lib/supabase";
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signOut } from "./lib/auth";
import { searchBooks, addToShelf, getShelf, updateShelfEntry, enrichBookDetails } from "./lib/bookSearch";
import { logReadingSession, getStreak } from "./lib/streak";
import { getBadgeStatus } from "./lib/badges";
import { getChallenges, computeChallengeProgress } from "./lib/challenges";
import { createBuddyRead, getActiveBuddyReads, getBuddyReadDetail, requestToJoin, respondToRequest, getMessages, sendMessage, subscribeToMessages } from "./lib/buddyReadChat";

/* ---------------------------------------------------------------
   COZY LIBRARY — design tokens (from brief, followed exactly)
--------------------------------------------------------------- */
const T = {
  primary: "#8B5E3C", primaryLight: "#A67B5B", secondary: "#D4A574",
  accent: "#C75B39", accentLight: "#E07A5F", bg: "#F5F0E8", bgDark: "#2C2416",
  surface: "#FFFFFF", surfaceDark: "#3D3229", textPrimary: "#3D2914",
  textSecondary: "#6B5B4F", textLight: "#E8DCC8", success: "#6A994E",
  warning: "#E9C46A", error: "#E07A5F",
};

const COVER_PALETTES = [
  ["#8B5E3C", "#C75B39"], ["#A67B5B", "#6A994E"], ["#C75B39", "#E9C46A"],
  ["#6B5B4F", "#D4A574"], ["#8B5E3C", "#E07A5F"], ["#3D2914", "#A67B5B"],
];

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) | 0;
  return Math.abs(h);
}

const BUDDY_READS = [
  { id: 1, book: "Babel", host: "corvid_reads", spots: "2/5", pace: "1 ch/day" },
  { id: 2, book: "Fourth Wing", host: "dragonrider22", spots: "4/5", pace: "3 ch/week" },
  { id: 3, book: "Piranesi", host: "quiet.pages", spots: "1/3", pace: "flexible" },
];

const CHALLENGES = [
  { id: 1, title: "Read 12 Books in 2026", progress: 0, target: 12, badge: "🏆" },
  { id: 2, title: "Fantasy February", progress: 0, target: 3, badge: "🐉" },
  { id: 3, title: "A Book Under 200 Pages", progress: 0, target: 1, badge: "📖" },
];

const BADGES = [
  { id: 1, name: "First Book", icon: "🌱", earned: false },
  { id: 2, name: "Genre Explorer", icon: "🧭", earned: false },
  { id: 3, name: "Night Owl", icon: "🦉", earned: false },
  { id: 4, name: "Speed Reader", icon: "⚡", earned: false },
  { id: 5, name: "Marathon Reader", icon: "🏃", earned: false },
  { id: 6, name: "Streak Master", icon: "🔥", earned: false },
  { id: 7, name: "Social Reader", icon: "🤝", earned: false },
];

const MONTHLY = [
  { m: "Feb", pages: 0 }, { m: "Mar", pages: 0 }, { m: "Apr", pages: 0 },
  { m: "May", pages: 0 }, { m: "Jun", pages: 0 }, { m: "Jul", pages: 0 },
];

/* ---------------------------------------------------------------
   SHARED PIECES
--------------------------------------------------------------- */
function Cover({ id, title, coverUrl, size = "md" }) {
  const [imgFailed, setImgFailed] = useState(false);
  const idx = hashStr(id);
  const [c1, c2] = COVER_PALETTES[idx % COVER_PALETTES.length];
  const dims = { sm: "w-12 h-16", md: "w-16 h-24", lg: "w-28 h-40", xl: "w-40 h-56" }[size];

  if (coverUrl && !imgFailed) {
    return (
      <img
        src={coverUrl}
        alt={title}
        onError={() => setImgFailed(true)}
        className={`${dims} rounded-md shrink-0 object-cover shadow-md`}
        style={{ boxShadow: "0 4px 14px rgba(139,94,60,0.25)" }}
      />
    );
  }

  return (
    <div
      className={`${dims} rounded-md shrink-0 flex items-end p-1.5 shadow-md`}
      style={{ background: `linear-gradient(150deg, ${c1}, ${c2})`, boxShadow: "0 4px 14px rgba(139,94,60,0.25)" }}
    >
      <span className="text-white leading-tight" style={{ fontFamily: "Playfair Display, serif", fontSize: size === "xl" ? "13px" : "9px", fontWeight: 700 }}>
        {title}
      </span>
    </div>
  );
}

function Stars({ value, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = value >= n ? 1 : value >= n - 0.5 ? 0.5 : 0;
        return (
          <div key={n} className="relative" style={{ width: size, height: size }}>
            <Star size={size} color={T.secondary} fill="none" className="absolute" />
            <div className="absolute overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} color={T.accent} fill={T.accent} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Card({ children, dark, className = "" }) {
  return (
    <div className={`rounded-2xl p-4 ${className}`} style={{ background: dark ? T.surfaceDark : T.surface, boxShadow: dark ? "none" : "0 2px 10px rgba(139,94,60,0.08)" }}>
      {children}
    </div>
  );
}

function Section({ dark, title, subtitle, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline gap-2 mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>{title}</h4>
        {subtitle && <span className="text-[10px]" style={{ color: dark ? "#7A6C58" : "#9A8A75" }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

const shelfLabel = { want_to_read: "Want to Read", currently_reading: "Currently Reading", read: "Read", dnf: "DNF" };

/* ---------------------------------------------------------------
   AUTH SCREEN
--------------------------------------------------------------- */
function AuthScreen({ dark }) {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full min-h-screen flex flex-col justify-center px-8" style={{ background: dark ? T.bgDark : T.bg }}>
      <h1 className="text-4xl font-bold text-center mb-1" style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }}>Shelfie</h1>
      <p className="text-center text-sm mb-8" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>Your cozy corner for tracking books</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="px-4 py-3 rounded-full text-sm outline-none" style={{ background: dark ? T.surfaceDark : "#fff", color: dark ? T.textLight : T.textPrimary }} />
        )}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="px-4 py-3 rounded-full text-sm outline-none" style={{ background: dark ? T.surfaceDark : "#fff", color: dark ? T.textLight : T.textPrimary }} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className="px-4 py-3 rounded-full text-sm outline-none" style={{ background: dark ? T.surfaceDark : "#fff", color: dark ? T.textLight : T.textPrimary }} />

        {error && <p className="text-xs text-center" style={{ color: T.error }}>{error}</p>}

        <button type="submit" disabled={busy} className="py-3 rounded-full font-medium text-sm text-white mt-1" style={{ background: T.accent }}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <button onClick={() => signInWithGoogle()} className="mt-3 py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2" style={{ background: dark ? T.surfaceDark : "#fff", color: dark ? T.textLight : T.textPrimary }}>
        Continue with Google
      </button>

      <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="mt-5 text-sm text-center" style={{ color: T.accent }}>
        {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------
   MY SHELF TAB
--------------------------------------------------------------- */
function ShelfTab({ dark, books, onOpen }) {
  const shelves = ["currently_reading", "want_to_read", "read", "dnf"];
  const firstNonEmpty = shelves.find((s) => books.some((b) => b.shelf === s)) || "currently_reading";
  const [filter, setFilter] = useState(firstNonEmpty);

  useEffect(() => {
    if (books.length > 0 && !books.some((b) => b.shelf === filter)) {
      setFilter(firstNonEmpty);
    }
  }, [books.length]);
  const filtered = books.filter((b) => b.shelf === filter);

  return (
    <div className="px-5 pt-6 pb-4">
      <h1 style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }} className="text-3xl font-bold mb-1">My Shelf</h1>
      <p style={{ color: dark ? "#B5A68F" : T.textSecondary }} className="text-sm mb-5">
        {books.filter((b) => b.shelf === "currently_reading").length} in progress · {books.filter((b) => b.shelf === "read").length} finished
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-5 px-5 no-scrollbar">
        {shelves.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition"
            style={{ fontFamily: "Inter, sans-serif", background: filter === s ? T.primary : dark ? T.surfaceDark : "#fff", color: filter === s ? "#fff" : dark ? T.textLight : T.textSecondary, boxShadow: filter === s ? "none" : dark ? "none" : "0 2px 8px rgba(139,94,60,0.10)" }}>
            {shelfLabel[s]} · {books.filter((b) => b.shelf === s).length}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>
            <BookOpen className="mx-auto mb-3 opacity-40" size={36} />
            <p className="text-sm">Nothing on this shelf yet.</p>
            <p className="text-xs mt-1 opacity-70">Go to Discover to search and add a book.</p>
          </div>
        )}
        {filtered.map((b) => (
          <button key={b.id} onClick={() => onOpen(b)} className="flex gap-3 p-3 rounded-2xl text-left transition active:scale-[0.98]" style={{ background: dark ? T.surfaceDark : T.surface, boxShadow: dark ? "none" : "0 2px 10px rgba(139,94,60,0.08)" }}>
            <Cover id={b.id} title={b.title} coverUrl={b.cover_url} size="md" />
            <div className="flex-1 min-w-0 py-0.5">
              <h3 className="font-semibold text-sm truncate" style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }}>{b.title}</h3>
              <p className="text-xs mb-1.5" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>{b.author}</p>
              {b.shelf === "currently_reading" && (
                <>
                  <div className="w-full h-1.5 rounded-full overflow-hidden mb-1" style={{ background: dark ? "#544736" : "#EDE3D3" }}>
                    <div className="h-full rounded-full" style={{ width: `${b.progress}%`, background: T.accent }} />
                  </div>
                  <p className="text-[11px]" style={{ color: T.accent, fontFamily: "Space Grotesk, monospace" }}>{b.progress}% · {Math.round((b.pages || 0) * b.progress / 100)}/{b.pages || 0} pg</p>
                </>
              )}
              {b.rating != null && <Stars value={b.rating} />}
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: dark ? "#4a3d2d" : T.bg, color: dark ? T.textLight : T.textSecondary }}>{b.genre || "Unsorted"}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   BOOK DETAIL SHEET
--------------------------------------------------------------- */
function BookDetail({ book, dark, onClose, onUpdate, onEnrich, userId }) {
  const [progress, setProgress] = useState(book.progress);
  const [rating, setRating] = useState(book.rating || 0);
  const [notes, setNotes] = useState(book.private_notes || "");
  const [saving, setSaving] = useState(false);
  const [showBuddyForm, setShowBuddyForm] = useState(false);
  const [maxMembers, setMaxMembers] = useState(4);
  const [pace, setPace] = useState("1 chapter/day");
  const [buddyMsg, setBuddyMsg] = useState("");
  const [buddyCreated, setBuddyCreated] = useState(false);

  async function handleCreateBuddyRead() {
    try {
      await createBuddyRead(book.book_id, userId, { maxMembers, pace, message: buddyMsg });
      setBuddyCreated(true);
      setShowBuddyForm(false);
    } catch (e) {
      console.warn("Failed to create buddy read:", e);
    }
  }

  useEffect(() => {
    if (!book.description || !book.pages) {
      enrichBookDetails(book.book_id, book.title, book.author).then((updated) => {
        if (updated) onEnrich(book.book_id, updated);
      });
    }
  }, [book.book_id]);

  async function saveProgress() {
    setSaving(true);
    await onUpdate(book.id, { progress });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(20,14,8,0.55)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl p-6 pb-10" style={{ background: dark ? T.bgDark : T.bg }}>
        <div className="flex justify-between items-center mb-4">
          <button onClick={onClose} style={{ color: dark ? T.textLight : T.textPrimary }}><ChevronLeft /></button>
          <button style={{ color: dark ? T.textLight : T.textPrimary }}><Share2 size={18} /></button>
        </div>

        <div className="flex gap-4 mb-6">
          <Cover id={book.id} title={book.title} coverUrl={book.cover_url} size="lg" />
          <div className="flex-1 pt-1">
            <h2 style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }} className="text-xl font-bold leading-snug">{book.title}</h2>
            <p style={{ color: dark ? "#B5A68F" : T.textSecondary }} className="text-sm mb-2">{book.author}</p>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: T.primary, color: "#fff" }}>{book.genre || "Unsorted"}</span>
            <p className="text-xs mt-2" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>{book.pages || 0} pages</p>
          </div>
        </div>

        {book.description && (
          <Section dark={dark} title="About this book">
            <p className="text-sm leading-relaxed" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>{book.description}</p>
          </Section>
        )}

        <Section dark={dark} title="Find this book">
          <div className="flex gap-2 flex-wrap">
            <a href={`https://books.google.com/books?q=${encodeURIComponent(book.title + " " + book.author)}`} target="_blank" rel="noreferrer" className="text-xs px-3 py-2 rounded-full font-medium" style={{ background: dark ? T.surfaceDark : "#fff", color: T.primary, boxShadow: dark ? "none" : "0 1px 4px rgba(139,94,60,0.12)" }}>Google Books</a>
            <a href={`https://www.amazon.com/s?k=${encodeURIComponent(book.title + " " + book.author)}`} target="_blank" rel="noreferrer" className="text-xs px-3 py-2 rounded-full font-medium" style={{ background: dark ? T.surfaceDark : "#fff", color: T.primary, boxShadow: dark ? "none" : "0 1px 4px rgba(139,94,60,0.12)" }}>Amazon</a>
            <a href={`https://openlibrary.org/search?q=${encodeURIComponent(book.title + " " + book.author)}`} target="_blank" rel="noreferrer" className="text-xs px-3 py-2 rounded-full font-medium" style={{ background: dark ? T.surfaceDark : "#fff", color: T.primary, boxShadow: dark ? "none" : "0 1px 4px rgba(139,94,60,0.12)" }}>Library (Open Library)</a>
          </div>
        </Section>

        <Section dark={dark} title="Progress">
          <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(+e.target.value)} className="w-full" style={{ accentColor: T.accent }} />
          <div className="flex justify-between text-xs" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>
            <span>{Math.round((book.pages || 0) * progress / 100)} / {book.pages || 0} pages</span>
            <span style={{ color: T.accent, fontFamily: "Space Grotesk, monospace" }}>{progress}%</span>
          </div>
          <button onClick={saveProgress} disabled={saving} className="mt-3 w-full py-2.5 rounded-full font-medium text-sm text-white" style={{ background: T.accent }}>
            {saving ? "Saving…" : "Update Progress"}
          </button>
        </Section>

        <Section dark={dark} title="Your Rating">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => { setRating(n); onUpdate(book.id, { rating: n }); }}>
                <Star size={26} color={T.accent} fill={rating >= n ? T.accent : "none"} />
              </button>
            ))}
          </div>
        </Section>

        <Section dark={dark} title="Private Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onUpdate(book.id, { private_notes: notes })}
            placeholder="Only you can see this..."
            rows={3}
            className="w-full rounded-xl p-3 text-sm outline-none"
            style={{ background: dark ? T.surfaceDark : "#fff", color: dark ? T.textLight : T.textPrimary }}
          />
        </Section>

        {buddyCreated ? (
          <p className="text-sm text-center py-3 font-medium" style={{ color: T.success }}>Buddy read started! Others can find it in Discover.</p>
        ) : showBuddyForm ? (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>Max members</label>
            <input type="number" min={2} max={5} value={maxMembers} onChange={(e) => setMaxMembers(+e.target.value)} className="px-4 py-2 rounded-full text-sm outline-none" style={{ background: dark ? T.surfaceDark : "#fff", color: dark ? T.textLight : T.textPrimary }} />
            <label className="text-xs font-semibold uppercase tracking-wide mt-1" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>Pace</label>
            <input value={pace} onChange={(e) => setPace(e.target.value)} placeholder="e.g. 1 chapter/day" className="px-4 py-2 rounded-full text-sm outline-none" style={{ background: dark ? T.surfaceDark : "#fff", color: dark ? T.textLight : T.textPrimary }} />
            <label className="text-xs font-semibold uppercase tracking-wide mt-1" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>Message (optional)</label>
            <textarea value={buddyMsg} onChange={(e) => setBuddyMsg(e.target.value)} rows={2} className="px-4 py-2 rounded-2xl text-sm outline-none" style={{ background: dark ? T.surfaceDark : "#fff", color: dark ? T.textLight : T.textPrimary }} />
            <button onClick={handleCreateBuddyRead} className="w-full py-3 rounded-full font-medium text-sm mt-1" style={{ background: T.accent, color: "#fff" }}>Create Buddy Read</button>
          </div>
        ) : (
          <button onClick={() => setShowBuddyForm(true)} className="w-full py-3 rounded-full font-medium text-sm mt-2 flex items-center justify-center gap-2" style={{ background: T.primary, color: "#fff" }}>
            <Users size={16} /> Start Buddy Read
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   STATS TAB
--------------------------------------------------------------- */
function CircularGoal({ done, target, dark }) {
  const pct = Math.min(100, (done / target) * 100);
  const r = 54, c = 2 * Math.PI * r;
  return (
    <svg width={140} height={140} className="mx-auto">
      <circle cx={70} cy={70} r={r} stroke={dark ? "#4a3d2d" : "#EDE3D3"} strokeWidth={12} fill="none" />
      <circle cx={70} cy={70} r={r} stroke={T.accent} strokeWidth={12} fill="none" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} strokeLinecap="round" transform="rotate(-90 70 70)" />
      <text x={70} y={65} textAnchor="middle" fontSize="26" fontWeight="700" fill={dark ? T.textLight : T.textPrimary} fontFamily="Space Grotesk, monospace">{done}</text>
      <text x={70} y={84} textAnchor="middle" fontSize="11" fill={dark ? "#B5A68F" : T.textSecondary}>of {target} books</text>
    </svg>
  );
}

function StatsTab({ dark, books }) {
  const finished = books.filter((b) => b.shelf === "read");
  const totalPages = finished.reduce((a, b) => a + (b.pages || 0), 0);
  const avgRating = finished.length ? (finished.reduce((a, b) => a + (b.rating || 0), 0) / finished.length).toFixed(1) : "0.0";

  const genreData = useMemo(() => {
    const m = {};
    finished.forEach((b) => { const g = b.genre || "Unsorted"; m[g] = (m[g] || 0) + 1; });
    const palette = [T.primary, T.accent, T.secondary, T.success, T.accentLight];
    return Object.entries(m).map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));
  }, [finished]);

  return (
    <div className="px-5 pt-6 pb-4">
      <h1 style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }} className="text-3xl font-bold mb-5">Stats</h1>

      <Card dark={dark}><CircularGoal done={finished.length} target={12} dark={dark} /></Card>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <Card dark={dark}>
          <p className="text-3xl font-bold" style={{ fontFamily: "Space Grotesk, monospace", color: T.accent }}>{totalPages.toLocaleString()}</p>
          <p className="text-xs" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>pages read</p>
        </Card>
        <Card dark={dark}>
          <div className="flex items-center gap-1">
            <p className="text-3xl font-bold" style={{ fontFamily: "Space Grotesk, monospace", color: T.accent }}>{avgRating}</p>
            <Star size={18} fill={T.accent} color={T.accent} />
          </div>
          <p className="text-xs" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>avg rating</p>
        </Card>
      </div>

      {genreData.length > 0 && (
        <Card dark={dark} className="mt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>Genres</h4>
          <div className="flex items-center gap-3">
            <div style={{ width: 100, height: 100 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={genreData} dataKey="value" innerRadius={28} outerRadius={45} paddingAngle={3}>
                    {genreData.map((g, i) => <Cell key={i} fill={g.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {genreData.map((g) => (
                <div key={g.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                  <span style={{ color: dark ? T.textLight : T.textPrimary }}>{g.name}</span>
                  <span className="ml-auto" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>{g.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   DISCOVER TAB
--------------------------------------------------------------- */
function DiscoverTab({ dark, userId, onAdded }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addedIds, setAddedIds] = useState({});

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchBooks(query);
        setResults(r);
      } catch (e) {
        console.warn(e);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  async function handleAdd(book) {
    try {
      const row = await addToShelf(userId, book.id, "want_to_read");
      setAddedIds((prev) => ({ ...prev, [book.id]: true }));
      onAdded(row);
    } catch (e) {
      console.warn("Failed to add book:", e);
    }
  }

  return (
    <div className="px-5 pt-6 pb-4">
      <h1 style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }} className="text-3xl font-bold mb-4">Discover</h1>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: dark ? "#8A7C68" : T.textSecondary }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search books, authors..." className="w-full pl-10 pr-4 py-3 rounded-full text-sm outline-none" style={{ background: dark ? T.surfaceDark : "#fff", color: dark ? T.textLight : T.textPrimary, boxShadow: dark ? "none" : "0 2px 10px rgba(139,94,60,0.08)" }} />
      </div>

      {query.trim().length > 0 ? (
        <div className="flex flex-col gap-2 mb-6">
          {searching && <p className="text-xs text-center" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>Searching…</p>}
          {!searching && results.map((b) => (
            <div key={b.id} className="flex gap-3 items-center p-2.5 rounded-xl" style={{ background: dark ? T.surfaceDark : "#fff" }}>
              <Cover id={b.id} title={b.title} coverUrl={b.cover_url} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: dark ? T.textLight : T.textPrimary }}>{b.title}</p>
                <p className="text-xs" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>{b.author} · {b.page_count || "?"}pg</p>
              </div>
              <button onClick={() => handleAdd(b)} className="p-2 rounded-full" style={{ background: addedIds[b.id] ? T.success : T.bg, color: addedIds[b.id] ? "#fff" : T.primary }}>
                <Plus size={16} />
              </button>
            </div>
          ))}
          {!searching && results.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>No matches found. Try a different search.</p>
          )}
        </div>
      ) : (
        <>
          <h3 className="text-sm font-semibold mb-2" style={{ color: dark ? T.textLight : T.textPrimary }}>Buddy Reads open now</h3>
          <div className="flex flex-col gap-2">
            {buddyReads.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>No buddy reads yet — start one from any book's detail page!</p>
            )}
            {buddyReads.map((br) => {
              const isHost = br.host_id === userId;
              const alreadyMember = br.buddy_read_members.some((m) => m.user_id === userId);
              const full = br.acceptedCount >= br.max_members;
              return (
                <button key={br.id} onClick={() => onOpenBuddyRead(br.id)} className="p-3.5 rounded-2xl text-left w-full" style={{ background: dark ? T.surfaceDark : "#fff", boxShadow: dark ? "none" : "0 2px 10px rgba(139,94,60,0.08)" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: dark ? T.textLight : T.textPrimary }}>{br.books?.title}</p>
                      <p className="text-xs" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>{isHost ? "hosted by you" : "buddy read"} · {br.pace}</p>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full font-medium shrink-0" style={{ background: T.bg, color: T.primary }}>{br.acceptedCount}/{br.max_members} spots</span>
                  </div>
                  {!isHost && !alreadyMember && (
                    <button onClick={(e) => { e.stopPropagation(); handleJoin(br.id); }} disabled={full || joinedIds[br.id]} className="mt-2.5 w-full py-2 rounded-full text-xs font-medium text-white" style={{ background: full ? "#B5A68F" : T.accent }}>
                      {joinedIds[br.id] ? "Requested" : full ? "Full" : "Request to Join"}
                    </button>
                  )}
                  {alreadyMember && !isHost && (
                    <p className="mt-2.5 text-xs text-center font-medium" style={{ color: T.success }}>Tap to open discussion</p>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   CHALLENGES TAB
--------------------------------------------------------------- */
/* ---------------------------------------------------------------
   BUDDY READ DETAIL — members, host controls, chapter discussion
--------------------------------------------------------------- */
function BuddyReadDetail({ buddyReadId, dark, userId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [chapter, setChapter] = useState(1);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    getBuddyReadDetail(buddyReadId, userId).then(setDetail).catch((e) => console.warn(e));
  }, [buddyReadId]);

  const isHost = detail?.host_id === userId;
  const isMember = detail?.myMembership?.status === "accepted";
  const canChat = isHost || isMember;

  useEffect(() => {
    if (!canChat) return;
    getMessages(buddyReadId, chapter).then(setMessages).catch((e) => console.warn(e));
    const unsubscribe = subscribeToMessages(buddyReadId, (msg) => {
      if (msg.chapter === chapter) setMessages((prev) => [...prev, msg]);
    });
    return unsubscribe;
  }, [buddyReadId, chapter, canChat]);

  async function handleSend() {
    if (!text.trim()) return;
    try {
      await sendMessage(buddyReadId, userId, chapter, text.trim());
      setText("");
    } catch (e) {
      console.warn("Failed to send message:", e);
    }
  }

  async function handleRespond(memberRowId, decision) {
    await respondToRequest(memberRowId, decision);
    const refreshed = await getBuddyReadDetail(buddyReadId, userId);
    setDetail(refreshed);
  }

  if (!detail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(20,14,8,0.55)" }}>
        <p style={{ color: "#fff" }}>Loading…</p>
      </div>
    );
  }

  const pending = detail.buddy_read_members.filter((m) => m.status === "pending");
  const accepted = detail.buddy_read_members.filter((m) => m.status === "accepted");

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(20,14,8,0.55)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl p-6 pb-10" style={{ background: dark ? T.bgDark : T.bg }}>
        <button onClick={onClose} style={{ color: dark ? T.textLight : T.textPrimary }}><ChevronLeft /></button>

        <h2 className="text-xl font-bold mt-3 mb-1" style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }}>{detail.books?.title}</h2>
        <p className="text-sm mb-4" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>{detail.pace} · {accepted.length}/{detail.max_members} readers</p>

        {isHost && pending.length > 0 && (
          <Section dark={dark} title="Join requests">
            <div className="flex flex-col gap-2">
              {pending.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: dark ? T.surfaceDark : "#fff" }}>
                  <span className="text-sm" style={{ color: dark ? T.textLight : T.textPrimary }}>{m.users?.name || m.users?.email}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleRespond(m.id, "accepted")} className="text-xs px-3 py-1.5 rounded-full text-white" style={{ background: T.success }}>Accept</button>
                    <button onClick={() => handleRespond(m.id, "rejected")} className="text-xs px-3 py-1.5 rounded-full" style={{ background: dark ? "#4a3d2d" : T.bg, color: dark ? T.textLight : T.textSecondary }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section dark={dark} title="Members">
          <div className="flex flex-wrap gap-2">
            {accepted.map((m) => (
              <span key={m.id} className="text-xs px-3 py-1.5 rounded-full" style={{ background: dark ? T.surfaceDark : "#fff", color: dark ? T.textLight : T.textPrimary }}>{m.users?.name || m.users?.email}</span>
            ))}
          </div>
        </Section>

        {canChat ? (
          <Section dark={dark} title="Discussion" subtitle="organized by chapter — no spoilers ahead!">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>Chapter</span>
              <input type="number" min={1} value={chapter} onChange={(e) => setChapter(+e.target.value)} className="w-16 px-3 py-1.5 rounded-full text-sm outline-none" style={{ background: dark ? T.surfaceDark : "#fff", color: dark ? T.textLight : T.textPrimary }} />
            </div>
            <div className="flex flex-col gap-2 mb-3 max-h-60 overflow-y-auto">
              {messages.length === 0 && <p className="text-xs" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>No messages yet for this chapter.</p>}
              {messages.map((m) => (
                <div key={m.id} className="p-2.5 rounded-xl" style={{ background: dark ? T.surfaceDark : "#fff" }}>
                  <p className="text-[11px] font-medium mb-0.5" style={{ color: T.accent }}>{m.users?.name || "Reader"}</p>
                  <p className="text-sm" style={{ color: dark ? T.textLight : T.textPrimary }}>{m.message}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Share a thought…" className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none" style={{ background: dark ? T.surfaceDark : "#fff", color: dark ? T.textLight : T.textPrimary }} />
              <button onClick={handleSend} className="px-4 py-2.5 rounded-full text-sm font-medium text-white" style={{ background: T.accent }}>Send</button>
            </div>
          </Section>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>
            {detail.myMembership?.status === "pending" ? "Your request is pending host approval." : "Request to join to see the discussion."}
          </p>
        )}
      </div>
    </div>
  );
}

function ChallengesTab({ dark, books }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChallenges()
      .then(setChallenges)
      .catch((e) => console.warn("Failed to load challenges:", e))
      .finally(() => setLoading(false));
  }, []);

  const finishedBooks = books.filter((b) => b.shelf === "read");
  const EMOJI = ["🏆", "🐉", "📖", "🌟", "🔥", "📚"];

  return (
    <div className="px-5 pt-6 pb-4">
      <h1 style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }} className="text-3xl font-bold mb-5">Challenges</h1>
      {loading && <p className="text-sm" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>Loading…</p>}
      <div className="flex flex-col gap-3">
        {challenges.map((c, i) => {
          const progress = computeChallengeProgress(c, finishedBooks);
          const pct = Math.min(100, (progress / c.target) * 100);
          const done = progress >= c.target;
          return (
            <div key={c.id} className="p-4 rounded-2xl flex items-center gap-3" style={{ background: dark ? T.surfaceDark : "#fff", boxShadow: dark ? "none" : "0 2px 10px rgba(139,94,60,0.08)" }}>
              <div className="text-3xl w-12 h-12 flex items-center justify-center rounded-2xl shrink-0" style={{ background: done ? T.success : T.bg, opacity: done ? 1 : 0.85 }}>{EMOJI[i % EMOJI.length]}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: dark ? T.textLight : T.textPrimary }}>{c.title}</p>
                {c.description && <p className="text-[11px] mb-1" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>{c.description}</p>}
                <div className="w-full h-2 rounded-full overflow-hidden mt-1.5 mb-1" style={{ background: dark ? "#4a3d2d" : "#EDE3D3" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: done ? T.success : T.accent }} />
                </div>
                <p className="text-[11px]" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>{progress} / {c.target} {done && "· Complete! 🎉"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   PROFILE TAB
--------------------------------------------------------------- */
function ProfileTab({ dark, setDark, user, streak, earnedBadges }) {
  return (
    <div className="px-5 pt-6 pb-4">
      <h1 style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }} className="text-3xl font-bold mb-5">Profile</h1>

      <Card dark={dark} className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`, fontFamily: "Playfair Display, serif" }}>
          {(user?.email || "?")[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold" style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }}>{user?.email}</p>
          <p className="text-xs" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>Reading goal: 12 books/yr</p>
        </div>
      </Card>

      <Card dark={dark} className="mb-4 flex items-center gap-3">
        <Flame color={T.accent} fill={T.accent} size={30} />
        <div>
          <p className="text-2xl font-bold" style={{ fontFamily: "Space Grotesk, monospace", color: dark ? T.textLight : T.textPrimary }}>{streak}-day streak</p>
          <p className="text-xs" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>Read today to keep it alive 🔥</p>
        </div>
      </Card>

      <Card dark={dark} className="mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>Badges</h4>
        <div className="grid grid-cols-4 gap-3">
          {BADGES.map((b) => {
            const earned = !!earnedBadges[b.name];
            return (
              <div key={b.id} className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl" style={{ background: earned ? T.bg : dark ? "#33291c" : "#EDE3D3", opacity: earned ? 1 : 0.4 }}>{b.icon}</div>
                <p className="text-[9px] text-center leading-tight" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>{b.name}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card dark={dark} className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {dark ? <Moon size={18} color={T.textLight} /> : <Sun size={18} color={T.primary} />}
          <span className="text-sm font-medium" style={{ color: dark ? T.textLight : T.textPrimary }}>Dark mode</span>
        </div>
        <button onClick={() => setDark(!dark)} className="w-12 h-7 rounded-full relative transition" style={{ background: dark ? T.accent : "#D9CDB8" }}>
          <span className="absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all" style={{ left: dark ? "22px" : "2px" }} />
        </button>
      </Card>

      <button onClick={() => signOut()} className="w-full py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2" style={{ background: dark ? T.surfaceDark : "#fff", color: T.error }}>
        <LogOut size={16} /> Sign out
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------
   DATA MAPPING
--------------------------------------------------------------- */
function mapShelfRow(row) {
  return {
    id: row.id,
    book_id: row.book_id,
    title: row.books?.title || "Untitled",
    author: row.books?.author || "Unknown",
    pages: row.books?.page_count || 0,
    genre: row.books?.genre,
    cover_url: row.books?.cover_url,
    description: row.books?.description,
    isbn: row.books?.isbn,
    shelf: row.shelf,
    progress: row.progress,
    mood: row.mood,
    pace: row.pace,
    rating: row.rating,
    private_notes: row.private_notes,
  };
}

/* ---------------------------------------------------------------
   ROOT APP
--------------------------------------------------------------- */
export default function Shelfie() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("shelf");
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [books, setBooks] = useState([]);
  const [openBook, setOpenBook] = useState(null);
  const [streak, setStreak] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState({});
  const [openBuddyReadId, setOpenBuddyReadId] = useState(null);

  // Make the phone/browser back button close an open modal instead of
  // leaving the app. We push a history entry whenever a modal opens, and
  // treat "back" (popstate) as "close whatever modal is open".
  useEffect(() => {
    if (openBook || openBuddyReadId) {
      window.history.pushState({ modal: true }, "");
    }
  }, [openBook, openBuddyReadId]);

  useEffect(() => {
    function handlePopState() {
      setOpenBook(null);
      setOpenBuddyReadId(null);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    getShelf(session.user.id)
      .then((rows) => setBooks(rows.map(mapShelfRow)))
      .catch((e) => console.warn("Failed to load shelf:", e));
    getStreak(session.user.id)
      .then(setStreak)
      .catch((e) => console.warn("Failed to load streak:", e));
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user || books.length === 0) return;
    getBadgeStatus(session.user.id, books, streak)
      .then(setEarnedBadges)
      .catch((e) => console.warn("Failed to compute badges:", e));
  }, [session?.user?.id, books.length, streak]);

  async function updateBook(userBookId, patch) {
    try {
      const before = books.find((b) => b.id === userBookId);
      const updated = await updateShelfEntry(userBookId, patch);
      const mapped = mapShelfRow(updated);
      setBooks((prev) => prev.map((b) => (b.id === userBookId ? mapped : b)));
      setOpenBook((prev) => (prev && prev.id === userBookId ? mapped : prev));

      if (patch.progress !== undefined && before) {
        const pagesBefore = Math.round((before.pages || 0) * (before.progress || 0) / 100);
        const pagesAfter = Math.round((mapped.pages || 0) * (mapped.progress || 0) / 100);
        const pagesDelta = pagesAfter - pagesBefore;
        if (pagesDelta > 0) {
          await logReadingSession(session.user.id, mapped.book_id, pagesDelta);
          const newStreak = await getStreak(session.user.id);
          setStreak(newStreak);
        }
      }
    } catch (e) {
      console.warn("Failed to update book:", e);
    }
  }

  function handleBookAdded(row) {
    setBooks((prev) => [mapShelfRow(row), ...prev]);
  }

  function handleEnrich(bookId, updatedBooksRow) {
    setBooks((prev) => prev.map((b) => (b.book_id === bookId ? {
      ...b,
      pages: updatedBooksRow.page_count || b.pages,
      description: updatedBooksRow.description || b.description,
      genre: b.genre || updatedBooksRow.genre,
    } : b)));
    setOpenBook((prev) => (prev && prev.book_id === bookId ? {
      ...prev,
      pages: updatedBooksRow.page_count || prev.pages,
      description: updatedBooksRow.description || prev.description,
      genre: prev.genre || updatedBooksRow.genre,
    } : prev));
  }

  const TABS = [
    { id: "shelf", label: "My Shelf", icon: BookOpen },
    { id: "stats", label: "Stats", icon: BarChart3 },
    { id: "discover", label: "Discover", icon: Search },
    { id: "challenges", label: "Challenges", icon: Trophy },
    { id: "profile", label: "Profile", icon: User },
  ];

  const fontStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>
  );

  if (session === undefined) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
        {fontStyles}
        <p style={{ color: T.textSecondary, fontFamily: "Inter, sans-serif" }}>Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="w-full min-h-screen flex justify-center" style={{ fontFamily: "Inter, sans-serif" }}>
        {fontStyles}
        <div className="w-full max-w-md">
          <AuthScreen dark={dark} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }} className="w-full min-h-screen flex justify-center">
      {fontStyles}
      <div className="w-full max-w-md min-h-screen relative" style={{ background: dark ? T.bgDark : T.bg, transition: "background 0.25s" }}>
        <div className="sticky top-0 z-10 flex justify-end px-5 pt-4">
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: dark ? T.surfaceDark : "#fff", color: T.accent, boxShadow: dark ? "none" : "0 2px 8px rgba(139,94,60,0.10)" }}>
            <Flame size={13} fill={T.accent} color={T.accent} /> {streak}
          </div>
        </div>

        <div className="pb-24">
          {tab === "shelf" && <ShelfTab dark={dark} books={books} onOpen={setOpenBook} />}
          {tab === "stats" && <StatsTab dark={dark} books={books} />}
          {tab === "discover" && <DiscoverTab dark={dark} userId={session.user.id} onAdded={handleBookAdded} onOpenBuddyRead={setOpenBuddyReadId} />}
          {tab === "challenges" && <ChallengesTab dark={dark} books={books} />}
          {tab === "profile" && <ProfileTab dark={dark} setDark={setDark} user={session.user} streak={streak} earnedBadges={earnedBadges} />}
        </div>

        <div className="fixed bottom-0 w-full max-w-md flex justify-around items-center py-2.5 z-20" style={{ background: dark ? T.surfaceDark : "#fff", borderTop: `1px solid ${dark ? "#4a3d2d" : "#EDE3D3"}` }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center gap-0.5 px-2 py-1">
                <Icon size={21} color={active ? T.accent : dark ? "#8A7C68" : T.textSecondary} />
                <span className="text-[10px] font-medium" style={{ color: active ? T.accent : dark ? "#8A7C68" : T.textSecondary }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {openBook && <BookDetail book={openBook} dark={dark} onClose={() => window.history.back()} onUpdate={updateBook} onEnrich={handleEnrich} userId={session.user.id} />}
        {openBuddyReadId && <BuddyReadDetail buddyReadId={openBuddyReadId} dark={dark} userId={session.user.id} onClose={() => window.history.back()} />}
      </div>
    </div>
  );
}
