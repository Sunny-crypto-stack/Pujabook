"""
lead_delivery.py — Send matched buyer leads to clients via email.

Usage:
    python lead_delivery.py           # send all pending deliveries
    python lead_delivery.py --dry-run # preview emails without sending
"""

import argparse
import os
import smtplib
import textwrap
import time
import random
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid

from dotenv import load_dotenv

load_dotenv()

import database as db

GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS", "")
GMAIL_APP_PW  = os.getenv("GMAIL_APP_PASSWORD", "")
SENDER_NAME   = "Sanmay @ LeadFlow"
SMTP_HOST     = "smtp.gmail.com"
SMTP_PORT     = 587


def get_smtp():
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30)
    server.ehlo(); server.starttls(); server.ehlo()
    server.login(GMAIL_ADDRESS, GMAIL_APP_PW)
    return server


def build_delivery_email(delivery: dict) -> tuple[str, str, str]:
    """Return (subject, plain_text, html) for a lead delivery."""
    bl_id       = delivery["buyer_lead_id"]
    buyer_name  = delivery.get("buyer_name", "Anonymous")
    phone       = delivery.get("phone", "Not provided")
    service     = delivery.get("service_needed", "")
    area        = delivery.get("location_mentioned", "Hyderabad")
    source      = delivery.get("source", "online").replace("_", " ").title()
    intent      = delivery.get("intent_score", 50)
    price       = delivery.get("price_charged", 0)
    client_name = delivery.get("client_name", "")
    contact     = delivery.get("contact_name") or client_name
    category    = delivery.get("service_category", "").replace("_", " ").title()

    # Urgency label
    if intent >= 80:   urgency = "🔴 High (wants service soon)"
    elif intent >= 60: urgency = "🟡 Medium"
    else:              urgency = "🟢 Normal"

    # Truncate service text
    service_short = service[:200] + ("..." if len(service) > 200 else "")

    subject = f"New Lead: {category} inquiry from {area or 'Hyderabad'} — LeadFlow [BL-{bl_id:05d}]"

    plain = textwrap.dedent(f"""
        Hi {contact.split()[0] if contact else 'there'},

        You have a new lead from LeadFlow.

        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        LEAD DETAILS
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        Name          : {buyer_name}
        Phone         : {phone if phone else 'Not available'}
        Area          : {area or 'Hyderabad'}
        Looking for   : {category}
        Urgency       : {urgency}
        Source        : {source}

        What they said:
        "{service_short}"

        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        NEXT STEPS
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        1. Call or WhatsApp them within 2 hours for best results.
        2. Mention that you serve the {area or 'Hyderabad'} area.
        3. If this lead is invalid, reply "DISPUTE BL-{bl_id:05d}" and we won't charge you.

        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        Lead ID     : BL-{bl_id:05d}
        Delivered   : {datetime.now().strftime('%d %b %Y, %I:%M %p IST')}
        Your rate   : ₹{price:.0f} per lead

        Questions? Reply to this email or WhatsApp: +1 (470) 338-1677

        — Sanmay Pachika
          LeadFlow, Hyderabad

        ---
        To pause lead delivery, reply "PAUSE {client_name}".
    """).strip()

    html = f"""
    <div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#1a1a1a">
      <div style="background:#4f46e5;padding:20px 24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:18px">🎯 New Lead — LeadFlow</h2>
        <p style="color:#c7d2fe;margin:4px 0 0;font-size:13px">{category} · {area or 'Hyderabad'}</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none">
        <p style="margin:0 0 16px">Hi <strong>{contact.split()[0] if contact else 'there'}</strong>,<br>
        You have a new lead from LeadFlow.</p>

        <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="color:#64748b;padding:6px 0;width:130px">Name</td>
                <td style="font-weight:600;padding:6px 0">{buyer_name}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0">Phone</td>
                <td style="font-weight:600;padding:6px 0">
                  {'<a href="tel:' + phone + '" style="color:#4f46e5">' + phone + '</a>' if phone else 'Not available'}
                </td></tr>
            <tr><td style="color:#64748b;padding:6px 0">Area</td>
                <td style="padding:6px 0">{area or 'Hyderabad'}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0">Looking for</td>
                <td style="padding:6px 0">{category}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0">Urgency</td>
                <td style="padding:6px 0">{urgency}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0">Source</td>
                <td style="padding:6px 0">{source}</td></tr>
          </table>
        </div>

        <div style="background:#fefce8;border-left:4px solid #eab308;padding:12px 16px;border-radius:4px;margin-bottom:20px;font-size:14px">
          <strong>What they said:</strong><br>
          <em>"{service_short}"</em>
        </div>

        <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px">
          <strong>Next steps:</strong>
          <ol style="margin:8px 0 0;padding-left:18px">
            <li>{'<a href="https://wa.me/' + phone.replace("+","").replace(" ","") + '" style="color:#4f46e5">WhatsApp them</a>' if phone else 'Contact them'} within 2 hours for best conversion</li>
            <li>Mention that you serve the {area or 'Hyderabad'} area</li>
            <li>If this lead is invalid, reply <strong>"DISPUTE BL-{bl_id:05d}"</strong></li>
          </ol>
        </div>

        <div style="border-top:1px solid #e5e7eb;padding-top:16px;font-size:12px;color:#94a3b8">
          Lead ID: <strong>BL-{bl_id:05d}</strong> &nbsp;|&nbsp;
          Delivered: {datetime.now().strftime('%d %b %Y, %I:%M %p')} &nbsp;|&nbsp;
          Rate: ₹{price:.0f}/lead<br><br>
          Questions? Reply to this email or WhatsApp <strong>+1 (470) 338-1677</strong><br>
          To pause deliveries, reply <strong>"PAUSE"</strong>
        </div>
      </div>
    </div>
    """
    return subject, plain, html


