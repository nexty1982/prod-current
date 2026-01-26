## OrthodoxMetrics Report Studio Plan

### 🚀 Purpose
Empower churches to generate clean, printable, and professionally formatted reports and documents from their raw data or record history. Replace clunky Excel files with easy-to-use, AI-assisted output.

---

## 📊 Key Capabilities

### 1. Pre-Built Template Reports (Auto-Generated)
- Annual Baptism Summary
- Sacrament Count by Year
- Marriage by Clergy or Parish
- Funeral Records by Date Range
- Exportable in PDF, Word, or Excel

**Features:**
- Pulls live data from records DB
- Simple date picker and filter interface
- Sort by clergy, location, age, etc.

---

### 2. Custom Report Builder
- Freeform builder UI similar to Claude's SSPPOC report tool
- Drag-and-drop fields (name, sacrament date, notes, clergy)
- Grouping, totals, conditional logic ("if location = X")
- Generate beautiful layouts using Claude-styled formatting

**Output Formats:**
- PDF
- Word (DOCX)
- Download CSV for manual analysis

---

### 3. Certificate Creator
- **Baptism Certificate**: Pulls from record, includes child name, clergy, date, sponsors
- **Marriage Certificate**: Includes names, date, parish, celebrant, notes

**Template Features:**
- Add parish seal/logo
- Select font and theme
- Include signatures if available

---

### 4. AI Enhancement Tools
- Claude or OMAI can:
  - Beautify an uploaded Excel sheet
  - Clean and structure exported CSVs
  - Generate custom summaries from raw data
  - Rewrite or reformat a plaintext report into church-branded document

---

## 🌐 UI Experience
- Located under "Report Studio" in sidebar
- Role-limited to `church_admin`, `priest`, `editor`
- Simple tabbed interface: Templates | Certificates | Custom Builder | AI Tools
- Autosave & reusable report definitions

---

## 🔒 Access & Roles
| Role | Access Level |
|------|---------------|
| super_admin | All reports, all churches |
| church_admin | All reports for their church |
| priest | Liturgical + sacramental reports |
| editor | Custom templates and exports |
| viewer | View-only access to shared reports |

---

## 🌟 Future Enhancements
- Report scheduling (e.g., auto-email monthly reports)
- Chart and graph builder for dashboards
- Share reports with diocese/oversight
- PDF password protection for exports

---

*Maintainer: OrthodoxMetrics Reporting & Document Systems Team*
*Last Updated: August 2025*

