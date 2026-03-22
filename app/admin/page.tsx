"use client";

import { useEffect, useState } from "react";
import {
  Users, TrendingUp, IndianRupee, BookOpen,
  Lock, Eye, EyeOff, LogOut, CheckCircle,
  ChevronDown, ChevronUp, Search, RefreshCw,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Priest {
  id: string;
  name: string;
  phone: string;
  city: string;
  languages: string[];
  ceremonies: string[];
  experience: number;
  price: number;
  bio: string;
  photo_url: string | null;
  verified: boolean;
  created_at: string;
}

interface Booking {
  id: string;
  priest_id: string;
  customer_name: string;
  customer_phone: string;
  ceremony: string;
  booking_date: string;
  booking_time: string;
  address: string;
  amount: number;
  commission: number;
  status: string;
  created_at: string;
  priests?: { name: string; city: string } | null;
}

type Tab = "overview" | "priests" | "bookings" | "revenue";
const BOOKING_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

// ── Password ──────────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = "pujabook2026";
const LS_KEY = "pb_admin_authed";

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: accent ? `${accent}20` : "#fff7ed" }}>
        <span style={{ color: accent ?? "#f97316" }}>{icon}</span>
      </div>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-0.5 text-sm text-slate-500">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-700",
    Confirmed: "bg-blue-100 text-blue-700",
    Completed: "bg-green-100 text-green-700",
    Cancelled: "bg-red-100 text-red-600",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [priests, setPriests] = useState<Priest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedPriest, setExpandedPriest] = useState<string | null>(null);
  const [priestSearch, setPriestSearch] = useState("");
  const [priestCityFilter, setPriestCityFilter] = useState("All");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("All");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(LS_KEY) === "1") {
      setAuthed(true);
    }
  }, []);

  // Load data when authed
  useEffect(() => {
    if (authed) loadData();
  }, [authed]);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const [{ data: priestData }, { data: bookingData }] = await Promise.all([
      supabase.from("priests").select("*").order("created_at", { ascending: false }),
      supabase
        .from("bookings")
        .select("*, priests(name, city)")
        .order("created_at", { ascending: false }),
    ]);
    setPriests(priestData ?? []);
    setBookings(bookingData ?? []);
    setLoading(false);
  }

  function login(e: React.FormEvent) {
    e.preventDefault();
    if (pwInput === ADMIN_PASSWORD) {
      localStorage.setItem(LS_KEY, "1");
      setAuthed(true);
      setLoginError("");
    } else {
      setLoginError("Incorrect password.");
    }
  }

  function logout() {
    localStorage.removeItem(LS_KEY);
    setAuthed(false);
    setPwInput("");
    setPriests([]);
    setBookings([]);
  }

  async function verifyPriest(priestId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("priests").update({ verified: true }).eq("id", priestId);
    if (!error) setPriests((prev) => prev.map((p) => p.id === priestId ? { ...p, verified: true } : p));
  }

  async function updateBookingStatus(bookingId: string, status: string) {
    const supabase = createClient();
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
    if (!error) setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status } : b));
  }

  // ── Stats derived ──────────────────────────────────────────────────────────

  const totalPriests = priests.length;
  const verifiedPriests = priests.filter((p) => p.verified).length;
  const totalBookings = bookings.length;

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const revenueThisMonth = bookings
    .filter((b) => new Date(b.created_at) >= thisMonth && b.status !== "Cancelled")
    .reduce((sum, b) => sum + (b.commission ?? 0), 0);

  const priestCities = ["All", ...Array.from(new Set(priests.map((p) => p.city))).sort()];

  const filteredPriests = priests.filter((p) => {
    const cityOk = priestCityFilter === "All" || p.city === priestCityFilter;
    const searchOk =
      !priestSearch ||
      p.name.toLowerCase().includes(priestSearch.toLowerCase()) ||
      p.city.toLowerCase().includes(priestSearch.toLowerCase());
    return cityOk && searchOk;
  });

  const filteredBookings = bookings.filter((b) =>
    bookingStatusFilter === "All" || b.status === bookingStatusFilter
  );

  // ── Monthly revenue breakdown ──────────────────────────────────────────────

  const monthlyMap: Record<string, { bookings: number; gross: number; commission: number }> = {};
  bookings
    .filter((b) => b.status !== "Cancelled")
    .forEach((b) => {
      const d = new Date(b.created_at);
      const key = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      if (!monthlyMap[key]) monthlyMap[key] = { bookings: 0, gross: 0, commission: 0 };
      monthlyMap[key].bookings += 1;
      monthlyMap[key].gross += b.amount ?? 0;
      monthlyMap[key].commission += b.commission ?? 0;
    });
  const monthlyRows = Object.entries(monthlyMap).slice(0, 12);

  // ── Login screen ───────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6" style={{ backgroundColor: "#1e1b18" }}>
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <span className="text-3xl font-black" style={{ color: "#f97316" }}>PujaBook</span>
            <p className="mt-1 text-sm text-slate-400">Admin Dashboard</p>
          </div>
          <div className="rounded-2xl p-8" style={{ backgroundColor: "#292524", border: "1px solid #44403c" }}>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full mx-auto" style={{ backgroundColor: "#431407" }}>
              <Lock className="h-5 w-5" style={{ color: "#f97316" }} />
            </div>
            <h1 className="text-xl font-bold text-white text-center">Admin Login</h1>
            <p className="mt-1 text-sm text-slate-400 text-center mb-6">Enter the admin password to continue.</p>
            <form onSubmit={login} className="space-y-4">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Password"
                  value={pwInput}
                  onChange={(e) => setPwInput(e.target.value)}
                  required
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 outline-none"
                  style={{ backgroundColor: "#1c1917", border: "1px solid #57534e" }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginError && <p className="text-sm text-red-400">{loginError}</p>}
              <button type="submit"
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                style={{ backgroundColor: "#f97316" }}>
                Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <TrendingUp className="h-4 w-4" /> },
    { id: "priests", label: "Priests", icon: <Users className="h-4 w-4" /> },
    { id: "bookings", label: "Bookings", icon: <BookOpen className="h-4 w-4" /> },
    { id: "revenue", label: "Revenue", icon: <IndianRupee className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 flex-col flex transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:flex`}
        style={{ backgroundColor: "#1c1917" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-stone-800">
          <span className="text-xl font-black" style={{ color: "#f97316" }}>PujaBook</span>
          <span className="rounded px-1.5 py-0.5 text-xs font-medium text-orange-300" style={{ backgroundColor: "#431407" }}>Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors
                ${activeTab === t.id ? "text-white" : "text-stone-400 hover:text-white hover:bg-stone-800"}`}
              style={activeTab === t.id ? { backgroundColor: "#f97316" } : {}}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-4 pb-6">
          <button onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-stone-400 hover:text-red-400 transition-colors">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1 rounded text-slate-500" onClick={() => setSidebarOpen(true)}>
              <div className="space-y-1">
                <div className="h-0.5 w-5 bg-slate-600" />
                <div className="h-0.5 w-5 bg-slate-600" />
                <div className="h-0.5 w-5 bg-slate-600" />
              </div>
            </button>
            <h1 className="text-lg font-bold text-slate-900">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h1>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        <main className="flex-1 p-6 space-y-6 max-w-6xl w-full">

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<Users className="h-5 w-5" />} label="Total Priests" value={totalPriests} />
                <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Verified Priests" value={verifiedPriests} accent="#16a34a" />
                <StatCard icon={<BookOpen className="h-5 w-5" />} label="Total Bookings" value={totalBookings} accent="#2563eb" />
                <StatCard icon={<IndianRupee className="h-5 w-5" />} label="Revenue This Month" value={`₹${revenueThisMonth.toLocaleString("en-IN")}`} sub="Commission (15%)" accent="#7c2d12" />
              </div>

              {/* Recent bookings */}
              <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">Recent Bookings</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {["Customer", "Ceremony", "Priest", "Date", "Amount", "Status"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bookings.slice(0, 5).map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{b.customer_name}</td>
                          <td className="px-4 py-3 text-slate-600">{b.ceremony}</td>
                          <td className="px-4 py-3 text-slate-600">{(b.priests as any)?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {new Date(b.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </td>
                          <td className="px-4 py-3 font-semibold" style={{ color: "#f97316" }}>₹{b.amount?.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                        </tr>
                      ))}
                      {bookings.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No bookings yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent priest registrations */}
              <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">Recent Priest Registrations</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {["Name", "City", "Ceremonies", "Price", "Verified", "Joined"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {priests.slice(0, 5).map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                          <td className="px-4 py-3 text-slate-600">{p.city}</td>
                          <td className="px-4 py-3 text-slate-500">{p.ceremonies.length} ceremonies</td>
                          <td className="px-4 py-3 font-semibold" style={{ color: "#f97316" }}>₹{p.price?.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3">
                            {p.verified
                              ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">✓ Yes</span>
                              : <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">Pending</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </td>
                        </tr>
                      ))}
                      {priests.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No priests yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── PRIESTS ── */}
          {activeTab === "priests" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text" placeholder="Search name or city…"
                    value={priestSearch} onChange={(e) => setPriestSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-orange-300"
                  />
                </div>
                <select value={priestCityFilter} onChange={(e) => setPriestCityFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-orange-300">
                  {priestCities.map((c) => <option key={c}>{c}</option>)}
                </select>
                <span className="ml-auto flex items-center text-xs text-slate-400">{filteredPriests.length} priests</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Priest", "City", "Phone", "Ceremonies", "Price", "Status", "Joined", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPriests.map((p) => (
                      <>
                        <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: "#c2410c" }}>
                                {p.name[0]}
                              </div>
                              <span className="font-medium text-slate-800">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{p.city}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{p.phone}</td>
                          <td className="px-4 py-3 text-slate-600">{p.ceremonies.length}</td>
                          <td className="px-4 py-3 font-semibold" style={{ color: "#f97316" }}>₹{p.price?.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3">
                            {p.verified
                              ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">✓ Verified</span>
                              : <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">Unverified</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {!p.verified && (
                                <button onClick={() => verifyPriest(p.id)}
                                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                                  style={{ backgroundColor: "#16a34a" }}>
                                  Verify
                                </button>
                              )}
                              <button
                                onClick={() => setExpandedPriest(expandedPriest === p.id ? null : p.id)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1"
                              >
                                {expandedPriest === p.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedPriest === p.id && (
                          <tr key={`${p.id}-detail`} className="bg-orange-50 border-b border-orange-100">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Bio</p>
                                  <p className="text-sm text-slate-600">{p.bio || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Languages</p>
                                  <div className="flex flex-wrap gap-1">
                                    {p.languages.map((l) => (
                                      <span key={l} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{l}</span>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">All Ceremonies</p>
                                  <div className="flex flex-wrap gap-1">
                                    {p.ceremonies.map((c) => (
                                      <span key={c} className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">{c}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {filteredPriests.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No priests found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── BOOKINGS ── */}
          {activeTab === "bookings" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
              {/* Filter */}
              <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4 items-center">
                <label className="text-sm font-medium text-slate-600">Filter by status:</label>
                <div className="flex flex-wrap gap-2">
                  {["All", ...BOOKING_STATUSES].map((s) => (
                    <button
                      key={s}
                      onClick={() => setBookingStatusFilter(s)}
                      className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                      style={bookingStatusFilter === s
                        ? { backgroundColor: "#f97316", borderColor: "#f97316", color: "white" }
                        : { borderColor: "#e5e7eb", color: "#6b7280" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <span className="ml-auto text-xs text-slate-400">{filteredBookings.length} bookings</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Priest", "Customer", "Ceremony", "Date & Time", "Amount", "Commission", "Status"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-800">{(b.priests as any)?.name ?? "—"}</p>
                            <p className="text-xs text-slate-400">{(b.priests as any)?.city}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-800">{b.customer_name}</p>
                            <p className="text-xs text-slate-400">{b.customer_phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{b.ceremony}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          <p>{new Date(b.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                          <p>{b.booking_time}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: "#f97316" }}>₹{b.amount?.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 font-semibold text-green-700">₹{b.commission?.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3">
                          <select
                            value={b.status}
                            onChange={(e) => updateBookingStatus(b.id, e.target.value)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-orange-300"
                          >
                            {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                    {filteredBookings.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No bookings found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── REVENUE ── */}
          {activeTab === "revenue" && (
            <>
              {/* Summary cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                {(() => {
                  const validBookings = bookings.filter((b) => b.status !== "Cancelled");
                  const gross = validBookings.reduce((s, b) => s + (b.amount ?? 0), 0);
                  const commission = validBookings.reduce((s, b) => s + (b.commission ?? 0), 0);
                  return (
                    <>
                      <StatCard icon={<BookOpen className="h-5 w-5" />} label="Total Bookings (non-cancelled)" value={validBookings.length} accent="#2563eb" />
                      <StatCard icon={<IndianRupee className="h-5 w-5" />} label="Total Gross Amount" value={`₹${gross.toLocaleString("en-IN")}`} accent="#f97316" />
                      <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Total Commission (15%)" value={`₹${commission.toLocaleString("en-IN")}`} accent="#16a34a" />
                    </>
                  );
                })()}
              </div>

              {/* Monthly breakdown */}
              <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">Monthly Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {["Month", "Bookings", "Gross Amount", "Commission Earned"].map((h) => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {monthlyRows.map(([month, data]) => (
                        <tr key={month} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-800">{month}</td>
                          <td className="px-6 py-4 text-slate-600">{data.bookings}</td>
                          <td className="px-6 py-4 font-semibold" style={{ color: "#f97316" }}>₹{data.gross.toLocaleString("en-IN")}</td>
                          <td className="px-6 py-4 font-semibold text-green-700">₹{data.commission.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                      {monthlyRows.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">No revenue data yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}
