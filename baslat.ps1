$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $bundledNode) {
    $nodeExe = $bundledNode
} elseif ($nodeCommand) {
    $nodeExe = $nodeCommand.Source
} else {
    Write-Host 'Node.js 20 veya daha yeni bir surum gerekli: https://nodejs.org/'
    Read-Host 'Kapatmak icin Enter'
    exit 1
}
$env:PORT = '4173'
Write-Host 'Duzenleyici: http://127.0.0.1:4173/editor.html'
Write-Host 'Bu pencereyi acik tutun. Durdurmak icin Ctrl+C.'
& $nodeExe server.mjs
if ($LASTEXITCODE -ne 0) { Read-Host 'Sunucu acilamadi. Kapatmak icin Enter' }
