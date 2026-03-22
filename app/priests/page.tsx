"use client";

import { useState, useEffect } from "react";
import { MapPin, ArrowRight, Search } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Priest {
  id: string;
  name: string;
  city: string;
  ceremonies: string[];
  languages: string[];
  experience: number;
  price: number;
  bio: string;
  photo_url: string | null;
  verified: boolean;
}

const CITIES = ["All Cities", "Hyderabad", "Bangalore", "Mumbai"];

function PriestAvatar({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="h-16 w-16 rounded-full object-cover"
      />
    );
  }
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
      style={{ backgroundColor: "#c2410c" }}>
      {initials}
    </div>
  );
}

export default function PriestsPage() {
  const [priests, setPriests] = useState<Priest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("All Cities");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("priests")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPriests(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = priests.filter((p) => {
    const cityMatch = city === "All Cities" || p.city === city;
    const searchMatch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.ceremonies.some((c) => c.toLowerCase().includes(search.toLowerCase()));
    return cityMatch && searchMatch;
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fffbf5" }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="text-xl font-black" style={{ color: "#f97316" }}>PujaBook</a>
          <a href="/#for-priests" className="rounded-full px-5 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "#f97316" }}>
            Register as Priest
          </a>
        </div>
      </nav>

      {/* Header */}
      <div className="px-6 py-12 text-white text-center"
        style={{ background: "linear-gradient(135deg, #7c2d12 0%, #c2410c 60%, #f97316 100%)" }}>
        <h1 className="text-3xl font-black md:text-4xl">Find a Priest</h1>
        <p className="mt-2 text-orange-100">Verified priests across Hyderabad, Bangalore &amp; Mumbai</p>
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-40 border-b border-orange-100 bg-white px-6 py-4">
        <div className="mx-auto max-w-5xl space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-300" />
            <input
              type="text"
              placeholder="Search by name or ceremony…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-orange-100 bg-orange-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-400"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CITIES.map((c) => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
                style={city === c
                  ? { backgroundColor: "#f97316", borderColor: "#f97316", color: "white" }
                  : { borderColor: "#fed7aa", color: "#78716c", backgroundColor: "#fff7ed" }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        <p className="mb-6 text-sm text-slate-500">
          {loading ? "Loading…" : `${filtered.length} priest${filtered.length !== 1 ? "s" : ""} found`}
        </p>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-orange-50" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-4xl">🙏</p>
            <p className="mt-4 text-lg font-semibold text-slate-700">No priests found</p>
            <p className="mt-2 text-sm text-slate-400">Try a different city or search term</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((priest) => (
              <div key={priest.id}
                className="rounded-2xl border bg-white p-5 transition-shadow hover:shadow-md"
                style={{ borderColor: "#fed7aa" }}>
                <div className="flex items-start gap-4">
                  <PriestAvatar photoUrl={priest.photo_url} name={priest.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900">{priest.name}</h3>
                      {priest.verified && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> {priest.city} · {priest.experience} yrs exp
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {priest.languages.join(" · ")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-black" style={{ color: "#f97316" }}>
                      ₹{priest.price.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-slate-400">/ ceremony</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {priest.ceremonies.slice(0, 3).map((c) => (
                    <span key={c}
                      className="rounded-full border px-2.5 py-1 text-xs font-medium"
                      style={{ borderColor: "#fed7aa", color: "#92400e", backgroundColor: "#fff7ed" }}>
                      {c}
                    </span>
                  ))}
                  {priest.ceremonies.length > 3 && (
                    <span className="rounded-full border px-2.5 py-1 text-xs text-slate-400"
                      style={{ borderColor: "#e5e7eb" }}>
                      +{priest.ceremonies.length - 3} more
                    </span>
                  )}
                </div>

                {priest.bio && (
                  <p className="mt-3 text-xs leading-relaxed text-slate-500 line-clamp-2">{priest.bio}</p>
                )}

                <button
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                  style={{ backgroundColor: "#f97316" }}
                >
                  Book Now <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
