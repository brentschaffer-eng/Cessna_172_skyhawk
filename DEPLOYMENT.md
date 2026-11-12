# Deployment

`beesone.ca/plane/` is served from the `plane` prefix of the `gs://beesone.ca` bucket.

## Automatic (normal workflow)

Push to `main` on GitHub. The Cloud Build trigger `cessna-trainer` runs [cloudbuild.yaml](cloudbuild.yaml), which:

1. installs dependencies with `npm ci`,
2. runs `npm run lint` and `npm test`,
3. builds with `npm run build:plane` (Vite base `/plane/`), and
4. syncs `dist` to `gs://beesone.ca/plane`, then sets `index.html` to `no-cache` and the hashed
   files in `assets/` to long-lived immutable caching.

A failed install, lint, test or build stops before anything is uploaded. The sync intentionally has no
deletion flag, so older assets remain available to browsers still holding a previous `index.html`.
The Beesone dashboard manager's **GitHub deploys** panel shows each build's progress and result.

## Manual (optional)

To publish from this computer without pushing, for example to test a local change on the live URL:

```powershell
npm.cmd run deploy:plane
```

The deploy script performs the same build and upload. On Windows it calls `gcloud.cmd` and
`npm.cmd` directly, avoiding PowerShell execution-policy blocks from `.ps1` shims. The Beesone
dashboard manager can also do this with **Build selected project** and **Upload selected project**.
The next push to `main` publishes whatever is on GitHub, replacing a manual upload.

Use the canonical URL `https://beesone.ca/plane/`, which resolves to `plane/index.html` through the
bucket website configuration. The previous `/plans/` deployment is retained for existing bookmarks,
but is no longer updated.

For other projects that sync to the same bucket, do not run bucket-root syncs with deletion enabled unless they explicitly exclude or preserve `plane` and `plane/**`.