# Observability Setup (Prometheus + Grafana)

## 1) Endpoint de métricas
El servicio `asr-mt` expone:
- `GET /metrics` (formato Prometheus)

Ejemplo local:
```bash
curl http://localhost:8001/metrics
```

## 2) Prometheus scrape
Añade un `job` para `asr-mt`:

```yaml
scrape_configs:
  - job_name: asrmt
    static_configs:
      - targets: ['localhost:8001']
```

## 3) Grafana dashboard
Importa el JSON:
- `infra/observability/grafana-asrmt-dashboard.json`

Paneles incluidos:
- `asrmt_up`
- `asrmt_rooms_active_participants`
- `asrmt_calls_started_total`
- `asrmt_calls_ended_total`
- `asrmt_reconnect_events_total`
- `asrmt_caption_ttfc_ms_p95`
- `asrmt_caption_lag_ms_p95`
- `asrmt_webrtc_rtt_ms_p95`
- `asrmt_webrtc_packet_loss_pct_p95`
- `asrmt_webrtc_jitter_ms_p95`
- `asrmt_telemetry_errors_total`
- `asrmt_telemetry_timeouts_total`
- `asrmt_dropped_hypothesis_rate_pct_avg`

## 4) SLO recomendado
- TTFC p95 <= 1500ms
- Caption lag p95 <= 1800ms
- Dropped hypothesis avg <= 25%

## 5) Contrato de telemetria
- Version actual: `telemetry.v1`
- No enviar contenido: texto transcrito, mensajes, audio, video, emails, nombres o telefonos.
- Retencion por defecto: `TELEMETRY_RETENTION_SECONDS=86400`.
- Limite por sesion: `MAX_TELEMETRY_EVENTS_PER_SESSION=500`.
- Panel local QA: `VITE_ENABLE_QA_TELEMETRY_PANEL=false` por defecto.
