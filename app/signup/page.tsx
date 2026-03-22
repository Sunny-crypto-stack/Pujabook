"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

const SKILLS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python",
  "Django", "FastAPI", "Java", "Spring Boot", "Flutter", "React Native",
  "UI/UX Design", "Figma", "Data Science", "Machine Learning", "SQL",
  "Content Writing", "SEO", "Digital Marketing", "Product Management",
];

const JOB_TYPES = [
  "Full-time Remote",
  "Part-time / Freelance",
  "Remote Internship",
  "Contract (3-6 months)",
];

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Recent Graduate", "Postgraduate"];

type FormState = "idle" | "loading" | "success" | "error";

export default function SignupPage() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", college: "",
    degree: "", year: "", linkedin: "",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [status, setStatus] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (skills.length === 0) {
      setErrorMsg("Please select at least one skill.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, skills, jobTypes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong.");
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">You&apos;re on the list!</h2>
          <p className="mt-3 text-slate-500">
            We&apos;ll reach out as soon as we find roles that match your profile.
            Keep an eye on your inbox.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-full bg-indigo-600 px-8 py-3 font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-indigo-600">
            <Briefcase className="h-5 w-5" />
            RemoteHire<span className="text-slate-900">India</span>
          </Link>
          <Link href="/" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">Create your profile</h1>
          <p className="mt-2 text-slate-500">
            Takes 3 minutes. We&apos;ll match you to remote jobs that are open to India.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal info */}
          <Section title="Personal details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <input
                  type="text" placeholder="Priya Sharma" required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Email address" required>
                <input
                  type="email" placeholder="priya@gmail.com" required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Phone number" required>
                <input
                  type="tel" placeholder="+91 98765 43210" required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="LinkedIn URL">
                <input
                  type="url" placeholder="linkedin.com/in/priya"
                  value={form.linkedin}
                  onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          {/* Education */}
          <Section title="Education">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="College / University" required>
                <input
                  type="text" placeholder="BITS Pilani" required
                  value={form.college}
                  onChange={(e) => setForm({ ...form, college: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Degree" required>
                <input
                  type="text" placeholder="B.Tech Computer Science" required
                  value={form.degree}
                  onChange={(e) => setForm({ ...form, degree: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Current year" required>
                <select
                  required value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select year</option>
                  {YEARS.map((y) => <option key={y}>{y}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          {/* Skills */}
          <Section title="Skills" subtitle="Pick everything that applies.">
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((s) => (
                <button
                  type="button" key={s}
                  onClick={() => setSkills(toggle(skills, s))}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors
                    ${skills.includes(s)
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            {skills.length > 0 && (
              <p className="mt-2 text-xs text-slateigo-500 text-slate-500">{skills.length} selected</p>
            )}
          </Section>

          {/* Job type */}
          <Section title="What are you looking for?">
            <div className="grid gap-3 sm:grid-cols-2">
              {JOB_TYPES.map((t) => (
                <label
                  key={t}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors
                    ${jobTypes.includes(t)
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <input
                    type="checkbox" className="h-4 w-4 accent-indigo-600"
                    checked={jobTypes.includes(t)}
                    onChange={() => setJobTypes(toggle(jobTypes, t))}
                  />
                  <span className="text-sm font-medium text-slate-700">{t}</span>
                </label>
              ))}
            </div>
          </Section>

          {/* Error */}
          {status === "error" && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {errorMsg}
            </div>
          )}

          <button
            type="submit" disabled={status === "loading"}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 py-3.5 font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {status === "loading" ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
            ) : (
              "Submit my profile"
            )}
          </button>

          <p className="text-center text-xs text-slate-400">
            Free forever. No spam. We only contact you when a matching role appears.
          </p>
        </form>
      </div>
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

function Section({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="mb-1 text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mb-4 text-xs text-slate-500">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
