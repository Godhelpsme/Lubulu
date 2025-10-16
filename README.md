# Lubulu

[English](README.md) | [简体中文](README.zh-CN.md)

**A probability-driven decision wheel powered by edge computing**

Make better decisions through gamification. Lubulu is a minimalist web app that uses customizable probability mechanics and cloud synchronization to help you break decision paralysis and track behavioral patterns.

---

## What is Lubulu?

Lubulu transforms decision-making into an interactive experience:

- **Spin the wheel** with adjustable odds (1%-98%)
- **Track your choices** across all devices automatically
- **Leverage pity mechanics** to guarantee outcomes after streaks
- **Visualize patterns** with calendar views and statistics

Built on Cloudflare's global edge network for instant responses worldwide.

---

## Use Cases

- **Breaking procrastination** - Let probability help you start
- **Habit gamification** - Track streaks and success rates
- **Fair randomization** - Make unbiased choices with transparent odds
- **Behavioral analysis** - Study your decision patterns over time

---

## Features

### Core Mechanics
- **🎲 Adjustable Probability** - Fine-tune odds from 1% to 98%
- **🎯 Pity System** - Guaranteed outcomes after N consecutive results
- **📊 Smart Statistics** - Success rates, totals, and streak tracking
- **📅 Calendar History** - Visual timeline of all spins
- **🔄 Multi-Mode** - Single daily spin or unlimited practice mode

### Technical Edge
- **⚡ Sub-100ms Response** - Deployed on 300+ global edge nodes
- **🌐 Cross-Device Sync** - Cloud storage with anonymous auth
- **🔒 Zero Registration** - UUID-based, GDPR-compliant
- **📦 Tiny Bundle** - ~3KB gzipped, no frameworks
- **🎨 Canvas Animation** - Smooth 60fps wheel rendering

---

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account (free tier sufficient)
- Git (for repository management)

### Installation

```bash
# 1. Fork or clone the repository
git clone <your-repo>
cd lubulu

# 2. Install dependencies
npm install

# 3. Authenticate with Cloudflare
npx wrangler login
```

### Deploy to Cloudflare Pages

Deploying Lubulu requires four steps: **Deploy Code → Create Resources → Bind Resources → Initialize Database**

---

#### **Step 1: Deploy Code to Cloudflare Pages**

**Option A: Use Cloudflare Dashboard (Recommended)** 🎯

1. **Push code to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create Pages project in Cloudflare**:
   - Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Go to **Workers & Pages** → Click **Create application**
   - Select **Pages** → **Connect to Git**
   - Authorize and select your GitHub repository

3. **Configure build settings**:
   - **Project name**: `lubulu` (or any name)
   - **Production branch**: `main`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - Click **Save and Deploy**

4. **First deployment will fail** - This is expected! KV and D1 aren't created yet.

---

**Option B: Use Wrangler CLI** ⌨️

```bash
# Build and deploy
npm run build
npx wrangler pages deploy dist --project-name=lubulu
```

If prompted to create new project, confirm with `y`.

---

#### **Step 2: Create D1 Database and KV Namespace in Dashboard**

**Create D1 Database**:

1. In Cloudflare Dashboard left menu, click **Workers & Pages**
2. Switch to **D1 SQL Database** tab
3. Click **Create database** button
4. Configure:
   - **Database name**: `lubulu-db`
   - **Location**: Choose closest region (recommended **Automatic**)
5. Click **Create** to create the database

**Create KV Namespace**:

1. In Cloudflare Dashboard left menu, click **Workers & Pages**
2. Switch to **KV** tab
3. Click **Create a namespace** button
4. Configure:
   - **Namespace Name**: `SETTINGS` (or any name, used in binding later)
5. Click **Add** to create the namespace

---

#### **Step 3: Bind Resources to Pages Project**

Return to your Pages project and bind the newly created resources:

1. **Enter project settings**:
   - In **Workers & Pages**, select your `lubulu` project
   - Go to **Settings** tab

2. **Bind D1 database**:
   - Scroll to **Functions** section
   - Find **D1 database bindings** area
   - Click **Add binding**
   - Configure:
     - **Variable name**: `DB` (must match exactly)
     - **D1 database**: Select `lubulu-db`
   - Click **Save**

