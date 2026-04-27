# Render Keep Alive Setup

This repo includes a GitHub Actions workflow to ping your Render backend:

- Target backend: `https://abackend-x026.onrender.com`
- Workflow file: `.github/workflows/render-keepalive.yml`
- Ping script: `scripts/ping-render.sh`

## Important limitation

GitHub cron does **not** support every 30 seconds. Smallest schedule is every 5 minutes.

## What is configured

- Automatic cron ping every 5 minutes (`*/5 * * * *`)
- Manual test mode that pings every 30 seconds for 10 times (for quick verification)

## How to run and check logs

1. Push this repository to GitHub.
2. Open your repo on GitHub.
3. Go to **Actions**.
4. Open **Render Keep Alive** workflow.
5. Click **Run workflow**:
   - choose `test-30s` for testing every 30 seconds
   - choose `normal-5m` for one standard ping
6. Open a workflow run and check step logs for:
   - HTTP status code
   - ping number
   - timestamp
   - request duration

## Final production mode

Keep cron at every 5 minutes (already configured in this workflow).
