import React, { useState, useRef, useEffect } from "react";
import {
  Users,
  Sprout,
  BookOpen,
  TrendingUp,
  UserCircle2,
  Leaf,
  Camera,
  Phone,
  MessageCircle,
  CloudRainWind,
  Clock,
  Send,
  ChevronDown,
  Lightbulb,
  Handshake,
  ShoppingBasket,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";

/* ---------- Gemini config ---------- */
// Test-only: NEVER publish this key. Later move the call to a backend (e.g. FastAPI).
const GEMINI_API_KEY = "";
// gemini-1.5-flash is retired (404). This alias always points to the current Flash model.
const GEMINI_MODEL = "gemini-flash-latest";
const PROMPT =
  "তুমি একজন অভিজ্ঞ কৃষি বিশেষজ্ঞ। এই ফসলের ছবি দেখে বাংলায় বলো ফসলে কী রোগ হয়েছে এবং এর সমাধান কী।";

// MVP: hardcoded dummy weather (no geolocation / weather API). Gemini still writes the warning.
const MOCK_WEATHER = { place: "ফেনী, বাংলাদেশ", condition: "রৌদ্রোজ্জ্বল (Sunny)", temp: "32°C" };
const DEFAULT_WARNING = "আজকের আবহাওয়ার তথ্য পাওয়া যায়নি। আকাশ মেঘলা মনে হলে ক্ষেতের ড্রেনেজ পরিষ্কার রাখুন।";

/* ---------- Mock data ---------- */
const INITIAL_POSTS = [
  {
    id: 1,
    category: "rent",
    author: "রহিম উদ্দিন",
    place: "ফেনী সদর",
    time: "২ ঘণ্টা আগে",
    text: "আগামীকাল আমার ট্রাক্টর ফ্রি আছে। কেউ ভাড়া নিতে চাইলে যোগাযোগ করুন।",
  },
  {
    id: 2,
    category: "rent",
    author: "করিম মিয়া",
    place: "দাগনভূঞা",
    time: "৫ ঘণ্টা আগে",
    text: "কাল সকালে পিকআপ ভ্যান নিয়ে বড় বাজারে যাব। ট্রাকে জায়গা আছে, কারো সবজি থাকলে একসাথে পাঠাতে পারেন।",
  },
];

const CATEGORIES = [
  { id: "advice", label: "পরামর্শ (Advice)", short: "পরামর্শ", Icon: Lightbulb, badge: "bg-sky-100 text-sky-800", avatar: "bg-sky-100 text-sky-700" },
  { id: "rent", label: "ভাড়া/শেয়ার (Rent/Share)", short: "ভাড়া/শেয়ার", Icon: Handshake, badge: "bg-amber-100 text-amber-800", avatar: "bg-amber-100 text-amber-700" },
  { id: "sell", label: "বিক্রি (Sell)", short: "বিক্রি", Icon: ShoppingBasket, badge: "bg-emerald-100 text-emerald-800", avatar: "bg-emerald-100 text-emerald-700" },
];

const TABS = [
  { id: "community", label: "কমিউনিটি", Icon: Users },
  { id: "ai", label: "স্মার্ট কৃষি", Icon: Sprout },
  { id: "ledger", label: "ডিজিটাল খাতা", Icon: BookOpen },
  { id: "market", label: "বাজার দর", Icon: TrendingUp },
];

/* ---------- Top App Bar ---------- */
function TopBar() {
  return (
    <header className="sticky top-0 z-30 bg-emerald-600 text-white shadow-md">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <Leaf className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">কৃষি-হাব</h1>
        </div>
        <button
          aria-label="প্রোফাইল"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 active:scale-95 transition"
        >
          <UserCircle2 className="h-8 w-8" />
        </button>
      </div>
    </header>
  );
}

/* ---------- Bottom Navigation ---------- */
function BottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <button
                onClick={() => onChange(id)}
                aria-current={isActive ? "page" : undefined}
                className="flex w-full flex-col items-center gap-1 px-1 py-2.5 active:scale-95 transition"
              >
                <span
                  className={`flex h-9 w-14 items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-emerald-100 text-emerald-700" : "text-gray-500"
                  }`}
                >
                  <Icon className="h-6 w-6" strokeWidth={isActive ? 2.6 : 2} />
                </span>
                <span
                  className={`text-[13px] leading-tight ${
                    isActive ? "font-bold text-emerald-700" : "font-medium text-gray-500"
                  }`}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---------- Tab 1: Community ---------- */
function PostCard({ post }) {
  const cat = CATEGORIES.find((c) => c.id === post.category) || CATEGORIES[1];
  const Icon = cat.Icon;

  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${cat.avatar}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-gray-900">{post.author}</p>
          <p className="text-sm text-gray-500">
            {post.place} • {post.time}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${cat.badge}`}>
          {cat.short}
        </span>
      </div>

      <p className="mt-3 text-lg leading-relaxed text-gray-800">{post.text}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-lg font-bold text-white active:scale-95 active:bg-emerald-700 transition">
          <Phone className="h-5 w-5" />
          কল করুন
        </button>
        <button className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 text-lg font-bold text-emerald-700 active:scale-95 active:bg-emerald-50 transition">
          <MessageCircle className="h-5 w-5" />
          মেসেজ
        </button>
      </div>
    </article>
  );
}

function CommunityTab() {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("advice");

  const submit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setPosts([
      {
        id: Date.now(),
        category,
        author: "আপনি",
        place: "আপনার এলাকা",
        time: "এইমাত্র",
        text: value,
      },
      ...posts,
    ]);
    setText("");
  };

  return (
    <div className="space-y-4">
      {/* Create Post */}
      <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        {/* Category dropdown */}
        <div>
          <label htmlFor="post-category" className="mb-1.5 block text-sm font-semibold text-gray-600">
            পোস্টের ধরন
          </label>
          <div className="relative">
            <select
              id="post-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-12 w-full appearance-none rounded-xl bg-gray-50 pl-4 pr-11 text-lg font-medium text-gray-800 outline-none ring-1 ring-gray-200 transition focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        {/* Text input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="আপনার কী প্রয়োজন বা শেয়ার করতে চান?"
          className="w-full resize-none rounded-xl bg-gray-50 p-3 text-lg text-gray-800 placeholder-gray-400 outline-none ring-1 ring-gray-200 transition focus:bg-white focus:ring-2 focus:ring-emerald-500"
        />

        <button
          type="submit"
          disabled={!text.trim()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-lg font-bold text-white transition active:scale-[0.98] disabled:bg-gray-300"
        >
          <Send className="h-5 w-5" />
          পোস্ট করুন
        </button>
      </form>

      {/* Feed */}
      <h2 className="px-1 pt-1 text-xl font-bold text-gray-800">সাম্প্রতিক পোস্ট</h2>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}

/* ---------- Tab 2: Smart AI ---------- */
function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // result looks like "data:image/jpeg;base64,XXXX" -> keep only the XXXX part
      const base64 = String(reader.result).split(",")[1];
      resolve({ inlineData: { data: base64, mimeType: file.type || "image/jpeg" } });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------- Markdown styling (no typography plugin needed) ---------- */
const Heading = ({ children }) => (
  <h4 className="mb-1 mt-4 text-lg font-bold text-emerald-800 first:mt-1">{children}</h4>
);
const mdComponents = {
  h1: Heading,
  h2: Heading,
  h3: Heading,
  h4: Heading,
  p: ({ children }) => <p className="mt-2 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mt-2 list-disc space-y-1.5 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1.5 pl-6">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
  hr: () => <hr className="my-3 border-emerald-200" />,
};

/* ---------- Dynamic weather warning ---------- */
let warningPromise = null; // cached so switching tabs doesn't re-call the APIs

async function loadWarning() {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY_HERE") throw new Error("no gemini key");

    const { place, condition, temp } = MOCK_WEATHER;
    const date = new Date().toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });

    const prompt = `তুমি একজন কৃষি বিশেষজ্ঞ। আজ ${date}, এলাকার নাম ${place}। বর্তমান আবহাওয়া: ${condition}, তাপমাত্রা: ${temp}। এই আবহাওয়ার ওপর ভিত্তি করে কৃষকদের জন্য ১-২ লাইনের একটি খুব শর্ট এবং স্পেসিফিক সতর্কবার্তা বা পরামর্শ বাংলায় লেখো।`;

    const model = new GoogleGenerativeAI(GEMINI_API_KEY).getGenerativeModel({ model: GEMINI_MODEL });
    const out = await model.generateContent(prompt);
    const text = out.response.text().replace(/\*\*/g, "").trim();
    return { status: "ready", text, place, condition, temp };
  } catch (err) {
    console.error("Weather warning failed:", err);
    return { status: "fallback", text: DEFAULT_WARNING };
  }
}

function WeatherWarning() {
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let alive = true;
    warningPromise = warningPromise || loadWarning();
    warningPromise.then((r) => alive && setState(r));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      role="alert"
      className="flex gap-3 rounded-2xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-orange-50 p-4 shadow-sm"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
        <CloudRainWind className="h-7 w-7" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold uppercase tracking-wide text-red-600">আগাম সতর্কবার্তা</p>

        {state.status === "loading" && (
          <p className="mt-1 flex items-center gap-2 text-lg font-medium text-red-900">
            <Loader2 className="h-5 w-5 animate-spin" />
            লোকাল আবহাওয়া ফেচ করা হচ্ছে...
          </p>
        )}

        {state.status === "ready" && (
          <>
            <p className="mt-0.5 text-sm font-medium text-red-700">
              {state.place} • {state.condition} • {state.temp}
            </p>
            <p className="mt-1 text-lg font-semibold leading-relaxed text-red-900">{state.text}</p>
          </>
        )}

        {state.status === "fallback" && (
          <p className="mt-1 text-lg font-semibold leading-relaxed text-red-900">{state.text}</p>
        )}
      </div>
    </div>
  );
}

function SmartAITab() {
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null); // Gemini's real answer
  const [error, setError] = useState("");

  const analyze = async (file) => {
    setError("");
    setResult(null);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
        throw new Error("API key সেট করা হয়নি।");
      }
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const imagePart = await fileToGenerativePart(file);
      const response = await model.generateContent([PROMPT, imagePart]);
      setResult(response.response.text());
    } catch (err) {
      console.error(err);
      setError(
        err.message === "API key সেট করা হয়নি।"
          ? err.message
          : "দুঃখিত, এআই উত্তর দিতে পারেনি। ইন্টারনেট বা API key ঠিক আছে কিনা দেখুন, তারপর আবার চেষ্টা করুন।"
      );
    } finally {
      setLoading(false);
    }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (f) analyze(f);
    e.target.value = ""; // allow picking the same photo again
  };

  return (
    <div className="space-y-4">
      {/* Early Warning (dynamic) */}
      <WeatherWarning />

      {/* Main Action */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="flex w-full flex-col items-center gap-3 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 px-6 py-8 text-white shadow-lg transition active:scale-[0.98] disabled:opacity-70"
      >
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30">
          {loading ? <Loader2 className="h-11 w-11 animate-spin" /> : <Camera className="h-11 w-11" />}
        </span>
        <span className="text-2xl font-bold leading-snug">
          {loading ? "এআই বিশ্লেষণ করছে..." : "ফসলের রোগের ছবি তুলুন"}
        </span>
        <span className="rounded-full bg-white/20 px-4 py-1 text-base font-medium">
          {loading ? "(Loading...)" : "(এআই সমাধান)"}
        </span>
      </button>

      {/* Recent Diagnosis */}
      <h2 className="px-1 pt-1 text-xl font-bold text-gray-800">সাম্প্রতিক রোগ নির্ণয়</h2>
      <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center gap-4 p-4">
          {preview ? (
            <img src={preview} alt="আপনার তোলা ছবি" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <Leaf className="h-11 w-11" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm text-gray-500">{preview ? "আপনার ছবি" : "নমুনা ছবি"}</p>
            <p className="text-sm text-gray-500">রোগ</p>
            <p className="text-xl font-bold text-red-600">
              {loading ? "বিশ্লেষণ চলছে..." : preview && result ? "এআই রিপোর্ট নিচে" : preview && error ? "—" : "লেট ব্লাইট (আলু)"}
            </p>
          </div>
        </div>

        <div className="border-t border-emerald-100 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-base font-bold text-emerald-800">
            <Sprout className="h-5 w-5" />
            এআই সমাধান
          </p>

          {loading && (
            <div className="mt-3 flex items-center gap-3 text-lg text-gray-700">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              অপেক্ষা করুন, ছবি দেখা হচ্ছে...
            </div>
          )}

          {!loading && error && (
            <p className="mt-2 flex items-start gap-2 text-lg leading-relaxed text-red-700">
              <AlertCircle className="mt-1 h-5 w-5 shrink-0" />
              {error}
            </p>
          )}

          {!loading && !error && result && (
            <div className="mt-1 text-lg text-gray-800">
              <ReactMarkdown components={mdComponents}>{result}</ReactMarkdown>
            </div>
          )}

          {!loading && !error && !result && (
            <p className="mt-1 text-lg leading-relaxed text-gray-800">
              জমিতে রিডোমিল গোল্ড বা ম্যানকোজেব স্প্রে করুন।
            </p>
          )}
        </div>
      </article>
    </div>
  );
}

/* ---------- Tabs 3 & 4: Placeholder ---------- */
function ComingSoon({ title, subtitle }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Clock className="h-14 w-14" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-gray-800">{title}</h2>
      <p className="mt-2 text-xl font-semibold text-emerald-700">খুব শিগগিরই আসছে...</p>
      <p className="text-sm text-gray-400">(Upcoming Feature)</p>
      <p className="mt-4 max-w-xs text-lg leading-relaxed text-gray-600">{subtitle}</p>
    </div>
  );
}

/* ---------- App ---------- */
export default function KrishiHub() {
  const [tab, setTab] = useState("community");

  const content = {
    community: <CommunityTab />,
    ai: <SmartAITab />,
    ledger: (
      <ComingSoon
        title="ডিজিটাল খাতা"
        subtitle="আপনার ফসলের খরচ, আয় ও বাকির হিসাব এক জায়গায় সহজে লিখে রাখুন।"
      />
    ),
    market: (
      <ComingSoon
        title="বাজার দর"
        subtitle="আপনার এলাকার বাজারে ফসলের আজকের দাম জানুন, সঠিক দামে বিক্রি করুন।"
      />
    ),
  };

  return (
    <div
      className="min-h-screen bg-gray-50 text-gray-900"
      style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif" }}
    >
      {/* Bengali font + tab animation */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
        @keyframes kh-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .kh-fade { animation: kh-fade .25s ease-out; }
      `}</style>

      <TopBar />

      <main className="mx-auto max-w-md px-4 pb-28 pt-4">
        <div key={tab} className="kh-fade">
          {content[tab]}
        </div>
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
