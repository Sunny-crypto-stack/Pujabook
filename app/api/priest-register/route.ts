import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, city, languages, ceremonies, experience, price, bio, photo_url } = body;

    if (!name || !phone || !city) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error } = await supabase.from("priests").insert({
      name,
      phone,
      city,
      languages: Array.isArray(languages) ? languages : [],
      ceremonies: Array.isArray(ceremonies) ? ceremonies : [],
      experience: Number(experience) || 0,
      price: Number(price) || 0,
      bio: bio || "",
      photo_url: photo_url || null,
      verified: false,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Priest register error:", err);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}
