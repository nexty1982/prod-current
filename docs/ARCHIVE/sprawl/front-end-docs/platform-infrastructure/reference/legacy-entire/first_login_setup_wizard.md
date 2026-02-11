## OrthodoxMetrics First Login Setup Wizard

### 🔎 Purpose
Provide clergy and admins with a peaceful, intuitive, and fully guided first-login experience. This 5-minute setup flow ensures the user configures their environment with intention, without being overwhelmed.

---

### 🔢 Structure
The wizard is a **5-step full-screen onboarding modal**, shown only on first login or until explicitly dismissed.

---

## ✈ Step 1: Welcome & Identity Confirmation

**Message:** "Welcome to OrthodoxMetrics, Fr. [FirstName]."

**Components:**
- Avatar upload (optional clergy icon or cross badge)
- Display church name
- Confirm name and email
- Role display: e.g., Priest, Admin

**Actions:**
- Confirm details
- Option to skip personalization

---

## 🌈 Step 2: Choose a Liturgical Theme

**Visual Preview Grid:**
- Pascha Red
- Lenten Purple
- Pentecost Green
- Traditional Neutral (default)
- Dark Mode

**Option:** Sync theme with liturgical calendar (enabled by default)

**Actions:**
- Select theme
- Enable/disable auto-sync

---

## 📊 Step 3: Select Primary Tools

**Checklist of available modules:**
- [ ] Baptism Records
- [ ] Marriage Records
- [ ] Funeral Records
- [ ] Sermon Notes
- [ ] Member Directory
- [ ] Secure File Vault
- [ ] Calendar
- [ ] AI Assistant (OMAI)

**Description Panel:** Short text appears on hover or select

**Actions:**
- Toggle modules to activate them in sidebar
- Hidden modules can be re-enabled later from settings

---

## 🤖 Step 4: AI Preferences (OMAI)

**Prompt:** "Would you like your AI assistant to help you during your tasks?"

**Features Listed:**
- Smart form suggestions
- Liturgical reminders
- AI-generated summaries
- Quick reply assistant for support

**Tone Setting:**
- ✔ Orthodox + formal
- ✔ Friendly & casual

**Actions:**
- Enable or disable OMAI
- Choose interaction style

---

## ⚖️ Step 5: Final Setup

**Options:**
- Set preferred timezone (default auto-detected)
- Set UI language (English, Greek, Russian, Romanian)
- Choose default landing page:
  - Dashboard
  - Records
  - Calendar
  - AI Console

**Extra Features:**
- Downloadable Quick Start PDF
- Option to schedule a guided onboarding call

**Actions:**
- Finish setup
- Enter OrthodoxMetrics main dashboard

---

## 🔐 Technical Notes
- All setup selections stored in `user_profile_settings`
- Rerun wizard available via user settings panel
- Triggered only once per account unless reset

---

*Prepared: August 2025*
*Maintainer: OrthodoxMetrics UX Team*

