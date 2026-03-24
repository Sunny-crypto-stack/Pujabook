"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle, Star, ChevronDown, MapPin } from "lucide-react";

// ── Data ─────────────────────────────────────────────────────────────────────

const CEREMONIES = [
  { emoji: "🙏", label: "Satyanarayan Puja" },
  { emoji: "💍", label: "Wedding (Vivah)" },
  { emoji: "🏠", label: "Griha Pravesh" },
  { emoji: "👶", label: "Naming Ceremony (Namakarana)" },
  { emoji: "🌟", label: "Ganesh Puja" },
  { emoji: "🕯️", label: "Last Rites (Antim Sanskar)" },
  { emoji: "📿", label: "Navratri/Diwali Puja" },
  { emoji: "✨", label: "Custom Ceremony" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Choose your ceremony",
    desc: "Puja, Wedding, Griha Pravesh, Naming Ceremony, and more. Tell us what you need.",
  },
  {
    step: "02",
    title: "Pick a verified priest",
    desc: "Browse profiles, read reviews, check availability. Every priest is personally verified by our team.",
  },
  {
    step: "03",
    title: "Book instantly",
    desc: "Confirm online, pay securely. The priest comes to you at your chosen time and place.",
  },
];

const CITIES = [
  "Hyderabad", "Bangalore", "Mumbai", "Delhi", "Chennai", "Kolkata",
  "Pune", "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kanpur",
  "Nagpur", "Indore", "Bhopal", "Patna", "Vadodara", "Visakhapatnam",
  "Ludhiana", "Agra", "Varanasi", "Prayagraj", "Amritsar", "Chandigarh",
  "Coimbatore", "Kochi", "Bhubaneswar", "Guwahati", "Noida", "Gurugram",
  "Nashik", "Mysore", "Thiruvananthapuram", "Mangalore", "Dehradun",
  "Ranchi", "Raipur", "Jodhpur", "Madurai", "Vijayawada",
];

const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    location: "Hyderabad",
    quote:
      "Found an amazing priest for our griha pravesh in 10 minutes. He was punctual, knowledgeable and very professional.",
    stars: 5,
  },
  {
    name: "Rajesh Kumar",
    location: "Bangalore",
    quote:
      "Booked a Satyanarayan puja with 2 days notice. The priest was excellent and the whole process was seamless.",
    stars: 5,
  },
  {
    name: "Anita Reddy",
    location: "Mumbai",
    quote:
      "Finally an easy way to find a reliable priest. Used PujaBook for my daughter's naming ceremony — highly recommend.",
    stars: 5,
  },
];

const FAQS = [
  {
    q: "How are priests verified?",
    a: "We personally verify credentials, reviews and conduct a video interview before listing any priest.",
  },
  {
    q: "What's the pricing?",
    a: "Priests set their own rates. Platform fee of 15% is included in the displayed price.",
  },
  {
    q: "Can I cancel a booking?",
    a: "Yes, free cancellation up to 24 hours before the ceremony.",
  },
  {
    q: "Which cities are available?",
    a: "Currently available in 40+ cities across India including Hyderabad, Bangalore, Mumbai, Delhi, Chennai, Kolkata, Pune, and many more.",
  },
];

const FOR_PRIEST_POINTS = [
  "Set your own schedule",
  "Get more bookings",
  "Secure payments",
  "Build your reputation",
];

// ── FAQ Item ──────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-orange-100 py-5">
      <button
        className="flex w-full items-center justify-between gap-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-slate-900">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-orange-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <p className="mt-3 text-sm leading-relaxed text-slate-500">{a}</p>}
    </div>
  );
}

// ── Priest Registration Form ──────────────────────────────────────────────────

function PriestRegisterForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    languages: [] as string[],
    ceremonies: [] as string[],
    experience: "",
    price: "",
    bio: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const LANGUAGES = ["Telugu", "Hindi", "Sanskrit", "Kannada", "Tamil", "Marathi"];

  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/priest-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Application received!</h3>
        <p className="text-slate-500">We'll review your profile and get back to you within 48 hours.</p>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name *</label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Pandit Ramesh Sharma"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone *</label>
          <input
            required
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+91 98765 43210"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">City *</label>
        <select
          required
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          className={inputCls}
        >
          <option value="">Select your city</option>
          <option value="Hyderabad">Hyderabad</option>
          <option value="Bangalore">Bangalore</option>
          <option value="Mumbai">Mumbai</option>
          <option value="Delhi">Delhi</option>
          <option value="Chennai">Chennai</option>
          <option value="Kolkata">Kolkata</option>
          <option value="Pune">Pune</option>
          <option value="Ahmedabad">Ahmedabad</option>
          <option value="Jaipur">Jaipur</option>
          <option value="Surat">Surat</option>
          <option value="Lucknow">Lucknow</option>
          <option value="Kanpur">Kanpur</option>
          <option value="Nagpur">Nagpur</option>
          <option value="Indore">Indore</option>
          <option value="Bhopal">Bhopal</option>
          <option value="Patna">Patna</option>
          <option value="Vadodara">Vadodara</option>
          <option value="Visakhapatnam">Visakhapatnam</option>
          <option value="Ludhiana">Ludhiana</option>
          <option value="Agra">Agra</option>
          <option value="Varanasi">Varanasi</option>
          <option value="Prayagraj">Prayagraj</option>
          <option value="Amritsar">Amritsar</option>
          <option value="Chandigarh">Chandigarh</option>
          <option value="Coimbatore">Coimbatore</option>
          <option value="Kochi">Kochi</option>
          <option value="Bhubaneswar">Bhubaneswar</option>
          <option value="Guwahati">Guwahati</option>
          <option value="Noida">Noida</option>
          <option value="Gurugram">Gurugram</option>
          <option value="Nashik">Nashik</option>
          <option value="Mysore">Mysore</option>
          <option value="Thiruvananthapuram">Thiruvananthapuram</option>
          <option value="Mangalore">Mangalore</option>
          <option value="Dehradun">Dehradun</option>
          <option value="Ranchi">Ranchi</option>
          <option value="Raipur">Raipur</option>
          <option value="Jodhpur">Jodhpur</option>
          <option value="Madurai">Madurai</option>
          <option value="Vijayawada">Vijayawada</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Languages spoken</label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <label
              key={lang}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${
                form.languages.includes(lang)
                  ? "border-orange-400 bg-orange-50 text-orange-700 font-medium"
                  : "border-slate-200 text-slate-600 hover:border-orange-200"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={form.languages.includes(lang)}
                onChange={() =>
                  setForm((f) => ({ ...f, languages: toggleArray(f.languages, lang) }))
                }
              />
              {lang}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Ceremony types you perform</label>
        <div className="flex flex-wrap gap-2">
          {CEREMONIES.map((c) => (
            <label
              key={c.label}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${
                form.ceremonies.includes(c.label)
                  ? "border-orange-400 bg-orange-50 text-orange-700 font-medium"
                  : "border-slate-200 text-slate-600 hover:border-orange-200"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={form.ceremonies.includes(c.label)}
                onChange={() =>
                  setForm((f) => ({ ...f, ceremonies: toggleArray(f.ceremonies, c.label) }))
                }
              />
              {c.emoji} {c.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Years of experience *</label>
          <input
            required
            type="number"
            min="0"
            value={form.experience}
            onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
            placeholder="10"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Price per ceremony (₹) *</label>
          <input
            required
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="2500"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Short bio</label>
        <textarea
          rows={3}
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          placeholder="Tell families a bit about yourself, your training and specialities..."
          className={`${inputCls} resize-none`}
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
      >
        {status === "loading" ? "Submitting…" : <>Submit Application <ArrowRight className="h-4 w-4" /></>}
      </button>
      <p className="text-center text-xs text-slate-400">
        We'll review your application and reply within 48 hours.
      </p>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen text-slate-900" style={{ backgroundColor: "#fffbf5" }}>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="text-xl font-black tracking-tight" style={{ color: "#f97316" }}>
            PujaBook
          </a>
          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How it Works</a>
            <a href="#cities" className="hover:text-slate-900 transition-colors">Cities</a>
            <a href="#for-priests" className="hover:text-slate-900 transition-colors">For Priests</a>
          </div>
          <a
            href="#for-priests"
            className="rounded-full px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            style={{ backgroundColor: "#f97316" }}
          >
            Book Now
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden px-6 py-28 text-white"
        style={{ background: "linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #f97316 100%)" }}
      >
        <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-white/5" />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium">
            🪔 Trusted priest booking marketplace
          </span>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Find a trusted priest for your puja, ceremony or wedding
          </h1>
          <p className="mt-6 text-lg text-orange-100 md:text-xl max-w-2xl mx-auto">
            Verified priests across Pan India · 40+ cities. Instant booking. Fair pricing.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="/priests"
              className="flex items-center gap-2 rounded-full px-8 py-3.5 font-bold text-white transition-colors hover:bg-orange-400"
              style={{ backgroundColor: "#f97316" }}
            >
              Find a Priest <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#for-priests"
              className="flex items-center gap-2 rounded-full border-2 border-white/60 px-8 py-3.5 font-medium text-white transition-colors hover:bg-white/10"
            >
              Register as Priest
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            {["Hyderabad", "Bangalore", "Mumbai", "Delhi", "Chennai", "Kolkata", "Pune", "Ahmedabad"].map((city) => (
              <span
                key={city}
                className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white"
              >
                📍 {city}
              </span>
            ))}
            <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white">
              +32 more cities
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-24" style={{ backgroundColor: "#1c1917" }}>
        <div className="mx-auto max-w-5xl text-white">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-black md:text-4xl">How it works</h2>
            <p className="mt-3" style={{ color: "#a8a29e" }}>Book a priest in 3 simple steps</p>
          </div>
          <div className="grid gap-10 md:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="relative">
                <span className="text-7xl font-black" style={{ color: "#44403c" }}>{step}</span>
                <div className="mt-3">
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "#a8a29e" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ceremony types */}
      <section id="ceremonies" className="px-6 py-24" style={{ backgroundColor: "#fffbf5" }}>
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-black md:text-4xl">Every ceremony, covered</h2>
          <p className="mt-3 text-slate-500">From everyday pujas to once-in-a-lifetime weddings.</p>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CEREMONIES.map(({ emoji, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition-colors cursor-pointer"
                style={{ borderColor: "#fed7aa", backgroundColor: "#fff7ed" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = "#ffedd5";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#f97316";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = "#fff7ed";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#fed7aa";
                }}
              >
                <span className="text-3xl">{emoji}</span>
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cities */}
      <section id="cities" className="px-6 py-24" style={{ backgroundColor: "#fff7ed" }}>
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-black md:text-4xl">Now available in 40+ cities</h2>
          <p className="mt-3 text-slate-500">Pan India coverage. More cities added regularly.</p>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {CITIES.map((name) => (
              <a
                key={name}
                href="/priests"
                className="rounded-full border px-4 py-2 text-sm font-medium transition-all hover:shadow-sm"
                style={{ borderColor: "#fed7aa", backgroundColor: "white", color: "#92400e" }}
              >
                📍 {name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="px-6 py-24" style={{ backgroundColor: "#fffbf5" }}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-black md:text-4xl">Trusted by families across India</h2>
            <p className="mt-3 text-slate-500">Real stories from real families.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map(({ name, location, quote, stars }) => (
              <div
                key={name}
                className="rounded-2xl p-6 shadow-sm"
                style={{ backgroundColor: "white", border: "1px solid #fed7aa" }}
              >
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-orange-400 text-orange-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-slate-700">&ldquo;{quote}&rdquo;</p>
                <div className="mt-5 pt-4" style={{ borderTop: "1px solid #fed7aa" }}>
                  <p className="text-sm font-semibold text-slate-900">{name}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <MapPin className="h-3 w-3" /> {location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Priests */}
      <section
        id="for-priests"
        className="px-6 py-24 text-white"
        style={{ background: "linear-gradient(135deg, #7c2d12 0%, #c2410c 60%, #f97316 100%)" }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
            <div>
              <h2 className="text-3xl font-black md:text-4xl">
                Grow your practice.<br />Join PujaBook.
              </h2>
              <p className="mt-4 text-orange-100 leading-relaxed">
                Reach hundreds of families looking for priests in your city. No middlemen, no hassle.
              </p>
              <ul className="mt-8 space-y-4">
                {FOR_PRIEST_POINTS.map((point) => (
                  <li key={point} className="flex items-center gap-3 text-sm text-orange-50">
                    <CheckCircle className="h-5 w-5 shrink-0 text-orange-300" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-8" style={{ backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
              <h3 className="text-lg font-bold mb-6">Register as a Priest</h3>
              <PriestRegisterForm />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 py-24" style={{ backgroundColor: "#fff7ed" }}>
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-10 text-center text-3xl font-black">Frequently asked questions</h2>
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} {...faq} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8" style={{ borderColor: "#fed7aa", backgroundColor: "white" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-slate-400 md:flex-row">
          <span className="text-lg font-black" style={{ color: "#f97316" }}>PujaBook</span>
          <p>© 2026 PujaBook. All rights reserved.</p>
          <span>Pan India · 40+ Cities</span>
        </div>
      </footer>
    </div>
  );
}
