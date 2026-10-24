# Automated deployment

`.github/workflows/deploy.yml` deploys on every push to `main` and can also be started with **Actions → Deploy production → Run workflow**. It builds the static client, publishes it to `unreal.ajarafashion.com` through Hostinger's API, then syncs the Node/WebSocket backend to the VPS and restarts its `unreal-arena` service.

## GitHub repository secrets

Add these under **Settings → Secrets and variables → Actions → New repository secret**:

- `HOSTINGER_API_TOKEN`: a Hostinger API token allowed to upload and deploy files for the hosting account.
- `VPS_DEPLOY_KEY`: configured for GitHub Actions.
- `VPS_KNOWN_HOSTS`: configured from the previously recorded VPS Ed25519 host key.

The workflow checks for all three secrets. If any are missing, it builds the frontend and marks deployment as skipped instead of failing. The private deployment key is stored as a GitHub secret and must never be committed.

## VPS setup required once

Copy `deploy/bootstrap-vps.sh` and `deploy/github-actions-unreal.pub` to the VPS. From the VPS root console, run:

```sh
bash /root/bootstrap-vps.sh "$(cat /root/github-actions-unreal.pub)"
```

The script creates `unreal-deploy`, grants it group write access to `/opt/unreal-arena`, and allows it to restart only `unreal-arena.service` with `sudo`. It does not change the existing Caddy routes or the unrelated ApnaDesign service.

Add the `HOSTINGER_API_TOKEN` secret after creating a Hostinger API token with access to the hosting account. Once the VPS setup and this secret are in place, every push to `main` deploys both the web client and backend. Existing production URLs remain `https://unreal.ajarafashion.com` and `wss://unreal-api.ajarafashion.com/ws`.
