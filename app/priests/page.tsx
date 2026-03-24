"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, ArrowRight, Search, X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

interface Priest {
  id: string;
  name: string;
  city: string;
  phone: string;
  ceremonies: string[];
  languages: string[];
  experience: number;
  price: number;
  bio: string;
  photo_url: string | null;
  verified: boolean;
  upi_id: string | null;
}

const CITIES = [
  "All Cities",
  "Hyderabad",
  "Bangalore",
  "Mumbai",
  "Delhi",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Surat",
  "Lucknow",
  "Kanpur",
  "Nagpur",
  "Indore",
  "Bhopal",
  "Patna",
  "Vadodara",
  "Visakhapatnam",
  "Ludhiana",
  "Agra",
  "Varanasi",
  "Prayagraj",
  "Amritsar",
  "Chandigarh",
  "Coimbatore",
  "Kochi",
  "Bhubaneswar",
  "Guwahati",
  "Noida",
  "Gurugram",
  "Nashik",
  "Mysore",
  "Thiruvananthapuram",
  "Mangalore",
  "Dehradun",
  "Ranchi",
  "Raipur",
  "Jodhpur",
  "Madurai",
  "Vijayawada",
];

const TIME_SLOTS = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "4:00 PM", "5:00 PM", "6:00 PM",
];

function getNext14Days(): { label: string; value: string; dayName: string }[] {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });
    const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    days.push({ label, value, dayName });
  }
  return days;
}

function PriestAvatar({ photoUrl, name, size = "md" }: { photoUrl: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-10 w-10 text-sm", md: "h-16 w-16 text-xl", lg: "h-20 w-20 text-2xl" };
  const imgSizes = { sm: "h-10 w-10", md: "h-16 w-16", lg: "h-20 w-20" };
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${imgSizes[size]} rounded-full object-cover`}
      />
    );
  }
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div
      className={`flex ${sizes[size]} items-center justify-center rounded-full font-bold text-white`}
      style={{ backgroundColor: "#c2410c" }}
    >
      {initials}
    </div>
  );
}

interface BookingModalProps {
  priest: Priest;
  onClose: () => void;
}

function BookingModal({ priest, onClose }: BookingModalProps) {
  const days = getNext14Days();
  const [ceremony, setCeremony] = useState(priest.ceremonies[0] ?? "");
  const [selectedDate, setSelectedDate] = useState(days[0].value);
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const dateScrollRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTime) { setError("Please select a time slot."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priest_id: priest.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          ceremony,
          booking_date: selectedDate,
          booking_time: selectedTime,
          address,
          amount: priest.price,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBookingId(data.booking_id ?? null);
        setSuccess(true);
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl"
        style={{ borderTop: "4px solid #f97316" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-orange-100 bg-white px-5 py-4">
          <PriestAvatar photoUrl={priest.photo_url} name={priest.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate">{priest.name}</p>
            <p className="text-xs text-slate-500">{priest.city} · ₹{priest.price.toLocaleString("en-IN")} / ceremony</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Booking Confirmed!</h2>
            <p className="mt-2 text-sm text-slate-500">
              Your booking for <span className="font-semibold text-orange-600">{ceremony}</span> with{" "}
              <span className="font-semibold">{priest.name}</span> is confirmed for{" "}
              {new Date(selectedDate).toLocaleDateString("en-IN", { day: "numeric", month: "long" })} at {selectedTime}.
            </p>
            {bookingId && (
              <p className="mt-2 text-xs text-slate-400">Booking ID: <span className="font-mono font-semibold text-slate-600">{bookingId}</span></p>
            )}
            <div className="mt-6 w-full rounded-xl p-4 text-sm" style={{ backgroundColor: "#fff7ed", borderColor: "#fed7aa", border: "1px solid #fed7aa" }}>
              <p className="font-semibold" style={{ color: "#92400e" }}>Payment Instructions</p>
              {priest.upi_id ? (
                <p className="mt-1" style={{ color: "#78350f" }}>
                  Send <strong>₹{priest.price.toLocaleString("en-IN")}</strong> to{" "}
                  <strong>{priest.upi_id}</strong> via PhonePe / GPay / Paytm to confirm your booking.
                  {bookingId && <> Use Booking ID <strong>{bookingId}</strong> as the payment note.</>}
                </p>
              ) : (
                <p className="mt-1" style={{ color: "#78350f" }}>
                  Contact the priest directly at <strong>{priest.phone}</strong> to arrange payment of{" "}
                  <strong>₹{priest.price.toLocaleString("en-IN")}</strong>.
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "#f97316" }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
            {/* Ceremony */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ceremony</label>
              <select
                value={ceremony}
                onChange={(e) => setCeremony(e.target.value)}
                required
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-orange-400"
                style={{ borderColor: "#fed7aa", backgroundColor: "#fff7ed" }}
              >
                {priest.ceremonies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Date picker */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Select Date</label>
              <div ref={dateScrollRef} className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {days.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setSelectedDate(d.value)}
                    className="flex flex-col items-center flex-shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition-colors min-w-[56px]"
                    style={selectedDate === d.value
                      ? { backgroundColor: "#f97316", borderColor: "#f97316", color: "white" }
                      : { borderColor: "#fed7aa", backgroundColor: "#fff7ed", color: "#78716c" }}
                  >
                    <span className="text-xs opacity-75">{d.dayName}</span>
                    <span className="text-sm font-bold">{d.label.split(" ")[0]}</span>
                    <span className="text-xs opacity-75">{d.label.split(" ")[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time picker */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Select Time</label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTime(t)}
                    className="rounded-xl border py-2.5 text-xs font-medium transition-colors"
                    style={selectedTime === t
                      ? { backgroundColor: "#f97316", borderColor: "#f97316", color: "white" }
                      : { borderColor: "#fed7aa", backgroundColor: "#fff7ed", color: "#78716c" }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer details */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Your Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-orange-400"
                style={{ borderColor: "#fed7aa" }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-orange-400"
                style={{ borderColor: "#fed7aa" }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Address</label>
              <textarea
                placeholder="Full address where the ceremony will be held"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={3}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-orange-400 resize-none"
                style={{ borderColor: "#fed7aa" }}
              />
            </div>

            {/* Payment note */}
            <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa" }}>
              <p className="font-semibold" style={{ color: "#92400e" }}>Payment</p>
              <p className="mt-1" style={{ color: "#78350f" }}>
                After booking, send <strong>₹{priest.price.toLocaleString("en-IN")}</strong> to the priest via any UPI app (PhonePe, GPay, Paytm).
              </p>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#f97316" }}
            >
              {submitting ? "Confirming…" : "Confirm Booking"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function PriestsPage() {
  const [priests, setPriests] = useState<Priest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("All Cities");
  const [bookingPriest, setBookingPriest] = useState<Priest | null>(null);

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
                  {/* Clickable photo/name → priest detail page */}
                  <Link href={`/priests/${priest.id}`}>
                    <PriestAvatar photoUrl={priest.photo_url} name={priest.name} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/priests/${priest.id}`}>
                        <h3 className="font-bold text-slate-900 hover:text-orange-600 transition-colors">{priest.name}</h3>
                      </Link>
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

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/priests/${priest.id}`}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors hover:bg-orange-50"
                    style={{ borderColor: "#fed7aa", color: "#f97316" }}
                  >
                    View Profile
                  </Link>
                  <button
                    onClick={() => setBookingPriest(priest)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                    style={{ backgroundColor: "#f97316" }}
                  >
                    Book Now <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {bookingPriest && (
        <BookingModal priest={bookingPriest} onClose={() => setBookingPriest(null)} />
      )}
    </div>
  );
}
