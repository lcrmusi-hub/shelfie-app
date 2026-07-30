import React, { useState, useMemo, useRef } from "react";
import {
  Search, Flame, BookOpen, BarChart3, Trophy, User, Moon, Sun,
  Plus, Star, ChevronLeft, X, Users, Share2, Download, Check,
  Clock, TrendingUp, Award, Sparkles, MessageCircle, ShieldAlert,
  Bookmark, Target
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip
} from "recharts";

/* ---------------------------------------------------------------
   COZY LIBRARY — design tokens (from brief, followed exactly)
--------------------------------------------------------------- */
const T = {
  primary: "#8B5E3C",
  primaryLight: "#A67B5B",
  secondary: "#D4A574",
  accent: "#C75B39",
  accentLight: "#E07A5F",
  bg: "#F5F0E8",
  bgDark: "#2C2416",
  surface: "#FFFFFF",
  surfaceDark: "#3D3229",
  textPrimary: "#3D2914",
  textSecondary: "#6B5B4F",
  textLight: "#E8DCC8",
  success: "#6A994E",
  warning: "#E9C46A",
  error: "#E07A5F",
};

const COVER_PALETTES = [
  ["#8B5E3C", "#C75B39"], ["#A67B5B", "#6A994E"], ["#C75B39", "#E9C46A"],
  ["#6B5B4F", "#D4A574"], ["#8B5E3C", "#E07A5F"], ["#3D2914", "#A67B5B"],
];

/* ---------------------------------------------------------------
   MOCK DATA — stands in for Supabase + Google Books API
--------------------------------------------------------------- */
const MOCK_LIBRARY = [
  { id: 1, title: "The Midnight Library", author: "Matt Haig", pages: 304, genre: "Fantasy", shelf: "currently_reading", progress: 61, mood: "Thought-provoking", pace: "Medium", rating: null },
  { id: 2, title: "Ninth House", author: "Leigh Bardugo", pages: 458, genre: "Dark Academia", shelf: "currently_reading", progress: 22, mood: "Dark", pace: "Slow", rating: null },
  { id: 3, title: "Legends & Lattes", author: "Travis Baldree", pages: 296, genre: "Cozy Fantasy", shelf: "read", progress: 100, mood: "Relaxing", pace: "Medium", rating: 4.5 },
  { id: 4, title: "Babel", author: "R.F. Kuang", pages: 545, genre: "Historical Fantasy", shelf: "read", progress: 100, mood: "Thought-provoking", pace: "Slow", rating: 5 },
  { id: 5, title: "The Song of Achilles", author: "Madeline Miller", pages: 416, genre: "Historical Fiction", shelf: "read", progress: 100, mood: "Sad", pace: "Medium", rating: 5 },
  { id: 6, title: "Fourth Wing", author: "Rebecca Yarros", pages: 512, genre: "Romantasy", shelf: "want_to_read", progress: 0, mood: "Exciting", pace: "Fast", rating: null },
  { id: 7, title: "Piranesi", author: "Susanna Clarke", pages: 245, genre: "Fantasy", shelf: "want_to_read", progress: 0, mood: "Thought-provoking", pace: "Slow", rating: null },
  { id: 8, title: "A Court of Thorns and Roses", author: "Sarah J. Maas", pages: 419, genre: "Romantasy", shelf: "dnf", progress: 30, mood: "Exciting", pace: "Fast", rating: 2.5 },
  { id: 9, title: "Circe", author: "Madeline Miller", pages: 385, genre: "Fantasy", shelf: "read", progress: 100, mood: "Thought-provoking", pace: "Medium", rating: 4.5 },
  { id: 10, title: "Mexican Gothic", author: "Silvia Moreno-Garcia", pages: 301, genre: "Horror", shelf: "read", progress: 100, mood: "Dark", pace: "Medium", rating: 3.5 },
];

const SEARCH_INDEX = [
  ...MOCK_LIBRARY,
  { id: 11, title: "Tomorrow, and Tomorrow, and Tomorrow", author: "Gabrielle Zevin", pages: 416, genre: "Literary Fiction" },
  { id: 12, title: "The House in the Cerulean Sea", author: "TJ Klune", pages: 398, genre: "Cozy Fantasy" },
  { id: 13, title: "Iron Widow", author: "Xiran Jay Zhao", pages: 394, genre: "Sci-Fi" },
];

