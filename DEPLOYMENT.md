# Deployment

`beesone.ca/plane/` is served from the `plane` prefix of the `gs://beesone.ca` bucket.

Deploy this app with:

```powershell
npm.cmd run deploy:plane
```

The deploy script builds with Vite's production base set to `/plane/`, syncs only `./dist` to `gs://beesone.ca/plane`, and intentionally does not pass any deletion flag to `gcloud storage rsync`. Use the canonical URL `https://beesone.ca/plane/`, which resolves to `plane/index.html` through the bucket website configuration. Build and upload failures stop deployment.

The Beesone desktop dashboard manager also supports this project as `plane`.
Use **Build selected project**, **Upload selected project**, then **Publish homepage**.
The previous `/plans/` deployment is retained for existing bookmarks, but is no longer updated.

On Windows the script calls `gcloud.cmd` and `npm.cmd` directly, avoiding PowerShell execution-policy blocks from `.ps1` shims.

For other projects that sync to the same bucket, do not run bucket-root syncs with deletion enabled unless they explicitly exclude or preserve `plane` and `plane/**`.