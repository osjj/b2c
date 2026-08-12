param(
  [Parameter(Mandatory = $true)]
  [string]$Slug,

  [Parameter(Mandatory = $true)]
  [string]$Key,

  [Parameter(Mandatory = $true)]
  [string]$Source
)

$ErrorActionPreference = 'Stop'

if ($Slug -notmatch '^[a-z0-9-]+$') {
  throw "Invalid blog slug: $Slug"
}

if ($Key -notmatch '^[a-z0-9-]+$') {
  throw "Invalid image key: $Key"
}

$resolvedSource = (Resolve-Path -LiteralPath $Source).Path
$targetDirectory = Join-Path $PWD "public\blog\$Slug"
$targetPath = Join-Path $targetDirectory "$Key.png"

New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
Copy-Item -LiteralPath $resolvedSource -Destination $targetPath -Force

npx tsx scripts/upload-blog-image-files.ts --slug=$Slug --key=$Key --file=$targetPath

