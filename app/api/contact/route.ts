import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_ADDRESS,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, business, industry, phone, email, message } = body;

    if (!name || !business || !phone || !email || !industry) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Email to Sanmay
    await transporter.sendMail({
      from: `"LeadFlow Site" <${process.env.GMAIL_ADDRESS}>`,
      to: process.env.GMAIL_ADDRESS,
      subject: `🔥 New lead inquiry: ${business} (${industry})`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#4f46e5">New consultation request</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#64748b;width:130px">Name</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Business</td><td style="padding:8px 0;font-weight:600">${business}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Industry</td><td style="padding:8px 0">${industry}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Phone</td><td style="padding:8px 0"><a href="tel:${phone}">${phone}</a></td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Email</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
            ${message ? `<tr><td style="padding:8px 0;color:#64748b;vertical-align:top">Message</td><td style="padding:8px 0">${message}</td></tr>` : ""}
          </table>
          <div style="margin-top:24px;padding:16px;background:#f1f5f9;border-radius:8px;font-size:13px;color:#64748b">
            Submitted via LeadFlow website
          </div>
        </div>
      `,
    });

    // Auto-reply to the business
    await transporter.sendMail({
      from: `"Sanmay from LeadFlow" <${process.env.GMAIL_ADDRESS}>`,
      to: email,
      subject: `Got your request, ${name.split(" ")[0]} — talking soon`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <p>Hi ${name.split(" ")[0]},</p>
          <p>Thanks for reaching out about getting more leads for <strong>${business}</strong>.</p>
          <p>I've received your request and will personally get back to you within 24 hours to discuss how we can get your first batch of qualified leads in Hyderabad.</p>
          <p>In the meantime, feel free to WhatsApp or call me directly:</p>
          <p style="font-size:18px;font-weight:bold;color:#4f46e5">+1 (470) 338-1677</p>
          <p>Talk soon,<br/><strong>Sanmay Pachika</strong><br/>LeadFlow</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
