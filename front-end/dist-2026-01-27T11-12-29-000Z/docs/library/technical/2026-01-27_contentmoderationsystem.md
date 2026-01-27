## OrthodoxMetrics Content Moderation and Rating System

### 🎯 Purpose
To maintain a safe, respectful, and Orthodox-aligned environment on OrthodoxMetrics by detecting, rating, and rejecting inappropriate media uploads, including images, videos, documents, and text content.

---

### 🧭 System Goals
- Prevent offensive, inappropriate, or secular content from being uploaded
- Provide automatic rating and rejection based on severity
- Empower super_admins and trusted clergy to review edge cases
- Ensure Church record digitization and media archives remain sacred

---

### 🛡️ Moderation Pipeline

#### 1. **Upload Intercept Layer**
- Scans every upload before it is written to disk
- Applies file signature verification to ensure valid media types

#### 2. **AI Content Rating**
- Uses the OrthodoxMetrics AI moderation model (OMAI-Vision)
- Scores files based on visual/textual content categories:
  - ✅ Acceptable
  - ⚠️ Borderline / Needs Review
  - ❌ Blocked / Inappropriate

**Rating Attributes:**
- Nudity / Inappropriate Dress
- Graphic Content / Violence
- Blasphemous or Heretical Symbols
- Political Propaganda
- Secular Branding
- Corruption or Damage (for record clarity scoring)

#### 3. **Clergy-Driven Feedback Loop**
- Edge cases sent to a trusted content council (clergy/admin)
- Reviewed anonymously with agree/disagree votes
- Decision logged in moderation history table

#### 4. **Rejection Message System**
- Automatically generates rejection notices:
  - Clear reason
  - Option to appeal or resubmit
  - Educates users on OrthodoxMedia Policy

---

### 🔒 Safeguards
- **Bypass Prevention:** No bypass for any role (including admins)
- **Sensitive Category Handling:**
  - Child-related content flagged for age-appropriateness
  - OCR scans for profanity in uploaded documents
- **Retention Logging:** All flagged files are stored in an encrypted moderation log for 60 days

---

### 👁️ Reviewer Dashboard (Planned)
- Queue of pending content for review
- Filter by category or risk score
- One-click approve, reject, or escalate
- Moderation statistics and patterns

---

### 🧠 Future Enhancements
- Fine-tuned Orthodox classifier trained on iconography, vestments, and sacred architecture
- Community Trust Rank: Track trustworthiness of frequent uploaders
- Per-church moderation policies (strict, relaxed, archival mode)

---

*Last updated: August 2025*
*Maintainer: OrthodoxMetrics Moderation Task Force*

