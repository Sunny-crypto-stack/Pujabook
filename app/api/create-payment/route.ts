import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { booking_id, amount, customer_name, customer_phone, ceremony } = await req.json();

    if (!booking_id || !amount || !customer_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
    }

    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        amount: Math.round(Number(amount) * 100), // paise
        currency: "INR",
        description: `${ceremony} - PujaBook`,
        customer: {
          name: customer_name,
          contact: customer_phone?.replace(/\D/g, "").slice(-10) ?? "",
        },
        notify: { sms: true },
        reminder_enable: true,
        notes: { booking_id },
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/booking-success`,
        callback_method: "get",
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Razorpay error:", err);
      return NextResponse.json({ error: "Failed to create payment link" }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({ payment_url: data.short_url });
  } catch (err) {
    console.error("create-payment error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
