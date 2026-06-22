param(
  [switch]$SkipInstall,
  [switch]$SkipDbPush,
  [switch]$SkipSeed,
  [switch]$NoWorker
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Checked {
  param(
    [string]$FilePath,
    [string[]]$Arguments
  )
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $FilePath $($Arguments -join ' ')"
  }
}

function Ensure-LocalEnv {
  $envExample = Join-Path $RepoRoot "env.local.example"
  $envLocal = Join-Path $RepoRoot ".env.local"

  if (-not (Test-Path $envLocal)) {
    if (-not (Test-Path $envExample)) {
      throw "env.local.example not found."
    }
    Copy-Item $envExample $envLocal
    Write-Host "Created .env.local from env.local.example" -ForegroundColor Green
  }

  $env:APP_BASE_URL = "http://localhost:7001"
  $env:VITE_APP_URL = "http://localhost:7001"
  $env:DB_DIALECT = "pg"
  $env:DATABASE_URL = "postgresql://reelflow:reelflow@localhost:55432/reelflow"
  $env:BETTER_AUTH_URL = "http://localhost:7001"
  if (-not $env:BETTER_AUTH_SECRET) {
    $env:BETTER_AUTH_SECRET = "reelflow-local-development-secret-please-change"
  }
  $env:REELFLOW_CLOUD_RENDER_MOCK = "1"
}

function Ensure-Postgres {
  if (-not (Test-Command "docker")) {
    throw "Docker CLI not found. Please install Docker Desktop and start it first."
  }

  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop is not running. Start Docker Desktop and run this script again."
  }

  $containerName = "reelflow-postgres"
  $containerId = docker ps -a --filter "name=^/$containerName$" --format "{{.ID}}"

  if (-not $containerId) {
    Write-Step "Creating local PostgreSQL container"
    Invoke-Checked "docker" @(
      "run",
      "--name", $containerName,
      "-e", "POSTGRES_USER=reelflow",
      "-e", "POSTGRES_PASSWORD=reelflow",
      "-e", "POSTGRES_DB=reelflow",
      "-p", "55432:5432",
      "-d",
      "postgres:16-alpine"
    )
  } else {
    $running = docker inspect -f "{{.State.Running}}" $containerName
    if ($running -ne "true") {
      Write-Step "Starting local PostgreSQL container"
      Invoke-Checked "docker" @("start", $containerName)
    }
  }

  Write-Step "Waiting for PostgreSQL"
  for ($i = 1; $i -le 30; $i++) {
    docker exec $containerName pg_isready -U reelflow -d reelflow *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "PostgreSQL is ready on localhost:55432" -ForegroundColor Green
      return
    }
    Start-Sleep -Seconds 1
  }

  throw "PostgreSQL did not become ready in time."
}

function Start-DevWindow {
  param(
    [string]$Title,
    [string]$Command
  )

  $quotedRoot = $RepoRoot.Path.Replace("'", "''")
  $shellCommand = "cd '$quotedRoot'; `$host.UI.RawUI.WindowTitle = '$Title'; $Command"

  Start-Process powershell.exe -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", $shellCommand
  )
}

Write-Step "Checking runtime"
if (-not (Test-Command "node")) {
  throw "Node.js not found. Install Node.js 22 LTS or newer."
}

$nodeMajor = [int]((node -p "process.versions.node.split('.')[0]") -as [string])
if ($nodeMajor -lt 22) {
  throw "Node.js 22 or newer is required. Current version: $(node -v)"
}

Invoke-Checked "corepack" @("enable")
Ensure-LocalEnv

if (-not $SkipInstall -and -not (Test-Path (Join-Path $RepoRoot "node_modules"))) {
  Write-Step "Installing dependencies"
  Invoke-Checked "corepack" @("pnpm", "install")
}

Ensure-Postgres

if (-not $SkipDbPush) {
  Write-Step "Pushing database schema"
  Invoke-Checked "corepack" @("pnpm", "db:push")
}

if (-not $SkipSeed) {
  Write-Step "Seeding local database"
  Invoke-Checked "corepack" @("pnpm", "db:seed")
}

Write-Step "Starting Reelflow development processes"
Start-DevWindow "Reelflow Web - http://localhost:7001" "corepack pnpm dev:tanstack"

if (-not $NoWorker) {
  Start-DevWindow "Reelflow Worker" "corepack pnpm dev:worker"
}

Write-Host ""
Write-Host "Reelflow local development is starting." -ForegroundColor Green
Write-Host "Web:    http://localhost:7001/zh-CN"
Write-Host "User:   user@example.com / user123456"
Write-Host "Admin:  admin@example.com / admin123"
Write-Host ""
Write-Host "Useful options:"
Write-Host "  .\scripts\start-dev.ps1 -SkipDbPush -SkipSeed"
Write-Host "  .\scripts\start-dev.ps1 -NoWorker"
