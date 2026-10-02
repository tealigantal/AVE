$ErrorActionPreference = 'Stop'
$aveRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
Push-Location $aveRoot
try {
    docker compose down
    if ($LASTEXITCODE -ne 0) { throw 'AVE shutdown failed.' }
} finally { Pop-Location }
Write-Host 'AVE stopped. Project volumes, exports, profile and model cache are preserved.'
