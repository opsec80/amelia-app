# Household Tasks App Setup Instructions (Render)

This guide explains how to set up and use your Household Tasks App on Render after Glitch's shutdown in July 2025. No technical knowledge is required!

## Step 1: Download and Prepare Files
- Download the ZIP file containing the app files (provided via link).
- Unzip to a folder (e.g., `household-tasks-app`).
- **Edit Email**:
  - Open `script.js` in a text editor (e.g., Notepad).
  - Find line ~150: `mailto:your-email@example.com`.
  - Replace `your-email@email.com` with your actual email (e.g., `yourname@gmail.com`).
  - Save the file.

## Step 2: Set Up on Render
1. Go to [render.com](https://render.com) and sign up (free, no credit card needed for free tier).
2. Create a GitHub repository:
   - Go to [github.com](https://github.com), sign up if needed, and click “New Repository”.
   - Name it (e.g., `household-tasks`), set it to public, and create.
   - Upload all unzipped files (drag-and-drop or use “Add file” > “Upload files”).
3. In Render’s dashboard:
   - Click “New” > “Web Service”.
   - Connect your GitHub account and select your `household-tasks` repository.
   - Configure:
     - **Runtime**: Node.js
     - **Build Command**: `npm install`
     - **Start Command**: `node server.js`
     - **Environment Variables**: Add `PORT=3000`
     - **Disk**: Add disk named “data”, mount path `/app/data`, size 1 GB
     - **Plan**: Free
   - Click “Create Web Service”.
4. Wait for deployment (~2–5 minutes). Access the app at `your-app-name.onrender.com` and admin portal at `your-app-name.onrender.com/admin.html`.

## Step 3: Using the App
- **User App** (`your-app-name.onrender.com`):
  - Enter your name to start.
  - View tasks, upload pictures, mark tasks complete (checkboxes).
  - Get notifications for tasks due today.
  - Earn gold stars for streaks and see glowing checkmarks with a “ding” sound.
  - At month’s end, click “Request Payment” to email a summary.
  - Confirm payment to reset tasks for the next month.
- **Admin Portal** (`your-app-name.onrender.com/admin.html`):
  - Add tasks: Enter name, dollar value, month, and recurrence (one-time, daily, weekly).
  - Edit tasks: Click “Edit” to modify (reloads into form).
  - Delete tasks: Click “Delete” to remove.
  - View submissions: See completed tasks with pictures and dates.
  - Download a CSV report of tasks.

## Step 4: Backup
- In GitHub, download `tasks.json` from your repository periodically for backups.
- To restore, re-upload `tasks.json` to GitHub and redeploy on Render (click “Manual Deploy” in Render).

## Notes
- **Design**: Pastel pink, green, and white with gold stars and glowing checkmarks.
- **Tasks**: Pre-loaded for July 2025 (e.g., “Pay Rent,” “Feed Dogs”). Set dollar values in the admin portal.
- **Data Safety**: Render’s disk storage ensures persistence. Back up `tasks.json` regularly.
- **Troubleshooting**: Ensure `assets/gold-star.png` and `assets/ding.mp3` are in the `assets/` folder. Check Render’s “Logs” for errors or contact Render support.

Enjoy your task app!