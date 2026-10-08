# Deployment

`beesone.ca/plans` is served from the `plans` prefix of the `gs://beesone.ca` bucket.

Deploy this app with:

```powershell
npm.cmd run deploy:plans
```

The deploy script builds with Vite's production base set to `/plans/`, syncs only `./dist` to `gs://beesone.ca/plans`, and intentionally does not pass any deletion flag to `gcloud storage rsync`. It also uploads `dist/index.html` as both `plans` and `plans/index.html`, so both `https://beesone.ca/plans` and `https://beesone.ca/plans/` resolve to the app.

On Windows the script calls `gcloud.cmd` and `npm.cmd` directly, avoiding PowerShell execution-policy blocks from `.ps1` shims.

For other projects that sync to the same bucket, do not run bucket-root syncs with deletion enabled unless they explicitly exclude or preserve `plans` and `plans/**`.