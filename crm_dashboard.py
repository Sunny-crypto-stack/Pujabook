"""
crm_dashboard.py  —  Streamlit CRM over SQLite
Run with: streamlit run crm_dashboard.py --browser.gatherUsageStats false
"""

import json
import os
import urllib.parse
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd
import streamlit as st

import database as db

# ── Claude agent for WhatsApp message generation ──────────────────────────────

_WA_PROMPT = None

def _load_wa_prompt() -> str:
    global _WA_PROMPT
    if _WA_PROMPT is None:
        p = Path(__file__).parent / "whatsapp_agent_prompt.md"
        _WA_PROMPT = p.read_text() if p.exists() else ""
    return _WA_PROMPT

@st.cache_data(ttl=3600)
def generate_wa_message_ai(business_name: str, industry: str, city: str, phone: str) -> str:
    """Call Claude to generate a personalised WhatsApp message for this lead."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        system = _load_wa_prompt()
        user_msg = (
            f"Business Name: {business_name}\n"
            f"Industry: {industry}\n"
            f"City: {city or 'Hyderabad'}\n"
            f"Phone: {phone}\n"
            f"Notes: "
        )
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            system=system,
            messages=[{"role": "user", "content": user_msg}],
        )
        return resp.content[0].text.strip()
    except Exception:
        return ""  # fall back to template

# ── Page config ───────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Lead CRM — Hyderabad",
    page_icon="📊",
    layout="wide",
)

STATUS_ORDER = [
    "scraped", "enriched", "verified", "draft_ready",
    "contacted", "replied", "interested", "converted",
    "sequence_complete", "invalid",
]

STATUS_EMOJI = {
    "scraped":           "🔵",
    "enriched":          "🟤",
    "verified":          "🟡",
    "draft_ready":       "🟠",
    "contacted":         "📤",
    "replied":           "💬",
    "interested":        "🟢",
    "converted":         "✅",
    "sequence_complete": "⬜",
    "invalid":           "🔴",
}

# ── Data loaders ──────────────────────────────────────────────────────────────

@st.cache_data(ttl=30)
def load_leads() -> pd.DataFrame:
    rows = db.get_all_leads()
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    df["created_at"] = pd.to_datetime(df["created_at"])
    return df


@st.cache_data(ttl=30)
def load_counts() -> dict:
    return db.pipeline_counts()


@st.cache_data(ttl=30)
def load_sent_today() -> pd.DataFrame:
    rows = db.get_sent_today()
    return pd.DataFrame(rows) if rows else pd.DataFrame()


@st.cache_data(ttl=30)
def load_drafts() -> pd.DataFrame:
    rows = db.get_drafts()
    return pd.DataFrame(rows) if rows else pd.DataFrame()


def reload():
    st.cache_data.clear()
    st.rerun()


# ── Header ────────────────────────────────────────────────────────────────────

st.title("📊 Lead Generation CRM")
st.caption(f"DB: `{db.DB_PATH}` — Last refreshed: {datetime.now().strftime('%H:%M:%S')}")

if st.button("🔄 Refresh"):
    reload()

# ── Pipeline funnel ───────────────────────────────────────────────────────────

counts = load_counts()
st.subheader("Pipeline Funnel")

cols = st.columns(len(STATUS_ORDER))
for col, status in zip(cols, STATUS_ORDER):
    emoji = STATUS_EMOJI.get(status, "⚪")
    col.metric(f"{emoji} {status}", counts.get(status, 0))

st.divider()

# ── KPI row ───────────────────────────────────────────────────────────────────

k1, k2, k3, k4, k5 = st.columns(5)
k1.metric("Total Leads",    counts.get("total", 0))
k2.metric("Contacted",      counts.get("contacted", 0))
k3.metric("Replied",        counts.get("replied", 0))
k4.metric("Interested",     counts.get("interested", 0))
k5.metric("Converted",      counts.get("converted", 0))

sent_today = db.count_sent_today()
st.info(f"📤 Emails sent today: **{sent_today}** / 80")

st.divider()

# ── Tabs ──────────────────────────────────────────────────────────────────────

tab_leads, tab_sent, tab_drafts, tab_wa, tab_clients, tab_buyer, tab_add = st.tabs([
    "📋 All Leads", "📤 Sent Today", "✏️ Drafts", "💬 WhatsApp",
    "👥 Clients", "🎯 Buyer Leads", "➕ Add Lead"
])

# ── Tab: All Leads ────────────────────────────────────────────────────────────

with tab_leads:
    df = load_leads()

    if df.empty:
        st.warning("No leads yet. Run `lead_scraper.py` to get started.")
    else:
        # Filters
        fc1, fc2, fc3 = st.columns([2, 2, 3])
        status_filter = fc1.multiselect(
            "Status", STATUS_ORDER, default=STATUS_ORDER
        )
        industry_filter = fc2.multiselect(
            "Industry",
            sorted(df["industry"].dropna().unique().tolist()),
            default=sorted(df["industry"].dropna().unique().tolist()),
        )
        search = fc3.text_input("Search business name")

        filtered = df[
            df["outreach_status"].isin(status_filter) &
            df["industry"].isin(industry_filter)
        ]
        if search:
            filtered = filtered[
                filtered["business_name"].str.contains(search, case=False, na=False)
            ]

        st.caption(f"{len(filtered)} lead(s) shown")

        display = filtered[[
            "id", "business_name", "city", "industry",
            "verified_email", "phone", "outreach_status", "notes"
        ]].copy()
        display["outreach_status"] = display["outreach_status"].map(
            lambda s: f"{STATUS_EMOJI.get(s,'⚪')} {s}"
        )

        st.dataframe(display, use_container_width=True, hide_index=True)

        # Inline editor
        st.subheader("Update a Lead")
        if not filtered.empty:
            lead_options = filtered["business_name"].tolist()
            selected = st.selectbox("Select lead", lead_options)
            row = df[df["business_name"] == selected].iloc[0]

            with st.form("edit_lead"):
                c1, c2 = st.columns(2)
                new_status = c1.selectbox(
                    "Status", STATUS_ORDER,
                    index=STATUS_ORDER.index(row["outreach_status"])
                    if row["outreach_status"] in STATUS_ORDER else 0,
                )
                new_email = c2.text_input("Verified Email", value=row.get("verified_email", ""))
                new_notes = st.text_area("Notes", value=row.get("notes", ""), height=80)
                if st.form_submit_button("Save"):
                    db.update_lead(int(row["id"]),
                                   outreach_status=new_status,
                                   verified_email=new_email,
                                   notes=new_notes)
                    st.success(f"Updated '{selected}'")
                    reload()

# ── Tab: Sent Today ───────────────────────────────────────────────────────────

with tab_sent:
    sent_df = load_sent_today()
    if sent_df.empty:
        st.info("No emails sent today yet.")
    else:
        st.dataframe(
            sent_df[["business_name", "verified_email", "subject", "sequence_step", "sent_at"]],
            use_container_width=True, hide_index=True,
        )

# ── Tab: Drafts ───────────────────────────────────────────────────────────────

with tab_drafts:
    drafts_df = load_drafts()
    if drafts_df.empty:
        st.info("No drafts. Run `outreach_generator.py` to create drafts.")
    else:
        st.caption(f"{len(drafts_df)} draft(s) waiting to send")
        for _, row in drafts_df.iterrows():
            with st.expander(f"📧 {row['business_name']} — {row['subject']}"):
                step_label = {1: "Initial outreach", 2: "Day-3 follow-up", 3: "Day-7 follow-up"}.get(row['sequence_step'], "")
                st.markdown(f"**To:** `{row['verified_email']}`  |  **{step_label}**")
                st.text(row["body"])

# ── Tab: WhatsApp Outreach ────────────────────────────────────────────────────

WA_TEMPLATES = {
    "IT / Software": (
        "Hi, I came across {name} and wanted to reach out. "
        "I run LeadFlow — we connect IT companies in Hyderabad with businesses actively looking for software or tech services. "
        "Would you be open to a quick chat about getting more clients? 🙏"
    ),
    "Healthcare": (
        "Hi, I came across {name}. "
        "I run LeadFlow — we help clinics and healthcare providers in Hyderabad connect with patients already searching for their services. "
        "Would you be open to a quick call? 🙏"
    ),
    "Legal": (
        "Hi, I came across {name}. "
        "I run LeadFlow — we help law firms in Hyderabad get more client inquiries from people actively searching for legal help. "
        "Open to a quick chat? 🙏"
    ),
    "Finance": (
        "Hi, I came across {name}. "
        "I run LeadFlow — we help CA firms and financial consultants in Hyderabad connect with clients already looking for their services. "
        "Would you be open to a quick call? 🙏"
    ),
    "Education": (
        "Hi, I came across {name}. "
        "I run LeadFlow — we help coaching institutes in Hyderabad get more student inquiries. "
        "Would you be open to a quick chat? 🙏"
    ),
    "Digital Marketing": (
        "Hi, I came across {name}. "
        "I run LeadFlow — B2B lead gen for Hyderabad businesses. "
        "I sometimes come across clients looking for digital marketing help — would {name} be open to referrals? 🙏"
    ),
    "Solar / Energy": (
        "Hi, I came across {name}. "
        "I run LeadFlow — we connect solar companies in Hyderabad with homeowners and businesses actively looking for installation quotes. "
        "Open to a quick chat? 🙏"
    ),
    "General": (
        "Hi, I came across {name}. "
        "I run LeadFlow — we help local businesses in Hyderabad get more qualified client inquiries without depending on referrals or expensive ads. "
        "Would you be open to a quick chat? 🙏"
    ),
}

def wa_message(business_name: str, industry: str) -> str:
    industry_key = next(
        (k for k in WA_TEMPLATES if k.lower() in (industry or "").lower()),
        "General"
    )
    return WA_TEMPLATES[industry_key].format(name=business_name)

def wa_link(phone: str, message: str) -> str:
    import urllib.parse
    # Normalise phone: strip spaces/dashes, ensure starts with country code
    clean = "".join(c for c in phone if c.isdigit() or c == "+")
    if clean.startswith("0"):
        clean = "+91" + clean[1:]
    elif not clean.startswith("+"):
        clean = "+91" + clean
    return f"https://wa.me/{clean.replace('+','')}?text={urllib.parse.quote(message)}"

with tab_wa:
    st.subheader("💬 WhatsApp Outreach")
    st.caption("Phone-only leads — no email found. Click to open WhatsApp Web with message pre-filled.")

    df_all_wa = load_leads()
    if df_all_wa.empty:
        st.warning("No leads yet.")
    else:
        wa_leads = df_all_wa[
            (df_all_wa["outreach_status"] == "invalid") &
            (df_all_wa["phone"].str.strip() != "")
        ].copy()

        if wa_leads.empty:
            st.info("No phone-only leads yet.")
        else:
            # Filters
            wc1, wc2, wc3 = st.columns([2, 2, 2])
            wa_industry = wc1.multiselect(
                "Industry",
                sorted(wa_leads["industry"].dropna().unique().tolist()),
                default=sorted(wa_leads["industry"].dropna().unique().tolist()),
                key="wa_industry",
            )
            wa_status_filter = wc2.multiselect(
                "Messaged?",
                ["Not yet", "Messaged"],
                default=["Not yet"],
                key="wa_status",
            )
            wa_search = wc3.text_input("Search", key="wa_search")

            # Use notes field to track "wa_sent" flag
            if "Not yet" in wa_status_filter and "Messaged" not in wa_status_filter:
                wa_leads = wa_leads[~wa_leads["notes"].str.contains("wa_sent", na=False)]
            elif "Messaged" in wa_status_filter and "Not yet" not in wa_status_filter:
                wa_leads = wa_leads[wa_leads["notes"].str.contains("wa_sent", na=False)]

            wa_leads = wa_leads[wa_leads["industry"].isin(wa_industry)]
            if wa_search:
                wa_leads = wa_leads[wa_leads["business_name"].str.contains(wa_search, case=False, na=False)]

            st.caption(f"{len(wa_leads)} lead(s) shown")

            use_ai = bool(os.getenv("ANTHROPIC_API_KEY", ""))
            if use_ai:
                st.caption("✨ Messages generated by Claude AI — personalised per business")
            else:
                st.caption("Using template messages. Add ANTHROPIC_API_KEY to .env to enable AI personalisation.")

            for _, row in wa_leads.iterrows():
                bname   = row["business_name"]
                phone   = row["phone"]
                ind     = row.get("industry", "")
                city    = row.get("city", "Hyderabad")
                if use_ai:
                    ai_msg = generate_wa_message_ai(bname, ind, city, phone)
                    msg = ai_msg if ai_msg else wa_message(bname, ind)
                else:
                    msg = wa_message(bname, ind)
                link    = wa_link(phone, msg)
                already = "wa_sent" in str(row.get("notes", ""))

                with st.expander(f"{'✅' if already else '📱'} {bname}  •  {phone}  •  {ind}"):
                    st.text_area("Message", value=msg, height=120, key=f"wa_msg_{row['id']}")
                    col_a, col_b = st.columns([1, 3])
                    col_a.link_button("Open WhatsApp", link, type="primary")
                    if not already:
                        if col_b.button("Mark as messaged", key=f"wa_mark_{row['id']}"):
                            existing_notes = str(row.get("notes", ""))
                            db.update_lead(int(row["id"]), notes=existing_notes + " wa_sent")
                            st.success("Marked!")
                            reload()

# ── Tab: Clients ─────────────────────────────────────────────────────────────

SERVICE_CATEGORIES = [
    "dental", "legal", "interior_design", "it_software", "real_estate",
    "ca_finance", "education", "healthcare", "event_management",
    "solar", "pest_control", "packers_movers", "general",
]

with tab_clients:
    st.subheader("👥 Client Management")
    st.caption("Businesses paying for buyer leads. Add a client to start delivering leads to them.")

    clients = db.get_all_clients()
    bcounts = db.buyer_counts()
    cc1, cc2, cc3 = st.columns(3)
    cc1.metric("Active Clients",  bcounts["active_clients"])
    cc2.metric("Leads Delivered", bcounts["delivered"])
    cc3.metric("Revenue (₹)",     f"₹{bcounts['total_revenue_inr']:.0f}")

    st.divider()

    if clients:
        client_df = pd.DataFrame(clients)[[
            "id", "business_name", "contact_name", "email", "phone",
            "service_category", "lead_price_inr", "status"
        ]]
        st.dataframe(client_df, use_container_width=True, hide_index=True)
    else:
        st.info("No clients yet. Add your first paying client below.")

    st.subheader("Add / Update Client")
    with st.form("add_client"):
        rc1, rc2 = st.columns(2)
        c_bname   = rc1.text_input("Business Name *")
        c_contact = rc2.text_input("Contact Person Name")
        c_email   = rc1.text_input("Email (for lead delivery) *")
        c_phone   = rc2.text_input("Phone")
        c_cat     = rc1.selectbox("Service Category", SERVICE_CATEGORIES)
        c_price   = rc2.number_input("Price per Lead (₹)", min_value=0.0, value=500.0, step=50.0)
        c_areas   = st.text_input("Coverage Areas (comma-separated)", value="Hyderabad")
        c_method  = st.selectbox("Delivery Method", ["email", "whatsapp", "both"])
        c_wa      = st.text_input("WhatsApp Number (for delivery)", placeholder="+91XXXXXXXXXX")
        c_status  = st.selectbox("Status", ["active", "paused", "churned"])
        c_notes   = st.text_area("Notes", height=60)

        if st.form_submit_button("💾 Save Client"):
            if not c_bname.strip() or not c_email.strip():
                st.error("Business name and email are required.")
            else:
                areas_list = [a.strip() for a in c_areas.split(",") if a.strip()]
                db.upsert_client({
                    "business_name":   c_bname.strip(),
                    "contact_name":    c_contact.strip(),
                    "email":           c_email.strip(),
                    "phone":           c_phone.strip(),
                    "service_category": c_cat,
                    "lead_price_inr":  c_price,
                    "coverage_areas":  areas_list,
                    "delivery_method": c_method,
                    "whatsapp_number": c_wa.strip(),
                    "status":          c_status,
                    "notes":           c_notes.strip(),
                })
                st.success(f"Saved client: {c_bname}")
                reload()

# ── Tab: Buyer Leads ──────────────────────────────────────────────────────────

with tab_buyer:
    st.subheader("🎯 Buyer Leads Inventory")
    st.caption("People actively looking for services in Hyderabad — sourced from Sulekha, JustDial, Facebook groups, and Google.")

    buyer_leads = db.get_all_buyer_leads()
    if not buyer_leads:
        st.info("No buyer leads yet. Run the buyer pipeline: `python buyer_runner.py --once`")
    else:
        bl_df = pd.DataFrame(buyer_leads)

        # KPIs
        bk1, bk2, bk3, bk4 = st.columns(4)
        bk1.metric("Total", len(bl_df))
        bk2.metric("New",       len(bl_df[bl_df["delivery_status"] == "new"]))
        bk3.metric("Matched",   len(bl_df[bl_df["delivery_status"] == "matched"]))
        bk4.metric("Delivered", len(bl_df[bl_df["delivery_status"] == "delivered"]))

        # Filters
        bf1, bf2, bf3 = st.columns(3)
        bl_cat    = bf1.multiselect("Category",
            sorted(bl_df["service_category"].dropna().unique()),
            default=sorted(bl_df["service_category"].dropna().unique()),
            key="bl_cat")
        bl_source = bf2.multiselect("Source",
            sorted(bl_df["source"].dropna().unique()),
            default=sorted(bl_df["source"].dropna().unique()),
            key="bl_source")
        bl_status = bf3.multiselect("Status",
            ["new", "matched", "delivered", "rejected"],
            default=["new", "matched"],
            key="bl_status")

        filtered_bl = bl_df[
            bl_df["service_category"].isin(bl_cat) &
            bl_df["source"].isin(bl_source) &
            bl_df["delivery_status"].isin(bl_status)
        ]

        st.caption(f"{len(filtered_bl)} lead(s) shown")
        st.dataframe(
            filtered_bl[[
                "id", "buyer_name", "phone", "service_category",
                "location_mentioned", "source", "intent_score",
                "delivery_status", "scraped_at"
            ]],
            use_container_width=True, hide_index=True
        )

        # Expand individual leads
        st.subheader("Lead Details")
        if not filtered_bl.empty:
            sel_id = st.selectbox(
                "Select lead to view",
                filtered_bl["id"].tolist(),
                format_func=lambda x: f"BL-{x:05d} — {filtered_bl[filtered_bl['id']==x]['service_needed'].values[0][:60]}",
                key="bl_select"
            )
            row = filtered_bl[filtered_bl["id"] == sel_id].iloc[0]
            with st.container():
                st.markdown(f"**BL-{sel_id:05d}** · `{row['service_category']}` · {row['source']} · Score: {row['intent_score']}/100")
                st.text_area("Full text", value=row["raw_text"] or row["service_needed"], height=120, key="bl_text", disabled=True)
                if row["phone"]:
                    wa_msg = f"Hi {row['buyer_name']}, I saw you were looking for {row['service_category'].replace('_',' ')} in Hyderabad. I can connect you with a trusted provider — would that help?"
                    wa_url = f"https://wa.me/{row['phone'].replace('+','').replace(' ','')}?text={urllib.parse.quote(wa_msg)}"
                    st.link_button("📱 WhatsApp this buyer", wa_url)

        # Run buyer pipeline buttons
        st.divider()
        col_a, col_b, col_c = st.columns(3)
        if col_a.button("🔍 Run Buyer Scraper", key="run_scrape"):
            with st.spinner("Scraping buyer intent signals..."):
                import subprocess
                result = subprocess.run(
                    ["python", "buyer_runner.py", "--once", "--steps", "scrape"],
                    capture_output=True, text=True, cwd=str(__import__("pathlib").Path(__file__).parent)
                )
                st.code(result.stdout[-2000:] if result.stdout else result.stderr[-1000:])
                reload()

        if col_b.button("🔗 Run Matcher", key="run_match"):
            with st.spinner("Matching leads to clients..."):
                import subprocess
                result = subprocess.run(
                    ["python", "buyer_runner.py", "--once", "--steps", "match"],
                    capture_output=True, text=True, cwd=str(__import__("pathlib").Path(__file__).parent)
                )
                st.code(result.stdout[-2000:] if result.stdout else result.stderr[-1000:])
                reload()

        if col_c.button("📧 Send Deliveries", key="run_deliver"):
            with st.spinner("Sending leads to clients..."):
                import subprocess
                result = subprocess.run(
                    ["python", "buyer_runner.py", "--once", "--steps", "deliver"],
                    capture_output=True, text=True, cwd=str(__import__("pathlib").Path(__file__).parent)
                )
                st.code(result.stdout[-2000:] if result.stdout else result.stderr[-1000:])
                reload()

# ── Tab: Add Lead manually ────────────────────────────────────────────────────

with tab_add:
    with st.form("add_lead"):
        c1, c2 = st.columns(2)
        name     = c1.text_input("Business Name *")
        phone    = c2.text_input("Phone")
        website  = c1.text_input("Website")
        address  = c2.text_input("Address")
        city     = c1.text_input("City", value="Hyderabad")
        industry = c2.text_input("Industry")
        email    = c1.text_input("Email (if known)")
        notes    = st.text_area("Notes")
        status   = st.selectbox("Status", STATUS_ORDER)

        if st.form_submit_button("Add Lead"):
            if not name.strip():
                st.error("Business name is required.")
            else:
                db.upsert_lead({
                    "business_name":  name.strip(),
                    "website":        website.strip(),
                    "phone":          phone.strip(),
                    "address":        address.strip(),
                    "city":           city.strip() or "Hyderabad",
                    "industry":       industry.strip(),
                    "verified_email": email.strip(),
                    "outreach_status": status,
                    "notes":          notes.strip(),
                })
                st.success(f"Added '{name}'!")
                reload()

# ── Download ──────────────────────────────────────────────────────────────────

st.divider()
df_all = load_leads()
if not df_all.empty:
    st.download_button(
        "⬇ Download all leads as CSV",
        data=df_all.to_csv(index=False).encode("utf-8"),
        file_name=f"leads_{date.today()}.csv",
        mime="text/csv",
    )
