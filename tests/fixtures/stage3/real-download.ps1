param([Parameter(Mandatory=$true)][string]$Uri,[Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference='Stop'
if (([uri]$Uri).Scheme -ne 'https') { throw 'Public media acquisition requires HTTPS' }
if (Test-Path -LiteralPath $Destination) { throw 'Acquisition does not overwrite existing evidence' }
$started=Get-Date
$response=Invoke-WebRequest -Uri $Uri -OutFile $Destination -PassThru -TimeoutSec 300
$actual=(Get-Item -LiteralPath $Destination).Length
$expected=$response.Headers['Content-Length']
if ($expected -and $actual -ne [long]$expected) { throw "Public media length mismatch: $actual/$expected" }
[pscustomobject]@{status=[int]$response.StatusCode;bytes=$actual;seconds=((Get-Date)-$started).TotalSeconds;content_type=[string]$response.Headers['Content-Type']}|ConvertTo-Json -Compress
