import { NextRequest, NextResponse } from "next/server";
import { writeStudent, readStudents, Student } from "@/lib/store";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, college, degree, year, skills, linkedin, jobTypes } = body;

    if (!name || !email || !phone || !college || !degree || !year) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Prevent duplicate emails
    const existing = readStudents();
    if (existing.some((s) => s.email === email)) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const student: Student = {
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      college,
      degree,
      year,
      skills: Array.isArray(skills) ? skills : [],
      linkedin: linkedin || "",
      jobTypes: Array.isArray(jobTypes) ? jobTypes : [],
      createdAt: new Date().toISOString(),
    };

    writeStudent(student);
    return NextResponse.json({ success: true, id: student.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
