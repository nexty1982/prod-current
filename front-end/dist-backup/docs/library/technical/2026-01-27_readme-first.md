✅ How OrthodoxMetrics To-Do System Works (For AI + Human Helpers)

## 🧠 What Is This?

This is a smart system where **AI agents** and **developers** follow instructions one at a time by reading a file called:

todo.md

Think of it like a **task board**, and each line is a card that says:

> "Hey, go do Task 133. I need a blog editor."

---

## 📋 How Does It Work?

### Step 1: Open the `todo.md` file

Inside you'll see something like this:

📌 Current Task: 133 - Blog Editor
Create a page where users can write blogs.
Use the PageEditor as the base.
Save screenshots as task133-01.png, task133-02.png.

### Step 2: Start Working

Whoever reads it (you, Cursor, Claude, Junie, etc.) knows:

- What the task is
- What components to work on
- What folder to put files in
- What screenshots to take

### Step 3: Drop Your Work in the Right Spot

| What         | Where it goes                                 |
|--------------|-----------------------------------------------|
| Scripts      | `prod/tasks/scripts/`                         |
| Node.js code | `prod/tasks/node/`                            |
| NPM commands | `prod/tasks/npm/`                             |
| PM2 control  | `prod/tasks/pm2/`                             |
| Screenshots  | `prod/screenshots/task133/`                   |
| Markdown docs| `prod/docs/tasks/Task-133.md`                 |

### Step 4: When You're Done

Before you tell the boss “I'm finished!”:

- ✅ Make sure the screenshots are in `screenshots/task133/`
- ✅ Include the visible URL in the screenshot
- ✅ Check that the component works
- ✅ Make sure it's connected to the menu/router

Then mark the task as completed in the `todo.md` like this:

```markdown
# ✅ Completed Task: 133 - Blog Editor
And replace it with the next task.

🧩 Why Is This Smart?
🧠 Only one task at a time = No confusion

🧹 No extra files lying around

📸 Screenshot rule = Visual proof

🧾 Markdown = Easy to read, easy to audit

🧙 Reminder for AI Agents
If you're reading todo.md, you are responsible for completing the task inside.

Don’t do extra work. Don’t skip steps.

Make sure to update:

The router (if it’s a page)

The menu (if it should show up)

The database (if data needs to be saved)

Save screenshots before saying “I'm done.”

📂 Folder Map

prod/
├── tasks/               # Executable scripts (by type)
├── screenshots/         # Screenshot folders (e.g., task133/)
├── docs/tasks/          # Markdown docs for completed tasks
├── todo.md              # Current task to work on
🚀 Summary
Look at todo.md

Do what it says

Save everything in the right place

Don’t forget screenshots

Mark the task ✅ complete

Wait for the next one