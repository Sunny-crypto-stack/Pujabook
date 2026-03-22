"use client";

import { useEffect, useState } from "react";
import {
  Users, TrendingUp, Award, Download, RefreshCw,
  Lock, Eye, EyeOff, Briefcase, LogOut,
  CalendarDays, Search,
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  degree: string;
  year: string;
  skills: string[];
  linkedin: string;
  jobTypes: string[];
  createdAt: string;
}

type View = "login" | "dashboard";

export default function AdminPage() {
  const [view, setView] = useState<View>("login");
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/students", {
      headers: { "x-admin-token": tokenInput },
    });
    if (res.ok) {
      setToken(tokenInput);
      setStudents(await res.json());
      setView("dashboard");
    } else {
      setLoginError("Incorrect password.");
    }
  }

  async function refresh() {
    setLoading(true);
    const res = await fetch("/api/students", {
      headers: { "x-admin-token": token },
    });
    if (res.ok) setStudents(await res.json());
    setLoading(false);
  }

  function logout() {
    setView("login");
    setToken("");
    setStudents([]);
    setTokenInput("");
  }

  function exportCSV() {
    const headers = ["Name", "Email", "Phone", "College", "Degree", "Year", "Skills", "Job Types", "LinkedIn", "Joined"];
    const rows = students.map((s) => [
      s.name, s.email, s.phone, s.college, s.degree, s.year,
      s.skills.join(" | "), s.jobTypes.join(" | "), s.linkedin,
      new Date(s.createdAt).toLocaleDateString("en-IN"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Derived stats ──────────────────────────────────────────
  const today = new Date().toDateString();
  const todayCount = students.filter(
    (s) => new Date(s.createdAt).toDateString() === today
  ).length;

  const skillFreq = students
    .flatMap((s) => s.skills)
    .reduce<Record<string, number>>((acc, sk) => {
      acc[sk] = (acc[sk] ?? 0) + 1;
      return acc;
    }, {});
  const topSkills = Object.entries(skillFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const allSkills = ["All", ...Object.keys(skillFreq).sort()];
  const allYears = ["All", ...Array.from(new Set(students.map((s) => s.year))).sort()];

  const filtered = students.filter((s) => {
    const matchSearch =
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.college.toLowerCase().includes(search.toLowerCase());
    const matchSkill = selectedSkill === "All" || s.skills.includes(selectedSkill);
    const matchYear = selectedYear === "All" || s.year === selectedYear;
    return matchSearch && matchSkill && matchYear;
  });

  // ── Login screen ───────────────────────────────────────────
  if (view === "login") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-white">
            <Briefcase className="h-6 w-6 text-indigo-400" />
            <span className="text-lg font-bold">RemoteHireIndia</span>
            <span className="ml-1 rounded bg-indigo-800 px-2 py-0.5 text-xs font-medium text-indigo-300">
              Admin
            </span>
          </div>
          <div className="rounded-2xl bg-slate-900 p-8 ring-1 ring-slate-800">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-900">
              <Lock className="h-5 w-5 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Admin login</h1>
            <p className="mt-1 text-sm text-slate-400">Enter the admin password to continue.</p>

            <form onSubmit={login} className="mt-6 space-y-4">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  required
                  className="w-full rounded-xl bg-slate-800 px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginError && (
                <p className="text-sm text-red-400">{loginError}</p>
              )}
              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Sign in
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-slate-500">
              Default password: <code className="text-slate-300">admin123</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-600" />
            <span className="font-bold text-slate-800">RemoteHireIndia</span>
            <span className="ml-1 rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-indigo-600" />}
            bg="bg-indigo-50"
            label="Total signups"
            value={students.length}
          />
          <StatCard
            icon={<CalendarDays className="h-5 w-5 text-green-600" />}
            bg="bg-green-50"
            label="Joined today"
            value={todayCount}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
            bg="bg-amber-50"
            label="Unique colleges"
            value={new Set(students.map((s) => s.college)).size}
          />
          <StatCard
            icon={<Award className="h-5 w-5 text-purple-600" />}
            bg="bg-purple-50"
            label="Top skill"
            value={topSkills[0]?.[0] ?? "—"}
            small
          />
        </div>

        {/* Top skills */}
        {topSkills.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Top skills across candidates</h2>
            <div className="space-y-2">
              {topSkills.map(([skill, count]) => (
                <div key={skill} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm text-slate-600">{skill}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-2">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: `${(count / students.length) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-slate-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters + table */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text" placeholder="Search name, email, college…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <select
              value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300"
            >
              {allSkills.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select
              value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300"
            >
              {allYears.map((y) => <option key={y}>{y}</option>)}
            </select>
            <span className="ml-auto text-xs text-slate-400">{filtered.length} of {students.length}</span>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              {students.length === 0 ? "No signups yet." : "No results match your filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Name", "Email", "College", "Year", "Skills", "Looking for", "Joined"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {s.name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{s.name}</p>
                            <p className="text-xs text-slate-400">{s.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <a href={`mailto:${s.email}`} className="text-indigo-600 hover:underline">
                          {s.email}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.college}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {s.year}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {s.skills.slice(0, 3).map((sk) => (
                            <span key={sk} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                              {sk}
                            </span>
                          ))}
                          {s.skills.length > 3 && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                              +{s.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {s.jobTypes.join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(s.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, bg, label, value, small }: {
  icon: React.ReactNode; bg: string; label: string; value: number | string; small?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
        {icon}
      </div>
      <p className={`font-extrabold text-slate-900 ${small ? "text-xl" : "text-3xl"}`}>{value}</p>
      <p className="mt-0.5 text-sm text-slate-500">{label}</p>
    </div>
  );
}
