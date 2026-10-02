param(
    [string]$ModelConfig,
    [string]$DataDirectory,
    [int]$Port = 6080,
    [ValidateSet('auto','cpu','cuda')][string]$Device = 'auto',
    [switch]$NoBrowser,
    [switch]$ConfigureOnly
)
$ErrorActionPreference = 'Stop'
$aveRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$aveEnv = Join-Path $aveRoot '.env'
if ($Port -lt 1024 -or $Port -gt 65535) { throw 'Port must be between 1024 and 65535.' }
if ($ModelConfig -and !(Test-Path -LiteralPath $ModelConfig -PathType Leaf)) { throw 'Model configuration missing; supply an existing AVE configuration.' }
if (!(Test-Path -LiteralPath $aveEnv)) {
    if (!$ModelConfig) {
        $ModelConfig = Join-Path $env:LOCALAPPDATA 'AVE/stage3-final-review/sound-service/model-services-speech-qwen37.json'
    }
    if (!(Test-Path -LiteralPath $ModelConfig -PathType Leaf)) {
        throw 'Create .env from .env.example and supply cloud API keys, or pass -ModelConfig. Existing settings were not changed.'
    }
    $aveConfig = Get-Content -LiteralPath $ModelConfig -Raw | ConvertFrom-Json
    if (!$aveConfig.enabled -or $aveConfig.version -ne 1) { throw 'Enabled version=1 configuration required.' }
    foreach ($aveRole in @('vision','planner')) {
        if (!$aveConfig.$aveRole.api_key) { throw "Missing $aveRole API key; existing settings were not changed." }
    }
    function Quote-Env([string]$Value) {
        if ($Value.Contains("`n") -or $Value.Contains("`r")) { throw 'Environment value must be a single line.' }
        return "'" + $Value.Replace("'", "\'") + "'"
    }
    $aveLines = @(
        'COMPOSE_FILE=compose.yaml',
        'COMPOSE_PATH_SEPARATOR=|',
        "AVE_BROWSER_PORT=$Port",
        'AVE_WHISPER_DEVICE=auto',
        ('AVE_VISION_API_KEY=' + (Quote-Env $aveConfig.vision.api_key)),
        ('AVE_PLANNER_API_KEY=' + (Quote-Env $aveConfig.planner.api_key))
    )
    foreach ($aveRole in @('vision','planner')) { $aveConfig.$aveRole.PSObject.Properties.Remove('api_key') }
    $aveLines += 'AVE_MODEL_SERVICES_JSON=' + (Quote-Env ($aveConfig | ConvertTo-Json -Depth 15 -Compress))
    if (!$DataDirectory) { $DataDirectory = Join-Path $env:LOCALAPPDATA 'AVE/docker' }
    $aveData = [IO.Path]::GetFullPath($DataDirectory)
    foreach ($aveFolder in @('materials','exports')) { New-Item -ItemType Directory -Force -Path (Join-Path $aveData $aveFolder) | Out-Null }
    $aveLines += 'AVE_MATERIALS=' + (Quote-Env ((Join-Path $aveData 'materials').Replace('\','/')))
    $aveLines += 'AVE_EXPORTS=' + (Quote-Env ((Join-Path $aveData 'exports').Replace('\','/')))
    $aveLines | Set-Content -LiteralPath $aveEnv -Encoding utf8
    $aveIdentity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    & icacls $aveEnv /inheritance:r /grant:r "${aveIdentity}:(F)" 'SYSTEM:(F)' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Failed to protect .env ACL.' }
} elseif ($ModelConfig) {
    throw '.env already exists; preserved it. Edit .env explicitly to change credentials.'
}
$aveDockerOS = docker info --format '{{.OSType}}'
if ($LASTEXITCODE -ne 0 -or $aveDockerOS -ne 'linux') { throw 'Docker must be running with Linux containers.' }
$aveGPU = $false
if ($Device -ne 'cpu') {
    # Docker device access and CTranslate2 CUDA libraries must both work.
    $aveProbe = docker run --rm --gpus all --entrypoint python ghcr.io/speaches-ai/speaches@sha256:c0da392c37e76a01ba479239b43124c67baf8913ae0f491071d6ac544641dad7 -c "import ctranslate2; assert ctranslate2.get_cuda_device_count() > 0; assert 'float32' in ctranslate2.get_supported_compute_types('cuda'); print('CUDA-ready')" 2>&1
    $aveGPU = $LASTEXITCODE -eq 0
    if (!$aveGPU -and $Device -eq 'cuda') { throw 'Explicit CUDA selection failed the Docker/CTranslate2 GPU probe; no CPU substitution.' }
    if (!$aveGPU) { Write-Host "CUDA unavailable; selecting CPU before startup. Probe: $($aveProbe -join ' ')" }
}
$aveFile = if ($aveGPU) { 'compose.yaml|docker/compose.gpu.yaml' } else { 'compose.yaml' }
$aveSelected = if ($aveGPU) { 'cuda' } else { 'cpu' }
$aveText = Get-Content -LiteralPath $aveEnv -Raw
foreach ($aveSetting in @(@('COMPOSE_FILE',$aveFile), @('COMPOSE_PATH_SEPARATOR','|'), @('AVE_WHISPER_DEVICE',$aveSelected))) {
    $avePattern = '(?m)^' + $aveSetting[0] + '=.*$'
    $aveLine = $aveSetting[0] + '=' + $aveSetting[1]
    if ($aveText -match $avePattern) { $aveText = [regex]::Replace($aveText, $avePattern, $aveLine) }
    else { $aveText += "`n$aveLine`n" }
}
Set-Content -LiteralPath $aveEnv -Value $aveText -Encoding utf8
Write-Host "AVE device=$aveSelected; .env and original model configuration preserved."
if ($ConfigureOnly) { return }
Push-Location $aveRoot
try {
    docker compose up -d --build --wait --wait-timeout 1800
    if ($LASTEXITCODE -ne 0) { throw 'AVE startup failed; inspect docker compose logs. No hidden retry or device fallback.' }
} finally { Pop-Location }
Write-Host "AVE: http://localhost:$Port"
if (!$NoBrowser) { Start-Process "http://localhost:$Port" }
