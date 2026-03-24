import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { priest_id, customer_name, rating, ceremony, comment } = body;

    // Validate required fields
    if (!priest_id) {
      return NextResponse.json({ error: "priest_id is required" }, { status: 400 });
    }
    if (!customer_name || typeof customer_name !== "string" || !customer_name.trim()) {
      return NextResponse.json({ error: "customer_name is required" }, { status: 400 });
    }
    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "rating must be a number between 1 and 5" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        priest_id,
        customer_name: customer_name.trim(),
        rating: Math.round(rating),
        ceremony: ceremony?.trim() || null,
        comment: comment?.trim() || null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, review: data });
  } catch (err) {
    console.error("Review submission error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