3. **Bind KV namespace**:
   - In the same page, find **KV namespace bindings** area
   - Click **Add binding**
   - Configure:
     - **Variable name**: `SETTINGS` (must match exactly)
     - **KV namespace**: Select your `SETTINGS` namespace
   - Click **Save**

---

#### **Step 4: Initialize Database**

Run migration scripts via D1 Console:

1. **Enter D1 Console**:
   - In Dashboard, open **Workers & Pages** → **D1 SQL Database**
   - Select `lubulu-db` database
   - Click **Console** tab

2. **Execute Migration SQL**:

   Open [`migrations/all.sql`](migrations/all.sql) in your local project, copy all content, paste into console, and click **Execute**.

   This file contains all required database structures and indexes.

3. **Verify Table Structure**:

   After successful execution, run the following SQL in console:
   ```sql
   SELECT name FROM sqlite_master WHERE type='table';
   ```

   You should see the `spin_history` table.

---

#### **Step 5: Redeploy and Verify**

1. **Trigger Redeployment**:
   - Return to Pages project's **Deployments** tab
   - Click the **⋯** menu on the latest deployment
   - Select **Retry deployment**

2. **Verify Functionality**:

   After successful deployment, visit `https://lubulu.pages.dev` (or your custom domain).

   **Test functionality**:
   - ✅ First visit should show the roulette interface
   - ✅ Adjust probability and click "Spin"
   - ✅ View history and statistics

**If you encounter errors**, check the "Troubleshooting" section below.

---

### Local Development

```bash
# Start Vite dev server (frontend only, no backend API)
npm run dev
# → http://localhost:5173

# Preview with Wrangler locally (full functionality with Workers API)
npm run preview
# → http://localhost:8788
```

**Note**: `npm run preview` requires local binding configuration. Recommend developing directly in Dashboard, or check [Wrangler local development docs](https://developers.cloudflare.com/workers/wrangler/commands/#dev).

---

## Architecture

### Edge-First Design

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────┐
│   Cloudflare Edge (300+ DCs)   │
├─────────────┬───────────────────┤
│   Worker    │   Pages (Static)  │
│   (API)     │   (HTML/CSS/JS)   │
└──────┬──────┴───────────────────┘
       │
       ↓
┌──────────────────┐
│  Storage Layer   │
├──────────────────┤
│ KV: Settings     │ ← Fast reads
│ D1: History      │ ← SQL queries
└──────────────────┘
```

### Storage Strategy

**Why split storage?**

| Layer | Purpose | Latency |
|-------|---------|---------|
| **KV** | User settings, pity counter | ~10ms (cached) |
| **D1** | Spin history, statistics | ~50ms (SQL) |

**Principle**: Hot data (settings) in KV, cold data (history) in D1.

---

## API Documentation

### `POST /api/spin`
Execute a wheel spin

**Response:**
```json
{
  "result": "lu",
  "isLu": true,
  "sliceIndex": 23,
  "isPityTriggered": false,
  "pityCounter": 4,
  "date": "2025-01-15"
}
```

### `GET /api/history`
Retrieve spin records

**Query Parameters:**
- `limit` - Max records (default: 100)

**Response:**
```json
{
  "history": {
    "2025-01-15": {
      "result": "no_lu",
      "isPityTriggered": false,
      "timestamp": "2025-01-15T12:34:56Z"
    }
  }
}
```

### `GET /api/settings`
Get user configuration

**Response:**
```json
{
  "settings": {
    "luProbability": 5,
    "pityDays": 7,
    "multiMode": false
  },
  "pityCounter": {
    "consecutiveFails": 4,
    "threshold": 7
  }
}
```

### `PUT /api/settings`
Update configuration

**Request Body:**
```json
{
  "settings": {
    "luProbability": 10,
    "pityDays": 5,
    "multiMode": true
  }
}
```

### `GET /api/stats`
Get aggregated analytics

**Response:**
```json
{
  "stats": {
    "total": 150,
    "luCount": 18,
    "noLuCount": 132,
    "successRate": "88.0"
  }
}
```

---

## Development

### Local Environment

```bash
# Frontend dev server
npm run dev
# → http://localhost:5173

# Build for production
npm run build

# Test with Workers locally
npm run preview
# → http://localhost:8788
```

### Project Structure

```
lubulu/
├── src/worker/              # Edge backend
│   ├── index.js            # Request router
│   ├── auth.js             # UUID authentication
│   ├── storage.js          # D1 + KV wrapper
│   ├── game-logic.js       # Probability engine
│   └── handlers/           # API endpoints
│       ├── spin.js         # Spin logic
│       ├── history.js      # CRUD operations
│       ├── settings.js     # Config management
│       └── stats.js        # Analytics
├── public/                  # Frontend
│   ├── index.html
│   ├── main.js             # App bootstrap
│   ├── styles.css
│   └── js/
│       ├── api/client.js   # HTTP client
│       └── core/
│           ├── roulette-renderer.js
│           └── calendar.js
├── migrations/
│   └── 0001_init.sql       # Database schema
├── wrangler.toml           # Cloudflare config
└── vite.config.js          # Build config
```

---

## Configuration

### Resource Bindings

**Important**: For Cloudflare Pages deployments, **DO NOT** configure KV and D1 bindings in `wrangler.toml`.

All resource bindings must be configured in Cloudflare Dashboard:

1. Go to **Workers & Pages** → Your project → **Settings** → **Functions**
2. Add the following bindings:
   - **KV Namespace Binding**:
     - Variable name: `SETTINGS`
     - KV namespace: Select your created namespace
   - **D1 Database Binding**:
     - Variable name: `DB`
     - D1 database: Select `lubulu-db`

See Step 4 in the "Quick Start" section above for detailed instructions.

### Environment Variables

The only required configuration in `wrangler.toml`:

```toml
name = "lubulu"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"

[vars]
ENVIRONMENT = "production"
```

To add other environment variables, configure them in Dashboard under **Settings** → **Environment variables**.

---

## Database Schema

### `spin_history` Table

```sql
CREATE TABLE spin_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,           -- YYYY-MM-DD
  result TEXT CHECK(result IN ('lu', 'no_lu')),
  is_pity INTEGER DEFAULT 0,
  timestamp INTEGER NOT NULL,   -- Unix epoch
  UNIQUE(user_id, date)
);