const BUDDY_READS = [
  { id: 1, book: "Babel", host: "corvid_reads", spots: "2/5", pace: "1 ch/day" },
  { id: 2, book: "Fourth Wing", host: "dragonrider22", spots: "4/5", pace: "3 ch/week" },
  { id: 3, book: "Piranesi", host: "quiet.pages", spots: "1/3", pace: "flexible" },
];

const CHALLENGES = [
  { id: 1, title: "Read 12 Books in 2026", progress: 4, target: 12, badge: "🏆" },
  { id: 2, title: "Fantasy February", progress: 2, target: 3, badge: "🐉" },
  { id: 3, title: "A Book Under 200 Pages", progress: 0, target: 1, badge: "📖" },
];

const BADGES = [
  { id: 1, name: "First Book", icon: "🌱", earned: true },
  { id: 2, name: "Genre Explorer", icon: "🧭", earned: true },
  { id: 3, name: "Night Owl", icon: "🦉", earned: true },
  { id: 4, name: "Speed Reader", icon: "⚡", earned: false },
  { id: 5, name: "Marathon Reader", icon: "🏃", earned: false },
  { id: 6, name: "Streak Master", icon: "🔥", earned: false },
  { id: 7, name: "Social Reader", icon: "🤝", earned: false },
];

const MONTHLY = [
  { m: "Feb", pages: 220 }, { m: "Mar", pages: 410 }, { m: "Apr", pages: 180 },
  { m: "May", pages: 560 }, { m: "Jun", pages: 340 }, { m: "Jul", pages: 610 },
];

