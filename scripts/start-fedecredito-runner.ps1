$ErrorActionPreference = 'Stop'
$runnerDirectory = Join-Path $env:LOCALAPPDATA 'PromoCardsRunner'
$runnerMutex = [System.Threading.Mutex]::new($false, 'Local\PromoCardsFedecreditoRunner')
if (-not $runnerMutex.WaitOne(0)) {
    $runnerMutex.Dispose()
    exit 0
}

try {
    Set-Location -LiteralPath $runnerDirectory
    & (Join-Path $runnerDirectory 'run.cmd') *> (Join-Path $runnerDirectory 'runner-console.log')
    exit $LASTEXITCODE
} finally {
    $runnerMutex.ReleaseMutex()
    $runnerMutex.Dispose()
}
