# Install npm dependencies when npm is not on PATH (common in minimal IDE shells).
# Requires Node.js LTS from https://nodejs.org/ (includes npm).

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Find-Npm {
  $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
  $candidates = @(
    $(if ($npmCmd) { $npmCmd.Source } else { $null }),
    "$env:ProgramFiles\nodejs\npm.cmd",
    "$env:ProgramFiles(x86)\nodejs\npm.cmd",
    "$env:LOCALAPPDATA\Programs\node\npm.cmd"
  ) | Where-Object { $_ -and (Test-Path $_) }
  return $candidates | Select-Object -First 1
}

$npm = Find-Npm
if (-not $npm) {
  Write-Host "npm not found. Install Node.js LTS from https://nodejs.org/ then re-run:" -ForegroundColor Yellow
  Write-Host "  .\scripts\install-deps.ps1"
  exit 1
}

Write-Host "Using npm: $npm"
& $npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Run: npm run dev" -ForegroundColor Green
