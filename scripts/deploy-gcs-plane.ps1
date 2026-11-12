param(
  [string]$Bucket = "gs://beesone.ca",
  [string]$Prefix = "plane"
)

$ErrorActionPreference = "Stop"

if ($Bucket -notmatch '^gs://[^/]+$') {
  throw "Bucket must look like gs://bucket-name with no path. Received: $Bucket"
}

$cleanPrefix = $Prefix.Trim("/")
if ($cleanPrefix -cnotmatch '^[a-z0-9][a-z0-9_-]*$') {
  throw "Prefix must be a single lowercase path segment."
}

$destination = "$Bucket/$cleanPrefix"

Push-Location (Split-Path -Parent $PSScriptRoot)
try {
  npm.cmd run build -- "--base=/$cleanPrefix/"
  if ($LASTEXITCODE -ne 0) { throw "Build failed; nothing was uploaded." }

  # Intentionally omit deletion flags so this app cannot remove unrelated bucket content.
  gcloud.cmd storage rsync --recursive ./dist "$destination"
  if ($LASTEXITCODE -ne 0) { throw "Project sync failed." }
  gcloud.cmd storage objects update "$destination/index.html" --cache-control="no-cache, max-age=0"
  if ($LASTEXITCODE -ne 0) { throw "HTML cache metadata update failed." }
  gcloud.cmd storage objects update "$destination/assets/**" --cache-control="public, max-age=31536000, immutable"
  if ($LASTEXITCODE -ne 0) { throw "Asset cache metadata update failed." }
} finally {
  Pop-Location
}

Write-Host "Deployed to https://beesone.ca/$cleanPrefix"