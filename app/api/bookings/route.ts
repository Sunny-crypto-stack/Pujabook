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

    // Send push notification to the priest
    try {
      const { data: priestData } = await supabase
        .from("priests")
        .select("push_token")
        .eq("id", priest_id)
        .single();

      if (priestData?.push_token) {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: priestData.push_token,
            title: "New Booking! 🪔",
            body: `${customer_name} booked ${ceremony} on ${booking_date} at ${booking_time}`,
            data: { bookingId: data.id },
          }),
        });
      }
    } catch (notifErr) {
      console.error("Failed to send push notification:", notifErr);
      // Don't fail the booking if notification fails
    }

    return NextResponse.json({ success: true, booking_id: data.id });
  } catch (err) {
    console.error("Booking error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
