import { NextRequest, NextResponse } from "next/server";
import { readStudents } from "@/lib/store";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "admin123";

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const students = readStudents();
  return NextResponse.json(students);
}