/* ---------------------------------------------------------------
   SHARED PIECES
--------------------------------------------------------------- */
function Cover({ id, title, size = "md" }) {
  const [c1, c2] = COVER_PALETTES[id % COVER_PALETTES.length];
  const dims = { sm: "w-12 h-16", md: "w-16 h-24", lg: "w-28 h-40", xl: "w-40 h-56" }[size];
  return (
    <div
      className={`${dims} rounded-md shrink-0 flex items-end p-1.5 shadow-md`}
      style={{
        background: `linear-gradient(150deg, ${c1}, ${c2})`,
        boxShadow: "0 4px 14px rgba(139,94,60,0.25)",
      }}
    >
      <span
        className="text-white leading-tight"
        style={{ fontFamily: "Playfair Display, serif", fontSize: size === "xl" ? "13px" : "9px", fontWeight: 700 }}
      >
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

const shelfLabel = { want_to_read: "Want to Read", currently_reading: "Currently Reading", read: "Read", dnf: "DNF" };

/* ---------------------------------------------------------------
   MY SHELF TAB
--------------------------------------------------------------- */
function ShelfTab({ dark, books, onOpen }) {
  const [filter, setFilter] = useState("currently_reading");
  const shelves = ["currently_reading", "want_to_read", "read", "dnf"];
  const filtered = books.filter((b) => b.shelf === filter);

  return (
    <div className="px-5 pt-6 pb-4">
      <h1 style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }} className="text-3xl font-bold mb-1">
        My Shelf
      </h1>
      <p style={{ color: dark ? "#B5A68F" : T.textSecondary }} className="text-sm mb-5">
        {books.filter((b) => b.shelf === "currently_reading").length} in progress · {books.filter((b) => b.shelf === "read").length} finished
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-5 px-5 no-scrollbar">
        {shelves.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition"
            style={{
              fontFamily: "Inter, sans-serif",
              background: filter === s ? T.primary : dark ? T.surfaceDark : "#fff",
              color: filter === s ? "#fff" : dark ? T.textLight : T.textSecondary,
              boxShadow: filter === s ? "none" : dark ? "none" : "0 2px 8px rgba(139,94,60,0.10)",
            }}
          >
            {shelfLabel[s]} · {books.filter((b) => b.shelf === s).length}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>
            <BookOpen className="mx-auto mb-3 opacity-40" size={36} />
            <p className="text-sm">Nothing on this shelf yet.</p>
          </div>
        )}
        {filtered.map((b) => (
          <button
            key={b.id}
            onClick={() => onOpen(b)}
            className="flex gap-3 p-3 rounded-2xl text-left transition active:scale-[0.98]"
            style={{ background: dark ? T.surfaceDark : T.surface, boxShadow: dark ? "none" : "0 2px 10px rgba(139,94,60,0.08)" }}
          >
            <Cover id={b.id} title={b.title} size="md" />
            <div className="flex-1 min-w-0 py-0.5">
              <h3 className="font-semibold text-sm truncate" style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }}>{b.title}</h3>
              <p className="text-xs mb-1.5" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>{b.author}</p>
              {b.shelf === "currently_reading" && (
                <>
                  <div className="w-full h-1.5 rounded-full overflow-hidden mb-1" style={{ background: dark ? "#544736" : "#EDE3D3" }}>
                    <div className="h-full rounded-full" style={{ width: `${b.progress}%`, background: T.accent }} />
                  </div>
                  <p className="text-[11px]" style={{ color: T.accent, fontFamily: "Space Grotesk, monospace" }}>{b.progress}% · {Math.round(b.pages * b.progress / 100)}/{b.pages} pg</p>
                </>
              )}
              {b.rating != null && <Stars value={b.rating} />}
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: dark ? "#4a3d2d" : T.bg, color: dark ? T.textLight : T.textSecondary }}>{b.genre}</span>
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
function BookDetail({ book, dark, onClose, onUpdate }) {
  const [progress, setProgress] = useState(book.progress);
  const [rating, setRating] = useState(book.rating || 0);
  const [notes, setNotes] = useState("");
  const shareRef = useRef(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(20,14,8,0.55)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl p-6 pb-10"
        style={{ background: dark ? T.bgDark : T.bg }}
      >
        <div className="flex justify-between items-center mb-4">
          <button onClick={onClose} style={{ color: dark ? T.textLight : T.textPrimary }}><ChevronLeft /></button>
          <button style={{ color: dark ? T.textLight : T.textPrimary }}><Share2 size={18} /></button>
        </div>

        <div className="flex gap-4 mb-6">
          <Cover id={book.id} title={book.title} size="lg" />
          <div className="flex-1 pt-1">
            <h2 style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }} className="text-xl font-bold leading-snug">{book.title}</h2>
            <p style={{ color: dark ? "#B5A68F" : T.textSecondary }} className="text-sm mb-2">{book.author}</p>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: T.primary, color: "#fff" }}>{book.genre}</span>
            <p className="text-xs mt-2" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>{book.pages} pages · {book.pace} pace</p>
          </div>
        </div>

        <Section dark={dark} title="Progress">
          <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(+e.target.value)} className="w-full accent-current" style={{ accentColor: T.accent }} />
          <div className="flex justify-between text-xs" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>
            <span>{Math.round(book.pages * progress / 100)} / {book.pages} pages</span>
            <span style={{ color: T.accent, fontFamily: "Space Grotesk, monospace" }}>{progress}%</span>
          </div>
          <button onClick={() => onUpdate(book.id, { progress })} className="mt-3 w-full py-2.5 rounded-full font-medium text-sm text-white" style={{ background: T.accent }}>
            Update Progress
          </button>
        </Section>

        <Section dark={dark} title="Your Rating">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)}>
                <Star size={26} color={T.accent} fill={rating >= n ? T.accent : "none"} />
              </button>
            ))}
          </div>
        </Section>

        <Section dark={dark} title="Mood & Pace">
          <div className="flex gap-2 flex-wrap">
            {["Happy", "Sad", "Dark", "Exciting", "Relaxing", "Thought-provoking"].map((m) => (
              <Tag key={m} active={m === book.mood} dark={dark}>{m}</Tag>
            ))}
          </div>
        </Section>

        <Section dark={dark} title="Content Warnings" subtitle="community-tagged">
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: "#F6E4DD", color: T.accent }}><ShieldAlert size={12} /> Grief</span>
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "#F6E4DD", color: T.accent }}>Mild violence</span>
          </div>
        </Section>

        <Section dark={dark} title="Private Notes">
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Only you can see this..."
            rows={3}
            className="w-full rounded-xl p-3 text-sm outline-none"
            style={{ background: dark ? T.surfaceDark : "#fff", color: dark ? T.textLight : T.textPrimary }}
          />
        </Section>

        <button className="w-full py-3 rounded-full font-medium text-sm mt-2 flex items-center justify-center gap-2" style={{ background: T.primary, color: "#fff", fontFamily: "Inter, sans-serif" }}>
          <Users size={16} /> Start Buddy Read
        </button>
      </div>
    </div>
  );
}

