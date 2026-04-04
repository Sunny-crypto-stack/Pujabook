"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, ArrowRight, X, Check, ChevronLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";

// ── Puja data ─────────────────────────────────────────────────────────────────

interface PujaInfo {
  emoji: string;
  deity: string;
  description: string;
  benefits: string[];
}

const PUJA_DATA: Record<string, PujaInfo> = {
  "Satyanarayan Katha": {
    emoji: "🙏",
    deity: "Lord Vishnu",
    description:
      "A devotional ritual where the Satyanarayan story is read aloud to seek blessings for happiness and prosperity. This puja is performed on auspicious occasions to thank the Lord and invite his divine grace.",
    benefits: ["Fulfillment of heartfelt wishes", "Family harmony and togetherness", "Removal of obstacles and difficulties"],
  },
  "Ganesh Puja": {
    emoji: "🐘",
    deity: "Lord Ganesha",
    description:
      "Performed before any new venture, occasion, or important event to invoke Ganesha's blessings and remove all obstacles. This puja is the foundation of most Hindu ceremonies as Ganesha is invoked first.",
    benefits: ["Removes obstacles in your path", "Ensures success in new beginnings", "Brings positive energy and auspiciousness"],
  },
  "Griha Pravesh": {
    emoji: "🏠",
    deity: "Vastu Purusha & All Deities",
    description:
      "The sacred housewarming ceremony performed when moving into a new home to purify the space and invite prosperity. It consecrates the home with divine energy and Vedic mantras.",
    benefits: ["Purifies the home of negative energies", "Protects the family from evil", "Brings lasting family harmony and prosperity"],
  },
  "Vivah": {
    emoji: "💍",
    deity: "Agni & All Vedic Deities",
    description:
      "The sacred Hindu wedding ceremony uniting two families with Vedic rituals performed around the holy fire as divine witness. Each ritual carries deep spiritual significance for the couple's journey together.",
    benefits: ["Divine blessings for a lasting marriage", "Family harmony between both households", "Auspicious beginning of the couple's life together"],
  },
  "Namakarana": {
    emoji: "👶",
    deity: "All Deities",
    description:
      "The sacred naming ceremony performed on the 11th or 12th day after a child's birth to officially give the baby its name. The name is whispered into the baby's ear with Vedic mantras for divine blessings.",
    benefits: ["Divine protection for the newborn child", "Auspicious and spiritually powerful name selection", "Blessings from the entire family lineage"],
  },
  "Lakshmi Puja": {
    emoji: "🌸",
    deity: "Goddess Lakshmi",
    description:
      "A beautiful ritual that invokes the goddess of wealth, fortune, and prosperity into the home and life of the devotee. Performed on auspicious days like Diwali or Fridays for maximum effect.",
    benefits: ["Financial prosperity and abundance", "Removal of poverty and scarcity mindset", "Grace of the divine mother of wealth"],
  },
  "Durga Puja": {
    emoji: "🔱",
    deity: "Goddess Durga",
    description:
      "Worship of the divine mother in her fierce form for protection, strength, and courage. This powerful puja invokes Durga's shakti to destroy negativity and grant victory to devotees.",
    benefits: ["Protection from evil forces and enemies", "Inner strength and fearlessness", "Victory over life's greatest challenges"],
  },
  "Rudrabhishek": {
    emoji: "🕉️",
    deity: "Lord Shiva",
    description:
      "The sacred bathing of the Shivalinga with milk, honey, water, and other offerings while chanting powerful Rudra mantras. This deeply purifying ritual connects the devotee directly to Lord Shiva's grace.",
    benefits: ["Removes negative karma accumulated over lifetimes", "Healing of physical and mental ailments", "Rapid spiritual growth and liberation"],
  },
  "Navagraha Puja": {
    emoji: "⭐",
    deity: "The Nine Planetary Deities",
    description:
      "A comprehensive ritual that balances the influence of all nine planets in one's horoscope simultaneously. This puja appeases malefic planets and strengthens benefic ones for overall life balance.",
    benefits: ["Reduces harmful planetary effects in your chart", "Career success and professional stability", "Mental peace and clarity of mind"],
  },
  "Maha Mrityunjaya Homam": {
    emoji: "🔥",
    deity: "Lord Shiva (Mrityunjaya form)",
    description:
      "A powerful fire ritual for health, healing, and longevity using the ancient Maha Mrityunjaya mantra. This homam is considered one of the most potent healing rituals in the Vedic tradition.",
    benefits: ["Recovery from serious illness and ailments", "Protection from untimely death and accidents", "Deep spiritual protection and inner peace"],
  },
  "Vastu Puja": {
    emoji: "🏗️",
    deity: "Vastu Purusha",
    description:
      "Performed to harmonize the energy of a home or office space with Vastu Shastra principles and divine blessings. This puja corrects Vastu doshas and invites positive energy into the space.",
    benefits: ["Positive energy flow throughout the space", "Prosperity and success in the space's activities", "Family health and wellbeing in the environment"],
  },
  "Antim Sanskar": {
    emoji: "🙏",
    deity: "Yama & All Ancestors",
    description:
      "The final rites performed after death according to Vedic tradition to help the departed soul attain peace and moksha. These sacred rituals ensure proper transition and bring closure to the grieving family.",
    benefits: ["Peace and liberation for the departed soul", "Emotional closure and healing for the family", "Proper spiritual transition according to dharma"],
  },
  "Navratri Puja": {
    emoji: "🌺",
    deity: "Goddess Durga (9 forms)",
    description:
      "Nine nights of sacred worship celebrating the divine feminine energy across Durga's nine powerful manifestations. This elaborate celebration invites the full spectrum of the divine mother's blessings.",
    benefits: ["Blessings of all nine forms of the divine mother", "Spiritual protection for the entire family", "Profound spiritual growth and transformation"],
  },
  "Hanuman Puja": {
    emoji: "🐒",
    deity: "Lord Hanuman",
    description:
      "Worship of Lord Hanuman, the great devotee of Ram, for courage, strength, protection, and removal of obstacles. Hanuman puja is especially powerful on Tuesdays and Saturdays.",
    benefits: ["Immense courage and physical strength", "Protection from negative energies and evil spirits", "Success in difficult tasks and challenges"],
  },
  "Upanayana": {
    emoji: "🧵",
    deity: "Savitri & Vedic Deities",
    description:
      "The sacred thread ceremony marking a boy's second birth — his spiritual birth — and the beginning of Vedic studies under a guru. This initiation ceremony is a cornerstone of Hindu tradition.",
    benefits: ["Formal spiritual initiation and second birth", "Discipline, focus, and academic excellence", "Blessings from ancestors and the Vedic lineage"],
  },
  "Ayushya Homam": {
    emoji: "🎂",
    deity: "Lord Ayur & Dhanvantari",
    description:
      "A sacred fire ritual performed on birthdays to invoke divine blessings for long life, good health, and overall wellbeing for the coming year. A powerful annual ritual for all age groups.",
    benefits: ["Divine blessings for longevity and long life", "Good health throughout the year ahead", "Grace and blessings for the new year of life"],
  },
};

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
  upi_id: string | null;
}

