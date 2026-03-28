import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    if (webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");
      if (expectedSig !== signature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(body);

    if (event.event === "payment_link.paid") {
      const notes = event.payload?.payment_link?.entity?.notes ?? {};
      const bookingId = notes.booking_id;
      const paymentId = event.payload?.payment?.entity?.id;

      if (bookingId) {
        const supabase = await createClient();
        await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", bookingId);
        console.log(`Booking ${bookingId} confirmed via Razorpay payment ${paymentId}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("payment-webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