function Section({ dark, title, subtitle, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline gap-2 mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: dark ? "#B5A68F" : T.textSecondary, fontFamily: "Inter, sans-serif" }}>{title}</h4>
        {subtitle && <span className="text-[10px]" style={{ color: dark ? "#7A6C58" : "#9A8A75" }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function Tag({ children, active, dark }) {
  return (
    <span
      className="text-xs px-3 py-1.5 rounded-full font-medium"
      style={{
        background: active ? T.accent : dark ? T.surfaceDark : "#fff",
        color: active ? "#fff" : dark ? T.textLight : T.textSecondary,
        boxShadow: active || dark ? "none" : "0 1px 4px rgba(139,94,60,0.12)",
      }}
    >
      {children}
    </span>
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
      <circle
        cx={70} cy={70} r={r} stroke={T.accent} strokeWidth={12} fill="none"
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        strokeLinecap="round" transform="rotate(-90 70 70)"
      />
      <text x={70} y={65} textAnchor="middle" fontSize="26" fontWeight="700" fill={dark ? T.textLight : T.textPrimary} fontFamily="Space Grotesk, monospace">{done}</text>
      <text x={70} y={84} textAnchor="middle" fontSize="11" fill={dark ? "#B5A68F" : T.textSecondary} fontFamily="Inter, sans-serif">of {target} books</text>
    </svg>
  );
}

function StatsTab({ dark, books }) {
  const finished = books.filter((b) => b.shelf === "read");
  const totalPages = finished.reduce((a, b) => a + b.pages, 0);
  const avgRating = (finished.reduce((a, b) => a + (b.rating || 0), 0) / finished.length).toFixed(1);

  const genreData = useMemo(() => {
    const m = {};
    finished.forEach((b) => (m[b.genre] = (m[b.genre] || 0) + 1));
    const palette = [T.primary, T.accent, T.secondary, T.success, T.accentLight];
    return Object.entries(m).map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));
  }, [finished]);

  const moodData = useMemo(() => {
    const m = {};
    finished.forEach((b) => (m[b.mood] = (m[b.mood] || 0) + 1));
    return Object.entries(m);
  }, [finished]);

  const moodColors = { Happy: T.warning, Sad: T.primaryLight, Dark: T.textSecondary, Exciting: T.accent, Relaxing: T.success, "Thought-provoking": T.secondary };

  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex justify-between items-center mb-5">
        <h1 style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }} className="text-3xl font-bold">Stats</h1>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-white" style={{ background: T.primary }}>
          <Share2 size={13} /> Share
        </button>
      </div>

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

      <Card dark={dark} className="mt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>Mood breakdown</h4>
        <div className="flex flex-col gap-2">
          {moodData.map(([mood, count]) => (
            <div key={mood} className="flex items-center gap-2">
              <span className="text-xs w-28 shrink-0" style={{ color: dark ? T.textLight : T.textPrimary }}>{mood}</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: dark ? "#4a3d2d" : "#EDE3D3" }}>
                <div className="h-full rounded-full" style={{ width: `${(count / finished.length) * 100}%`, background: moodColors[mood] || T.accent }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card dark={dark} className="mt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: dark ? "#B5A68F" : T.textSecondary }}>Monthly pages</h4>
        <div style={{ height: 140 }}>
          <ResponsiveContainer>
            <LineChart data={MONTHLY}>
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: dark ? "#B5A68F" : T.textSecondary }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Line type="monotone" dataKey="pages" stroke={T.accent} strokeWidth={2.5} dot={{ r: 3, fill: T.accent }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
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

/* ---------------------------------------------------------------
   DISCOVER TAB
--------------------------------------------------------------- */
function DiscoverTab({ dark }) {
  const [query, setQuery] = useState("");
  const results = query.length > 0 ? SEARCH_INDEX.filter((b) => b.title.toLowerCase().includes(query.toLowerCase()) || b.author.toLowerCase().includes(query.toLowerCase())) : [];

  return (
    <div className="px-5 pt-6 pb-4">
      <h1 style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }} className="text-3xl font-bold mb-4">Discover</h1>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: dark ? "#8A7C68" : T.textSecondary }} />
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search books, authors..."
          className="w-full pl-10 pr-4 py-3 rounded-full text-sm outline-none"
          style={{ background: dark ? T.surfaceDark : "#fff", color: dark ? T.textLight : T.textPrimary, boxShadow: dark ? "none" : "0 2px 10px rgba(139,94,60,0.08)" }}
        />
      </div>

      {query.length > 0 ? (
        <div className="flex flex-col gap-2 mb-6">
          {results.map((b) => (
            <div key={b.id} className="flex gap-3 items-center p-2.5 rounded-xl" style={{ background: dark ? T.surfaceDark : "#fff" }}>
              <Cover id={b.id} title={b.title} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: dark ? T.textLight : T.textPrimary }}>{b.title}</p>
                <p className="text-xs" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>{b.author} · {b.pages}pg</p>
              </div>
              <button className="p-2 rounded-full" style={{ background: T.bg, color: T.primary }}><Plus size={16} /></button>
            </div>
          ))}
          {results.length === 0 && (
            <button className="text-sm font-medium py-3 rounded-full text-center" style={{ color: T.accent }}>+ Add "{query}" manually</button>
          )}
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: dark ? T.textLight : T.textPrimary }}><Sparkles size={15} color={T.accent} /> Because you liked Circe</h3>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 no-scrollbar">
              {SEARCH_INDEX.slice(10, 13).map((b) => (
                <div key={b.id} className="shrink-0 w-24">
                  <Cover id={b.id} title={b.title} size="lg" />
                  <p className="text-xs mt-1.5 truncate font-medium" style={{ color: dark ? T.textLight : T.textPrimary }}>{b.title}</p>
                </div>
              ))}
            </div>
          </div>

          <h3 className="text-sm font-semibold mb-2" style={{ color: dark ? T.textLight : T.textPrimary }}>Buddy Reads open now</h3>
          <div className="flex flex-col gap-2">
            {BUDDY_READS.map((br) => (
              <div key={br.id} className="p-3.5 rounded-2xl" style={{ background: dark ? T.surfaceDark : "#fff", boxShadow: dark ? "none" : "0 2px 10px rgba(139,94,60,0.08)" }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: dark ? T.textLight : T.textPrimary }}>{br.book}</p>
                    <p className="text-xs" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>hosted by @{br.host} · {br.pace}</p>
                  </div>
                  <span className="text-[11px] px-2 py-1 rounded-full font-medium shrink-0" style={{ background: T.bg, color: T.primary }}>{br.spots} spots</span>
                </div>
                <button className="mt-2.5 w-full py-2 rounded-full text-xs font-medium text-white" style={{ background: T.accent }}>Request to Join</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   CHALLENGES TAB
--------------------------------------------------------------- */
function ChallengesTab({ dark }) {
  return (
    <div className="px-5 pt-6 pb-4">
      <h1 style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }} className="text-3xl font-bold mb-5">Challenges</h1>
      <div className="flex flex-col gap-3">
        {CHALLENGES.map((c) => {
          const pct = (c.progress / c.target) * 100;
          const done = c.progress >= c.target;
          return (
            <div key={c.id} className="p-4 rounded-2xl flex items-center gap-3" style={{ background: dark ? T.surfaceDark : "#fff", boxShadow: dark ? "none" : "0 2px 10px rgba(139,94,60,0.08)" }}>
              <div className="text-3xl w-12 h-12 flex items-center justify-center rounded-2xl shrink-0" style={{ background: done ? T.success : T.bg, opacity: done ? 1 : 0.85 }}>{c.badge}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: dark ? T.textLight : T.textPrimary }}>{c.title}</p>
                <div className="w-full h-2 rounded-full overflow-hidden mt-1.5 mb-1" style={{ background: dark ? "#4a3d2d" : "#EDE3D3" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: done ? T.success : T.accent }} />
                </div>
                <p className="text-[11px]" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>{c.progress} / {c.target} {done && "· Complete! 🎉"}</p>
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
function ProfileTab({ dark, setDark, streak }) {
  return (
    <div className="px-5 pt-6 pb-4">
      <h1 style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }} className="text-3xl font-bold mb-5">Profile</h1>

      <Card dark={dark} className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`, fontFamily: "Playfair Display, serif" }}>
          A
        </div>
        <div>
          <p className="font-semibold" style={{ fontFamily: "Playfair Display, serif", color: dark ? T.textLight : T.textPrimary }}>Aiko Reads</p>
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
          {BADGES.map((b) => (
            <div key={b.id} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl" style={{ background: b.earned ? T.bg : dark ? "#33291c" : "#EDE3D3", opacity: b.earned ? 1 : 0.4 }}>{b.icon}</div>
              <p className="text-[9px] text-center leading-tight" style={{ color: dark ? "#8A7C68" : T.textSecondary }}>{b.name}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card dark={dark} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dark ? <Moon size={18} color={T.textLight} /> : <Sun size={18} color={T.primary} />}
          <span className="text-sm font-medium" style={{ color: dark ? T.textLight : T.textPrimary }}>Dark mode</span>
        </div>
        <button
          onClick={() => setDark(!dark)}
          className="w-12 h-7 rounded-full relative transition"
          style={{ background: dark ? T.accent : "#D9CDB8" }}
        >
          <span className="absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all" style={{ left: dark ? "22px" : "2px" }} />
        </button>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------
   ROOT APP
--------------------------------------------------------------- */
export default function Shelfie() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("shelf");
  const [books, setBooks] = useState(MOCK_LIBRARY);
  const [openBook, setOpenBook] = useState(null);
  const streak = 5;

  const updateBook = (id, patch) => {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    setOpenBook((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const TABS = [
    { id: "shelf", label: "My Shelf", icon: BookOpen },
    { id: "stats", label: "Stats", icon: BarChart3 },
    { id: "discover", label: "Discover", icon: Search },
    { id: "challenges", label: "Challenges", icon: Trophy },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }} className="w-full min-h-screen flex justify-center" >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div
        className="w-full max-w-md min-h-screen relative"
        style={{ background: dark ? T.bgDark : T.bg, transition: "background 0.25s" }}
      >
        {/* streak pill top bar */}
        <div className="sticky top-0 z-10 flex justify-end px-5 pt-4">
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: dark ? T.surfaceDark : "#fff", color: T.accent, boxShadow: dark ? "none" : "0 2px 8px rgba(139,94,60,0.10)" }}>
            <Flame size={13} fill={T.accent} color={T.accent} /> {streak}
          </div>
        </div>

        <div className="pb-24">
          {tab === "shelf" && <ShelfTab dark={dark} books={books} onOpen={setOpenBook} />}
          {tab === "stats" && <StatsTab dark={dark} books={books} />}
          {tab === "discover" && <DiscoverTab dark={dark} />}
          {tab === "challenges" && <ChallengesTab dark={dark} />}
          {tab === "profile" && <ProfileTab dark={dark} setDark={setDark} streak={streak} />}
        </div>

        {/* bottom tab nav */}
        <div
          className="fixed bottom-0 w-full max-w-md flex justify-around items-center py-2.5 z-20"
          style={{ background: dark ? T.surfaceDark : "#fff", borderTop: `1px solid ${dark ? "#4a3d2d" : "#EDE3D3"}` }}
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center gap-0.5 px-2 py-1">
                <Icon size={21} color={active ? T.accent : dark ? "#8A7C68" : T.textSecondary} fill={active && t.id === "shelf" ? "none" : "none"} />
                <span className="text-[10px] font-medium" style={{ color: active ? T.accent : dark ? "#8A7C68" : T.textSecondary }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {openBook && <BookDetail book={openBook} dark={dark} onClose={() => setOpenBook(null)} onUpdate={updateBook} />}
      </div>
    </div>
  );
}