def send_delivery(delivery: dict, server: smtplib.SMTP, dry_run: bool = False) -> str:
    subject, plain, html = build_delivery_email(delivery)
    to_email = delivery["client_email"]

    msg = MIMEMultipart("alternative")
    msg["From"]    = f"{SENDER_NAME} <{GMAIL_ADDRESS}>"
    msg["To"]      = to_email
    msg["Subject"] = subject
    msg["Date"]    = formatdate()
    msg_id = make_msgid(domain="leadflow.in")
    msg["Message-ID"] = msg_id
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    if not dry_run:
        server.sendmail(GMAIL_ADDRESS, [to_email], msg.as_string())
    return msg_id


def run(dry_run: bool = False) -> int:
    if not dry_run and (not GMAIL_ADDRESS or not GMAIL_APP_PW):
        print("[!] GMAIL_ADDRESS or GMAIL_APP_PASSWORD not set in .env")
        return 0

    deliveries = db.get_pending_deliveries()
    if not deliveries:
        print("[i] No pending deliveries.")
        return 0

    print(f"\n=== Lead Delivery {'[DRY RUN] ' if dry_run else ''}===")
    print(f"  Pending: {len(deliveries)} delivery/deliveries\n")

    server = None
    if not dry_run:
        try:
            server = get_smtp()
            print("[✓] Gmail connected.\n")
        except Exception as e:
            print(f"[!] SMTP failed: {e}")
            return 0

    sent = 0
    for i, d in enumerate(deliveries, 1):
        print(f"  [{i:02d}/{len(deliveries)}] → {d['client_name']} ({d['client_email']})")
        print(f"          Lead: {d['service_needed'][:60]}")
        try:
            msg_id = send_delivery(d, server, dry_run=dry_run)
            if not dry_run:
                db.mark_delivery_sent(d["id"], msg_id)
                db.update_buyer_lead_status(d["buyer_lead_id"], "delivered")
            print(f"          {'[DRY] Would send' if dry_run else '✓ Sent'}")
            sent += 1
            if not dry_run:
                time.sleep(random.uniform(3, 6))
        except Exception as e:
            print(f"          [!] Failed: {e}")

    if server:
        try:
            server.quit()
        except Exception:
            pass

    print(f"\n✓ {'Would send' if dry_run else 'Sent'}: {sent}/{len(deliveries)}")
    return sent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
