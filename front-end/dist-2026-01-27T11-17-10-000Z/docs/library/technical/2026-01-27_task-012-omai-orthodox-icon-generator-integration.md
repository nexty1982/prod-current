# Task 012: OMAI Orthodox Icon Generator Integration

## 🌟 Objective
Implement Orthodox-themed image generation in OMAI using OpenAI's DALL·E 3. This enables OMAI to produce Eastern Orthodox icons and related imagery on demand, either via CLI or web interface.

---

## 📁 Directory Structure
```
/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/omai/image-generation/
├── generate-orthodox-image.js      # Main script
├── prompts/image-seeds.json        # List of standard Orthodox prompts
├── output/                         # Stores image URLs or downloaded .pngs
├── logs/omai-image-log.json        # Full generation log
```

---

## ⚒️ Features to Build

### 1. Prompt Library
- Create `prompts/image-seeds.json`
- Include initial 3–5 canonical Orthodox prompts:
  - Christ Pantocrator
  - Theotokos Hodegetria
  - Saint John Chrysostom
  - Icons of liturgical scenes (e.g., Pentecost, Nativity)
- Format:
```json
{
  "label": "Icon Name",
  "prompt": "DALL·E 3 prompt text",
  "tags": ["tag1", "tag2"]
}
```

### 2. Node Script: `generate-orthodox-image.js`
- Uses OpenAI SDK
- Accepts prompt via CLI arg
- Generates image with size 1024x1024
- Logs result to `logs/omai-image-log.json`
- Saves image URL or downloaded PNG into `output/`
- ENV var required: `OPENAI_API_KEY`

### 3. OMAI Command Binding
- Recognize phrases like:
  - "generate Orthodox icon of ___"
  - "OMAI, create icon of Saint ___"
- Execute the Node script
- Display result or send response

### 4. Optional Enhancements
- Download PNG to `output/`
- Auto-display inside OrthodoxMetrics frontend
- Add rating system (thumbs up/down)
- Cache by saint or feast day
- Enable batch generation (e.g., "generate all saints for October")

---

## 🔐 Security
- Only `super_admins` and OMAI core may run generation
- API key never exposed to frontend
- Logs must include: `timestamp`, `prompt`, `tags`, `generated_url`

---

## ✅ Deliverables
- [ ] `generate-orthodox-image.js`
- [ ] `image-seeds.json` with ≥ 5 prompts
- [ ] `logs/omai-image-log.json` sample
- [ ] Output test image
- [ ] OMAI CLI interface for generation
- [ ] Saved as: `bigbook/tasks/2025-07-26/task_012_omai_icon_generation.md`

---

## 🥺 Test Case
```bash
OPENAI_API_KEY=sk-... node generate-orthodox-image.js "Orthodox icon of Saint Nicholas blessing children in Byzantine style"
```
Verify:
- Image stored in output
- Entry added to image log
- OMAI command execution works

---

## 📌 Notes
This feature will support generating imagery for:
- Frontend visuals
- Liturgical calendars
- Saint and feast records
- Social sharing and marketing banners

