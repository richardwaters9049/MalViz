# Hosting MalViz Free On Oracle Cloud

This guide deploys MalViz as a portfolio demo on an Oracle Cloud Always Free Ubuntu VM. It runs the full stack with Docker Compose: Caddy, Next.js, PostgreSQL, Redis, and the Python worker.

This is not a production malware intake environment. Keep it for benign demo files, synthetic fixtures, and trusted users.

## 1. Create The VM

1. Create an Oracle Cloud account and choose an Always Free-eligible Ubuntu image.
2. Create an Always Free VM in your home region.
3. Add ingress rules for:
   - `22/tcp` for SSH from your IP.
   - `80/tcp` for HTTP.
   - `443/tcp` for HTTPS.
4. SSH into the VM.

## 2. Install Docker

Run these commands on the Ubuntu VM:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and back in so your user can run Docker without `sudo`.

## 3. Clone MalViz

```bash
git clone https://github.com/YOUR-ACCOUNT/MalViz.git
cd MalViz
```

Use your actual repository URL.

## 4. Configure Production Env

Create the private production env file:

```bash
cp infra/docker/prod.env.example infra/docker/prod.env
openssl rand -base64 36
```

Edit `infra/docker/prod.env`:

```env
POSTGRES_DB=malviz
POSTGRES_USER=malviz
POSTGRES_PASSWORD=replace-with-the-generated-password

APP_URL=https://your-domain.example
MALVIZ_SITE_ADDRESS=your-domain.example

SESSION_COOKIE_NAME=malviz_session
MALVIZ_DELETED_FILE_RETENTION_DAYS=7
MAX_UPLOAD_SIZE_MB=25
MAX_UPLOAD_BYTES=26214400
WORKER_POLL_SECONDS=2
```

If you do not have a domain yet, set both URL values to the VM address for a temporary HTTP-only demo:

```env
APP_URL=http://YOUR_VM_PUBLIC_IP
MALVIZ_SITE_ADDRESS=:80
```

Caddy will automatically request HTTPS certificates when `MALVIZ_SITE_ADDRESS` is a real domain pointed at the VM.

## 5. Point DNS At The VM

Create an `A` record from your domain or free DNS hostname to the VM public IPv4 address.

Wait until DNS resolves:

```bash
dig +short your-domain.example
```

## 6. Start The Production Stack

```bash
bun run docker:prod
```

If Bun is not installed on the server, use Docker Compose directly:

```bash
docker compose --env-file infra/docker/prod.env --project-directory . -f infra/docker/compose.prod.yml up -d --build
```

The first run:

- builds the Next.js production image
- starts PostgreSQL and Redis
- applies Prisma migrations
- seeds demo identities
- starts the web app, Python worker, and Caddy

## 7. Verify The Deployment

Check containers:

```bash
docker compose --env-file infra/docker/prod.env --project-directory . -f infra/docker/compose.prod.yml ps
```

Follow logs:

```bash
bun run docker:prod:logs
```

Manual checks:

- Open `APP_URL`.
- Log in as `Demo Analyst`.
- Upload `backend/tests/fixtures/samples/clean-note.txt`.
- Start a scan and confirm the report completes.
- Restart the stack and confirm scan history still exists:

```bash
bun run docker:prod:down
bun run docker:prod
```

PostgreSQL data, Caddy certificates, and quarantined files live in Docker volumes.

## 8. Update The Deployment

Pull new code and rebuild:

```bash
git pull
bun run docker:prod
```

Docker Compose will rebuild images and rerun migrations before restarting the app containers.

## 9. Safety Boundaries

- Do not upload real malware to a public demo.
- Keep demo authentication behind trusted access if you share the URL.
- Do not expose PostgreSQL or Redis ports publicly.
- Keep `infra/docker/prod.env` private.
- Use small upload limits on free infrastructure.
- Replace seeded demo auth before treating this as a production application.
