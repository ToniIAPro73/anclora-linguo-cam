# TURN (coturn) Base Config

## Objetivo
Habilitar conectividad WebRTC en redes restrictivas via TURN.

## Requisitos
- coturn instalado en el servidor

## Configuracion
- Edita `turnserver.conf` con tu dominio, IP publica y credenciales.
- Usa TLS en produccion.
- Abre `3478/tcp`, `3478/udp`, `5349/tcp`, `5349/udp` y el rango relay configurado.
- Usa credenciales long-term o credenciales temporales generadas por backend; rota secretos.
- Configura DNS `A/AAAA` para el realm y certificado TLS valido.

## Ejecutar
```bash
turnserver -c ./turnserver.conf
```

## Smoke manual
No hay TURN desplegado por este repo. Para validar una instancia real:

```bash
turnutils_uclient -T -u <user> -w <password> <turn-host>
```

Tambien prueba desde el navegador con `VITE_ICE_SERVERS` incluyendo `turn:`/`turns:` y confirma en el pre-call check que `turn_relay=true` cuando fuerces red relay.

## Rollback
- Retira el TURN de `VITE_ICE_SERVERS` y conserva STUN para volver al comportamiento previo.
- Deten `turnserver` o revierte el servicio/container.
- Rota credenciales si estuvieron expuestas en logs o configuracion temporal.
