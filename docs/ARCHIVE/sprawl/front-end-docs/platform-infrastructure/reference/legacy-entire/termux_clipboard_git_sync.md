
# Android Clipboard Git Sync via Termux

This guide outlines how to automatically capture copied text from the ChatGPT app on Android, append it to a Markdown file, and commit/push it to GitHub directly using Git inside Termux.

---

## ✅ Overview

This setup allows you to:
- Monitor clipboard activity on Android using Tasker
- Write clipboard text to a Markdown file
- Use Termux to commit and push changes directly to GitHub

---

## 📱 Step 1: Install Termux and Git

1. Install Termux from F-Droid: https://f-droid.org/en/packages/com.termux/
2. Open Termux and run:

```bash
pkg update
pkg install git
```

---

## 🔐 Step 2: Authenticate Git

### Option A: SSH Access

1. Generate SSH key in Termux:

```bash
ssh-keygen -t ed25519 -C "you@example.com"
```

2. Copy the public key:

```bash
cat ~/.ssh/id_ed25519.pub
```

3. Add it to GitHub → Settings → SSH Keys

4. Test it:

```bash
ssh -T git@github.com
```

### Option B: HTTPS with Token

Use a personal access token instead of your password when pushing over HTTPS.

---

## 📂 Step 3: Clone Your Repo

Inside Termux:

```bash
cd ~
git clone git@github.com:YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

Example path: `~/cgpt`

---

## 📝 Step 4: Create Auto Push Script

Create a file: `~/cgpt/auto_clip_push.sh`

```bash
#!/data/data/com.termux/files/usr/bin/bash

CLIPFILE="$HOME/cgpt/Markdown/android_clipboard_log.md"
NOW=$(date '+%Y-%m-%d %H:%M:%S')

echo -e "\n## Copied from ChatGPT — $NOW\n" >> "$CLIPFILE"
termux-clipboard-get >> "$CLIPFILE"
echo -e "\n---\n" >> "$CLIPFILE"

cd "$HOME/cgpt"
git add .
git commit -m "Android clipboard sync: $NOW"
git push
```

Make it executable:

```bash
chmod +x ~/cgpt/auto_clip_push.sh
```

---

## ✅ Step 5: Run Script from Termux

Anytime you copy something to your Android clipboard:

```bash
~/cgpt/auto_clip_push.sh
```

This will:
- Append clipboard content to your log file
- Commit it to Git
- Push to GitHub

---

## 🤖 Step 6: Automate with Tasker (Optional)

1. In Tasker:
   - Profile → Event → Variable Set → %CLIP
   - Restrict to App = ChatGPT (optional)

2. Action:
   - Action: Run Shell (or Termux Plugin)
   - Command:
     ```bash
     bash ~/cgpt/auto_clip_push.sh
     ```

3. Ensure storage permission is granted to Termux and Tasker

---

## 🔄 Summary

| Task                          | Tool               |
|-------------------------------|--------------------|
| Clipboard monitoring          | Tasker             |
| Write to markdown             | `echo` in Termux   |
| Git commit & push             | `git` in Termux    |
| Trigger clipboard paste       | `termux-clipboard-get` |
| Optional automation           | Tasker + shell call |

---

## 📂 Output File

All entries are saved in:

```
~/cgpt/Markdown/android_clipboard_log.md
```

Each entry is formatted with:

```markdown
## Copied from ChatGPT — 2025-06-18 15:40

[copied content here]

---
```

Ready to use and push to your GitHub repo.

---
