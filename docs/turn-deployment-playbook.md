# TURN Deployment Playbook

## Scope
This repo provides reproducible coturn configuration only. It does not deploy or prove a production TURN service.

## Production Checklist
- DNS: create `A/AAAA` records for the TURN host.
- TLS: issue certificates for `turns:` on `5349`.
- Firewall: allow `3478/tcp`, `3478/udp`, `5349/tcp`, `5349/udp`, and the configured relay port range.
- Credentials: use long-term credentials or time-bound credentials generated outside the frontend. Rotate secrets regularly.
- Config: set `external-ip`, `realm`, `server-name`, cert paths, log path, and relay range.
- Monitoring: collect coturn logs and export host metrics for CPU, memory, bandwidth, and socket errors.
- Health: run `turnutils_uclient` from outside the host network.

## App Configuration
Use environment-specific `VITE_ICE_SERVERS`:

```json
[
  {"urls":"stun:stun.l.google.com:19302"},
  {"urls":"turns:turn.example.com:5349","username":"<runtime-user>","credential":"<runtime-secret>"}
]
```

Do not commit real TURN credentials. The app warns when no TURN URL is configured.

## Manual Smoke
1. Deploy coturn with TLS and firewall open.
2. Run `turnutils_uclient -T -u <user> -w <password> <turn-host>`.
3. Start the app with the TURN server in `VITE_ICE_SERVERS`.
4. Run the pre-call check and inspect whether relay candidates are selected.
5. Run a two-party call from different networks.

## Rollback
Remove TURN entries from `VITE_ICE_SERVERS`, redeploy the frontend environment, and keep STUN-only fallback while investigating.
