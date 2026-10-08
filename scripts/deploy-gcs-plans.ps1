param(
  [string]$Bucket = "gs://beesone.ca",
  [string]$Prefix = "plans"
)

$ErrorActionPreference = "Stop"

if ($Bucket -notmatch '^gs://[^/]+$') {
  throw "Bucket must look like gs://bucket-name with no path. Received: $Bucket"
}

$cleanPrefix = $Prefix.Trim("/")
if ([string]::IsNullOrWhiteSpace($cleanPrefix)) {
  throw "Prefix cannot be empty; refusing to deploy to the bucket root."
}

$destination = "$Bucket/$cleanPrefix"

npm.cmd run build:plans

# Intentionally omit deletion flags so this app cannot remove unrelated bucket content.
gcloud.cmd storage rsync --recursive ./dist "$destination"

# GCS website hosting treats /plans and /plans/ differently. Keep both objects present.
gcloud.cmd storage cp ./dist/index.html "$destination"

gcloud.cmd storage objects update "$destination" "$destination/index.html" --cache-control="no-cache, max-age=0"
gcloud.cmd storage objects update "$destination/assets/**" --cache-control="public, max-age=31536000, immutable"

Write-Host "Deployed to https://beesone.ca/$cleanPrefix"