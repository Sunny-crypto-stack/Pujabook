import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { priest_id, customer_name, customer_phone, ceremony, booking_date, booking_time, address, amount } = body;

    if (!priest_id || !customer_name || !customer_phone || !ceremony || !booking_date || !booking_time || !address || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    const commission = Math.round(Number(amount) * 0.15);

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        priest_id,
        customer_name,
        customer_phone,
        ceremony,
        booking_date,
        booking_time,
        address,
        amount: Number(amount),
        commission,
        status: "Pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, booking_id: data.id });
  } catch (err) {
    console.error("Booking error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
