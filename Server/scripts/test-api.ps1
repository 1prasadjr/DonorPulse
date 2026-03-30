param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$CsvPath = "./src/temp/sample_donor_history.csv",
    [int]$TopN = 5
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Write-Pass {
    param([string]$Message)
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

try {
    $csvResolved = (Resolve-Path -Path $CsvPath).Path
} catch {
    Write-Fail "CSV file not found at '$CsvPath'"
    exit 1
}

Write-Step "Testing Health API"
$health = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/v1/health"
if ($health.status -ne "ok") {
    Write-Fail "Health status is '$($health.status)'"
    exit 1
}
if (-not $health.checks.pythonEntrypointExists -or -not $health.checks.modelManifestExists -or -not $health.checks.uploadDirWritable) {
    Write-Fail "One or more health checks failed"
    $health | ConvertTo-Json -Depth 6 | Write-Host
    exit 1
}
Write-Pass "Health API OK"
$health | ConvertTo-Json -Depth 6 | Write-Host

Write-Step "Testing Model Metadata API"
$modelMeta = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/v1/model/metadata"
if ($modelMeta.status -ne "success") {
    Write-Fail "Model metadata status is '$($modelMeta.status)'"
    exit 1
}
if (-not $modelMeta.data.manifest.model_name -or -not $modelMeta.data.metrics.selected_model) {
    Write-Fail "Model metadata response missing required fields"
    $modelMeta | ConvertTo-Json -Depth 8 | Write-Host
    exit 1
}
Write-Pass "Model Metadata API OK"
$modelMeta | ConvertTo-Json -Depth 8 | Write-Host

Write-Step "Testing Prediction Upload API (E2E)"
$predRaw = & curl.exe -s -X POST "$BaseUrl/api/v1/predictions/upload" -F "file=@$csvResolved" -F "topN=$TopN"
if ([string]::IsNullOrWhiteSpace($predRaw)) {
    Write-Fail "Prediction API returned empty response"
    exit 1
}

try {
    $pred = $predRaw | ConvertFrom-Json
} catch {
    Write-Fail "Prediction API did not return valid JSON"
    Write-Host $predRaw
    exit 1
}

if ($pred.status -ne "success") {
    Write-Fail "Prediction API status is '$($pred.status)'"
    $pred | ConvertTo-Json -Depth 10 | Write-Host
    exit 1
}

$requiredPaths = @(
    $pred.data.uploadMetadata,
    $pred.data.summaryMetrics,
    $pred.data.riskBands,
    $pred.data.topAtRiskDonors,
    $pred.data.segmentRecommendations,
    $pred.data.chartData,
    $pred.data.modelMetadata,
    $pred.data.managerSummary
)

if ($requiredPaths -contains $null) {
    Write-Fail "Prediction response is missing one or more dashboard fields"
    $pred | ConvertTo-Json -Depth 12 | Write-Host
    exit 1
}

Write-Pass "Prediction Upload API OK"
$pred | ConvertTo-Json -Depth 12 | Write-Host

Write-Host "`nAll API checks passed." -ForegroundColor Green
exit 0
