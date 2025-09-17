# CarMar Angular Frontend — Docker Deploy

This folder contains production Docker assets to build and run your Angular 19 app behind Nginx.

## Layout

```
carmar-docker/
├─ Dockerfile
├─ docker-compose.yml
├─ nginx.conf
└─ carmar-intranet-frontend/   # copy of your Angular project root
```

> The compose maps container port **8080** to host **8080**. Change if needed.

## Build & Run

1) Put your Angular project under `carmar-intranet-frontend/` (already done here).
2) Build the image:

```bash
docker compose build
```

3) Run it:

```bash
docker compose up -d
```

4) Open: `http://<VPS_IP_or_domain>:8080`

### Custom domain + HTTPS (recommended)

Use **Caddy** or **Traefik** as a reverse proxy to get automatic Let's Encrypt certificates, HTTP->HTTPS redirect, and access control. See notes below.

## SPA routing

`nginx.conf` includes `try_files ... /index.html;` so deep links like `/tareas/123` load the SPA entrypoint.

## Cache & headers

Static assets get long cache; `index.html` is `no-cache`. Security headers (X-Frame-Options, etc.) are enabled by default. Consider adding a CSP tailored to your app.

## Multi-env API URLs

Angular typically bakes API URLs at build time. Options:
- Use `environment.prod.ts` for production.
- Or serve a small `/assets/runtime-config.json` and fetch it during bootstrap to avoid rebuilds per environment.
- Or inject env with Nginx using `envsubst` and a placeholder file.

## Hardening options

- Put the service **behind a reverse proxy** that terminates TLS and enforces auth (Caddy, Traefik).  
- Restrict exposure: publish on localhost and use the proxy to expose 443 only.
- Add HTTP Basic Auth on the proxy or Nginx, or SSO via oauth2-proxy/Authelia.
- IP allowlist at the proxy/firewall (only your office/home IPs).
- Use a **VPN overlay** (Tailscale/WireGuard) and expose the app only on the VPN network.
- Keep images updated and set `restart: unless-stopped`.

## Troubleshooting

- White page after deploy? Check browser console/network; usually API base URL or missing SPA fallback.
- 404 on deep links? Ensure the SPA fallback in `nginx.conf` is active.
- Can't reach from local machine? Check VPS firewall (ufw) and cloud provider security groups, and that port 8080 is open or proxied.
```

