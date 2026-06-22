# Reelflow Windows 本地开发启动说明

Reelflow MVP 以 `apps/tanstack-app` 为主应用，本地数据库使用 PostgreSQL。执行服务使用 `apps/execution-worker`，用于承接长任务。

## 环境要求

- Windows 10/11
- Node.js 22 LTS 或更新版本
- Docker Desktop，并保持 Docker Engine 运行
- PowerShell 5+，系统自带即可
- 端口 `7001`、`55432` 未被其它进程占用

## 一键启动

在项目根目录运行：

```powershell
.\scripts\start-dev.ps1
```

也可以双击或在终端运行：

```bat
scripts\start-dev.cmd
```

或者使用 npm 脚本入口：

```powershell
corepack pnpm dev:local
```

脚本会自动完成这些动作：

1. 检查 Node.js、Corepack 和 Docker。
2. 如果没有 `.env.local`，从 `env.local.example` 复制一份。
3. 创建或启动本地 PostgreSQL 容器 `reelflow-postgres`。
4. 执行 `pnpm db:push` 同步数据库结构。
5. 执行 `pnpm db:seed` 初始化测试账号、模板、工作区和价格数据。
6. 打开两个 PowerShell 窗口，分别启动 TanStack Web 应用和执行 Worker。

启动后访问：

```text
http://localhost:7001/zh-CN
```

默认测试账号：

```text
普通用户: user@example.com / user123456
管理员:   admin@example.com / admin123
```

## 常用启动参数

数据库已经初始化后，可以跳过同步和 seed：

```powershell
.\scripts\start-dev.ps1 -SkipDbPush -SkipSeed
```

只启动 Web 应用，不启动执行 Worker：

```powershell
.\scripts\start-dev.ps1 -NoWorker
```

依赖已安装时跳过安装检查：

```powershell
.\scripts\start-dev.ps1 -SkipInstall
```

## 本地数据库

脚本默认使用：

```text
postgresql://reelflow:reelflow@localhost:55432/reelflow
```

容器名称：

```text
reelflow-postgres
```

手动查看容器：

```powershell
docker ps --filter "name=reelflow-postgres"
```

手动停止数据库：

```powershell
docker stop reelflow-postgres
```

如需重建本地数据库，确认不再需要本地数据后再执行：

```powershell
docker rm -f reelflow-postgres
.\scripts\start-dev.ps1
```

## 手动启动方式

如果不使用脚本，可以按下面步骤启动：

```powershell
copy env.local.example .env.local

docker run --name reelflow-postgres `
  -e POSTGRES_USER=reelflow `
  -e POSTGRES_PASSWORD=reelflow `
  -e POSTGRES_DB=reelflow `
  -p 55432:5432 `
  -d postgres:16-alpine

corepack enable
corepack pnpm install
corepack pnpm db:push
corepack pnpm db:seed
corepack pnpm dev:tanstack
```

执行 Worker 需要另开一个终端：

```powershell
corepack pnpm dev:worker
```

## 常见问题

### Docker Desktop 未启动

先打开 Docker Desktop，等左下角或状态栏显示运行中，再重新执行启动脚本。

### 端口被占用

检查占用端口的进程：

```powershell
netstat -ano | findstr ":7001"
netstat -ano | findstr ":55432"
```

### PowerShell 执行策略限制

使用仓库提供的 CMD 包装脚本：

```bat
scripts\start-dev.cmd
```

或者临时绕过执行策略：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
```

### 数据库连接到了错误地址

优先检查 `.env.local`，本地开发应使用：

```text
DB_DIALECT=pg
DATABASE_URL=postgresql://reelflow:reelflow@localhost:55432/reelflow
BETTER_AUTH_URL=http://localhost:7001
VITE_APP_URL=http://localhost:7001
```