interface Review {
  id: string;
  priest_id: string;
  customer_name: string;
  rating: number;
  ceremony: string;
  comment: string | null;
  created_at: string;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function PriestAvatar({ photoUrl, name, size = "lg" }: { photoUrl: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const cls = { sm: "h-10 w-10 text-sm", md: "h-16 w-16 text-xl", lg: "h-24 w-24 text-3xl" };
  const imgCls = { sm: "h-10 w-10", md: "h-16 w-16", lg: "h-24 w-24" };
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className={`${imgCls[size]} rounded-full object-cover ring-4 ring-orange-100`} />;
  }
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div className={`flex ${cls[size]} items-center justify-center rounded-full font-bold text-white ring-4 ring-orange-100`} style={{ backgroundColor: "#c2410c" }}>
      {initials}
    </div>
  );
}

// ── Time / Date helpers ───────────────────────────────────────────────────────

const TIME_SLOTS = ["6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "4:00 PM", "5:00 PM", "6:00 PM"];

function getNext14Days() {
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

// ── Booking Modal ─────────────────────────────────────────────────────────────

interface BookingModalProps {
  priest: Priest;
  prefilledCeremony?: string;
  onClose: () => void;
}

function BookingModal({ priest, prefilledCeremony, onClose }: BookingModalProps) {
  const days = getNext14Days();
  const [ceremony, setCeremony] = useState(prefilledCeremony ?? priest.ceremonies[0] ?? "");
  const [selectedDate, setSelectedDate] = useState(days[0].value);
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState("");

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
      } else setError(data.error ?? "Something went wrong. Please try again.");
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
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
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
              <span className="font-semibold">{priest.name}</span> is confirmed.
            </p>
            {bookingId && (
              <p className="mt-2 text-xs text-slate-400">Booking ID: <span className="font-mono font-semibold text-slate-600">{bookingId}</span></p>
            )}
            <div className="mt-6 w-full rounded-xl p-4 text-sm" style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa" }}>
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
            <button onClick={onClose} className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white" style={{ backgroundColor: "#f97316" }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ceremony</label>
              <select value={ceremony} onChange={(e) => setCeremony(e.target.value)} required
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-orange-400"
                style={{ borderColor: "#fed7aa", backgroundColor: "#fff7ed" }}>
                {priest.ceremonies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Select Date</label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {days.map((d) => (
                  <button key={d.value} type="button" onClick={() => setSelectedDate(d.value)}
                    className="flex flex-col items-center flex-shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition-colors min-w-[56px]"
                    style={selectedDate === d.value
                      ? { backgroundColor: "#f97316", borderColor: "#f97316", color: "white" }
                      : { borderColor: "#fed7aa", backgroundColor: "#fff7ed", color: "#78716c" }}>
                    <span className="text-xs opacity-75">{d.dayName}</span>
                    <span className="text-sm font-bold">{d.label.split(" ")[0]}</span>
                    <span className="text-xs opacity-75">{d.label.split(" ")[1]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Select Time</label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((t) => (
                  <button key={t} type="button" onClick={() => setSelectedTime(t)}
                    className="rounded-xl border py-2.5 text-xs font-medium transition-colors"
                    style={selectedTime === t
                      ? { backgroundColor: "#f97316", borderColor: "#f97316", color: "white" }
                      : { borderColor: "#fed7aa", backgroundColor: "#fff7ed", color: "#78716c" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Your Name</label>
              <input type="text" placeholder="Enter your full name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-orange-400" style={{ borderColor: "#fed7aa" }} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Phone Number</label>
              <input type="tel" placeholder="+91 98765 43210" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-orange-400" style={{ borderColor: "#fed7aa" }} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Address</label>
              <textarea placeholder="Full address where the ceremony will be held" value={address} onChange={(e) => setAddress(e.target.value)} required
                rows={3} className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-orange-400 resize-none" style={{ borderColor: "#fed7aa" }} />
            </div>
            <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa" }}>
              <p className="font-semibold" style={{ color: "#92400e" }}>Payment</p>
              <p className="mt-1" style={{ color: "#78350f" }}>
                After booking, send <strong>₹{priest.price.toLocaleString("en-IN")}</strong> to the priest via any UPI app (PhonePe, GPay, Paytm).
              </p>
            </div>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#f97316" }}>
              {submitting ? "Confirming…" : "Confirm Booking"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="text-lg leading-none">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ color: i < rating ? "#f97316" : "#e5e7eb" }}>★</span>
      ))}
    </span>
  );
}

export default function PriestDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [priest, setPriest] = useState<Priest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bookingCeremony, setBookingCeremony] = useState<string | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Review form state
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewCeremony, setReviewCeremony] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase
      .from("priests")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setPriest(data);
        setLoading(false);
      });

    // Fetch reviews for this priest
    supabase
      .from("reviews")
      .select("*")
      .eq("priest_id", id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setReviews(data ?? []);
        setReviewsLoading(false);
      });
  }, [id]);

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReviewError("");
    setReviewSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priest_id: id,
          customer_name: reviewName,
          rating: reviewRating,
          ceremony: reviewCeremony,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewSuccess(true);
        setReviewName("");
        setReviewRating(5);
        setReviewCeremony("");
        setReviewComment("");
        // Add new review to top of list optimistically
        if (data.review) {
          setReviews((prev) => [data.review, ...prev]);
        }
      } else {
        setReviewError(data.error ?? "Failed to submit review. Please try again.");
      }
    } catch {
      setReviewError("Network error. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#fffbf5" }}>
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading priest profile…</p>
        </div>
      </div>
    );
  }

  if (notFound || !priest) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "#fffbf5" }}>
        <p className="text-5xl">🙏</p>
        <h1 className="text-xl font-bold text-slate-700">Priest not found</h1>
        <Link href="/priests" className="text-sm font-semibold" style={{ color: "#f97316" }}>← Back to all priests</Link>
      </div>
    );
  }

  const knownCeremonies = priest.ceremonies.filter((c) => PUJA_DATA[c]);
  const otherCeremonies = priest.ceremonies.filter((c) => !PUJA_DATA[c]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fffbf5" }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="text-xl font-black" style={{ color: "#f97316" }}>HeyPuja</a>
          <a href="/#for-priests" className="rounded-full px-5 py-2 text-sm font-semibold text-white" style={{ backgroundColor: "#f97316" }}>
            Register as Priest
          </a>
        </div>
      </nav>

      {/* Back link */}
      <div className="mx-auto max-w-4xl px-6 pt-6">
        <Link href="/priests" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-orange-600 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to all priests
        </Link>
      </div>

      {/* Hero card */}
      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: "#fed7aa" }}>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <PriestAvatar photoUrl={priest.photo_url} name={priest.name} size="lg" />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-black text-slate-900">{priest.name}</h1>
                {priest.verified && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">✓ Verified</span>
                )}
              </div>
              <p className="mt-2 flex items-center justify-center sm:justify-start gap-1 text-sm text-slate-500">
                <MapPin className="h-4 w-4" /> {priest.city}
              </p>
              <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                  {priest.experience} yrs experience
                </span>
                {priest.languages.map((l) => (
                  <span key={l} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{l}</span>
                ))}
              </div>
              {priest.bio && (
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{priest.bio}</p>
              )}
            </div>
            <div className="text-center flex-shrink-0">
              <p className="text-3xl font-black" style={{ color: "#f97316" }}>₹{priest.price.toLocaleString("en-IN")}</p>
              <p className="text-xs text-slate-400 mb-3">per ceremony</p>
              <button
                onClick={() => setBookingCeremony(priest.ceremonies[0] ?? "")}
                className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                style={{ backgroundColor: "#f97316" }}
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ceremony cards */}
      <div className="mx-auto max-w-4xl px-6 pb-8">
        <h2 className="mb-6 text-xl font-black text-slate-900">Ceremonies Offered</h2>

        <div className="space-y-4">
          {knownCeremonies.map((ceremonyName) => {
            const info = PUJA_DATA[ceremonyName];
            return (
              <div key={ceremonyName} className="rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md" style={{ borderColor: "#fed7aa" }}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-shrink-0 text-4xl">{info.emoji}</div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-slate-900">{ceremonyName}</h3>
                    </div>
                    <p className="text-xs font-medium mb-2" style={{ color: "#f97316" }}>{info.deity}</p>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">{info.description}</p>
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Benefits</p>
                      <ul className="space-y-1">
                        {info.benefits.map((b) => (
                          <li key={b} className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: "#f97316" }}>✓</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xl font-black" style={{ color: "#f97316" }}>₹{priest.price.toLocaleString("en-IN")}</p>
                      <p className="text-xs text-slate-400">per ceremony</p>
                    </div>
                    <button
                      onClick={() => setBookingCeremony(ceremonyName)}
                      className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 whitespace-nowrap"
                      style={{ backgroundColor: "#f97316" }}
                    >
                      Book This Puja <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Other ceremonies without detailed data */}
          {otherCeremonies.length > 0 && (
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#fed7aa" }}>
              <h3 className="font-bold text-slate-900 mb-3">Other Ceremonies</h3>
              <div className="flex flex-wrap gap-2">
                {otherCeremonies.map((c) => (
                  <button
                    key={c}
                    onClick={() => setBookingCeremony(c)}
                    className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:border-orange-400 hover:text-orange-600"
                    style={{ borderColor: "#fed7aa", color: "#92400e", backgroundColor: "#fff7ed" }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Reviews Section ── */}
      <div className="mx-auto max-w-4xl px-6 pb-16">
        {/* Average rating banner */}
        {reviews.length > 0 && (() => {
          const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
          return (
            <div className="mb-6 flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "#fed7aa" }}>
              <div className="text-center">
                <p className="text-4xl font-black" style={{ color: "#f97316" }}>{avg.toFixed(1)}</p>
                <StarRating rating={Math.round(avg)} />
                <p className="text-xs text-slate-400 mt-1">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          );
        })()}

        <h2 className="mb-6 text-xl font-black text-slate-900">Reviews</h2>

        {reviewsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-orange-50" />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-center" style={{ borderColor: "#fed7aa" }}>
            <p className="text-3xl mb-2">⭐</p>
            <p className="font-semibold text-slate-700">No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "#fed7aa" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{review.customer_name}</p>
                    {review.ceremony && (
                      <p className="text-xs text-orange-600 mt-0.5">{review.ceremony}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StarRating rating={review.rating} />
                    <p className="text-xs text-slate-400">
                      {new Date(review.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                {review.comment && (
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Review Form ── */}
        <div className="mt-10 rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: "#fed7aa" }}>
          <h3 className="text-lg font-bold text-slate-900 mb-5">Write a Review</h3>

          {reviewSuccess ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-3">
                <span className="text-2xl">⭐</span>
              </div>
              <p className="font-semibold text-slate-800">Thank you for your review!</p>
              <p className="text-sm text-slate-500 mt-1">Your review has been submitted.</p>
              <button
                onClick={() => setReviewSuccess(false)}
                className="mt-4 text-sm font-semibold"
                style={{ color: "#f97316" }}
              >
                Write another review
              </button>
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Your Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  required
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-orange-400"
                  style={{ borderColor: "#fed7aa" }}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="text-3xl leading-none transition-transform hover:scale-110"
                      style={{ color: star <= reviewRating ? "#f97316" : "#e5e7eb" }}
                    >
                      ★
                    </button>
                  ))}
                  <span className="ml-2 self-center text-sm text-slate-500">{reviewRating} / 5</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ceremony (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Ganesh Puja, Vivah…"
                  value={reviewCeremony}
                  onChange={(e) => setReviewCeremony(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-orange-400"
                  style={{ borderColor: "#fed7aa" }}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Comment (optional)</label>
                <textarea
                  placeholder="Share your experience…"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-orange-400 resize-none"
                  style={{ borderColor: "#fed7aa" }}
                />
              </div>

              {reviewError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{reviewError}</p>
              )}

              <button
                type="submit"
                disabled={reviewSubmitting}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#f97316" }}
              >
                {reviewSubmitting ? "Submitting…" : "Submit Review"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Booking modal */}
      {bookingCeremony !== null && (
        <BookingModal
          priest={priest}
          prefilledCeremony={bookingCeremony}
          onClose={() => setBookingCeremony(null)}
        />
      )}
    </div>
  );
}