CREATE INDEX idx_user_date ON spin_history(user_id, date);
CREATE INDEX idx_user_timestamp ON spin_history(user_id, timestamp);
```

---

## Authentication

### Anonymous UUID System

```
First Visit → Generate UUID → Store in Cookie (1yr TTL)
                    ↓
              All Requests → Include UUID in Header/Cookie
                    ↓
              Backend → Isolate data by UUID
```

**Trade-offs:**
- ✅ Zero friction (no signup)
- ✅ GDPR compliant (no PII)
- ✅ Fast implementation
- ❌ Cookie deletion = data loss
- ❌ No cross-browser sync

---

## Performance

### Benchmarks

| Metric | Target | Actual |
|--------|--------|--------|
| First Contentful Paint | < 1s | ~400ms |
| API Latency (P95) | < 200ms | ~80ms |
| Bundle Size | < 5KB | 2.8KB (gzip) |
| Build Time | < 5s | ~1s |

### Optimizations

1. **Edge Caching** - KV data cached at 300+ POPs
2. **SQL Indexing** - Composite indexes on hot paths
3. **Tree Shaking** - Vite removes unused code
4. **Code Splitting** - Lazy load non-critical modules

---

## Automated Deployment

### GitHub Actions Auto-Deploy (Recommended) 🤖

After completing Steps 1-4 in "Quick Start" above, you can configure GitHub Actions for automatic deployment.

**Prerequisites**:
- Completed KV/D1 resource creation and binding (see "Quick Start" above)
- Already created Pages project in Cloudflare Dashboard

**Configuration Steps**:

1. **Get Cloudflare API credentials**:
   - Visit [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Click your profile icon → **My Profile** → **API Tokens**
   - Click **Create Token** → Use "Edit Cloudflare Workers" template
   - Copy the generated **API Token**
   - Return to Dashboard homepage, copy **Account ID** (in right sidebar)

2. **Add GitHub Secrets**:
   - Open your GitHub repository
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**, add:
     - `CLOUDFLARE_API_TOKEN` = Your API token
     - `CLOUDFLARE_ACCOUNT_ID` = Your account ID

3. **Trigger auto-deployment**:
   ```bash
   git add .
   git commit -m "Setup auto deployment"
   git push origin main
   ```

**How it works**:

Every push to `main` branch, GitHub Actions automatically:
- ✅ Installs dependencies
- ✅ Runs build (`npm run build`)
- ✅ Deploys to Cloudflare Pages
- ✅ Triggers redeployment (applies latest bindings)

Check deployment status:
- GitHub: Repository **Actions** tab
- Cloudflare: **Workers & Pages** → Your project → **Deployments**

**Workflow file**: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

---

### Other Deployment Methods

#### Manual CLI Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=lubulu
```

**Note**: Still requires manual KV and D1 binding in Dashboard.

#### Cloudflare Git Integration

If not using GitHub Actions, you can configure Git integration in Cloudflare Dashboard:

1. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Select repository and configure:
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
3. Each push automatically triggers build and deploy

**Note**: Still requires manual KV and D1 binding as described in "Quick Start".

---

## Cost Analysis

### Cloudflare Free Tier (10k DAU supported)

| Resource | Quota | Est. Usage |
|----------|-------|------------|
| Workers Requests | 100k/day | ~2k/day |
| Pages Builds | Unlimited | - |
| D1 Storage | 5GB | < 10MB |
| D1 Reads | 5M/day | ~5k/day |
| KV Reads | 100k/day | ~1k/day |
| KV Writes | 1k/day | ~200/day |

**Total: $0/month** for typical usage

---

## Troubleshooting

### "Unauthorized" Error
```bash
# Clear cookies and refresh
# Check UUID generation in browser console
```

### "Database not found"
```bash
# Verify wrangler.toml has correct database_id
npx wrangler d1 list
```

### "KV namespace not found"
```bash
# Verify wrangler.toml has correct KV id
npx wrangler kv:namespace list
```

### Build Fails
```bash
# Ensure Node.js >= 18
node -v

# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## Monitoring

### Real-time Logs

```bash
# Stream all logs
npx wrangler tail

# Filter errors only
npx wrangler tail --status error

# Filter specific endpoint
npx wrangler tail --search "/api/spin"
```

### Data Inspection

```bash
# Query spin history
npx wrangler d1 execute lubulu-db \
  --command "SELECT * FROM spin_history ORDER BY timestamp DESC LIMIT 10"

# List KV keys
npx wrangler kv:key list --namespace-id=<YOUR_KV_ID>

# Read KV value
npx wrangler kv:key get "user:abc-123:settings" \
  --namespace-id=<YOUR_KV_ID>
```

---

## Design Philosophy

Built on three principles:

### 1. Simplicity First
- Vanilla JavaScript (no frameworks)
- ~1,500 lines total
- Zero build-time magic

### 2. Data Structures Drive Code
- Schema designed before implementation
- Storage layer dictates API shape
- No impedance mismatch

### 3. Edge-Native Thinking
- Compute near users
- Cache hot data globally
- Minimize round trips

*"Good design eliminates special cases." - Linus Torvalds*

---

## Limitations

- **D1 Write Conflicts** - Concurrent updates to same row may fail (rare)
- **KV Consistency** - Global propagation takes ~60s
- **Cookie Dependency** - Clearing cookies = lost access
- **No Password Recovery** - Anonymous auth has no recovery flow

---

## Roadmap

### v1.1 (Next)
- [ ] Enhanced spin animations
- [ ] Dark mode theme
- [ ] Mobile-optimized layout

### v1.2 (Future)
- [ ] Optional password protection
- [ ] JSON data export
- [ ] Advanced statistics (charts)

### v2.0 (Long-term)
- [ ] Team/collaborative mode
- [ ] WebSocket real-time sync
- [ ] PWA offline support

---

## Contributing

Pull requests welcome! Please:

1. Fork the repo
2. Create feature branch (`git checkout -b feature/cool-thing`)
3. Write clear commits (`git commit -m 'Add cool thing'`)
4. Push to branch (`git push origin feature/cool-thing`)
5. Open Pull Request

---

## License

MIT License - see [LICENSE](LICENSE)

---

## Resources

- **Setup Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **D1 Reference**: https://developers.cloudflare.com/d1/
- **Issue Tracker**: GitHub Issues

---

## Support

- 🐛 **Bug Reports**: Open GitHub Issue
- 💡 **Feature Requests**: GitHub Discussions
- 📖 **Documentation**: Check DEPLOYMENT.md
- 💬 **Questions**: GitHub Discussions

---

**Built with Cloudflare Workers. Deployed globally. Works everywhere.**
