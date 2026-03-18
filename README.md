# RoadTwin India – Supabase Version

> **Tech Stack**: React 18 · Vite · Tailwind CSS · Supabase (PostgreSQL + PostGIS + Auth + Storage) · Mapbox GL JS · Vercel

---

## ⚡ 5-Minute Setup

### Step 1 — Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `roadtwin-indore`, Region: **Singapore** (closest to India, has PostGIS)
3. Wait ~2 min for provisioning

### Step 2 — Run Schema SQL
Go to **SQL Editor** → New Query → paste entire contents of [`supabase/schema.sql`](./supabase/schema.sql) → Run

### Step 3 — Seed Demo Data
Paste and run [`supabase/seed.sql`](./supabase/seed.sql)

### Step 4 — Create Auth Users
Go to **Authentication** → **Users** → Add User for each:

| Name | Email | Password | Role (set after) |
|---|---|---|---|
| Super Admin | `admin@roadtwin.in` | `Admin@1234` | super_admin |
| PWD Engineer | `engineer@roadtwin.in` | `Engineer@1234` | municipal_engineer |
| Water Dept | `water@roadtwin.in` | `Utility@1234` | utility_dept |
| Field Supervisor | `field@roadtwin.in` | `Field@1234` | field_supervisor |

After creating them, go to **SQL Editor** and run this (replace UUIDs with actual user IDs from Auth → Users):

```sql
-- Get user IDs first:
-- SELECT id, email FROM auth.users;

INSERT INTO user_profiles (id, name, role_id, organization_id) VALUES
  ('<admin-uuid>',    'Super Admin',           (SELECT id FROM roles WHERE name='super_admin'),        '10000000-0000-0000-0000-000000000006'),
  ('<engineer-uuid>', 'Rajesh Kumar',           (SELECT id FROM roles WHERE name='municipal_engineer'), '10000000-0000-0000-0000-000000000001'),
  ('<water-uuid>',    'Priya Sharma (DJB)',     (SELECT id FROM roles WHERE name='utility_dept'),      '10000000-0000-0000-0000-000000000002'),
  ('<field-uuid>',    'Kumar Field Supervisor', (SELECT id FROM roles WHERE name='field_supervisor'),  '10000000-0000-0000-0000-000000000001');
```

### Step 5 — Create Storage Bucket
Go to **Storage** → New Bucket → Name: `complaint-photos` → Toggle **Public** → Create

### Step 6 — Get API Keys
Go to **Project Settings** → **API**:
- Copy `Project URL`
- Copy `anon public` key

### Step 7 — Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local:
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_MAPBOX_TOKEN=pk.eyJ...  # from mapbox.com (free)
```

### Step 8 — Run Locally
```bash
npm install  # already done if you followed earlier steps
npm run dev  # opens at http://localhost:5173
```

---

## 🌐 Deploy to Vercel (5 min)

```bash
# Push to GitHub
git init && git add . && git commit -m "RoadTwin Supabase"
git remote add origin https://github.com/YOUR_USERNAME/roadtwin-supabase.git
git push -u origin main
```

1. Go to [vercel.com](https://vercel.com) → Import GitHub repo
2. Add **Environment Variables** (same 3 from `.env.local`)
3. Click Deploy → your app is live at `https://roadtwin-supabase.vercel.app`

Update Supabase **Settings → API → URL Configuration** → add your Vercel URL to allowed origins.

---

## 🔑 Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@roadtwin.in` | `Admin@1234` |
| PWD Engineer | `engineer@roadtwin.in` | `Engineer@1234` |
| Water Dept | `water@roadtwin.in` | `Utility@1234` |
| Field Supervisor | `field@roadtwin.in` | `Field@1234` |

**Public (no login):**
- Complaint form: `/report`
- Work info: `/public/PRM-2026-0001`

---

## 💡 Key Features

- **Role-based dashboards** — auto-filtered by Supabase RLS
- **GIS Map** — road health heatmap, permit polygons, utility lines, Road Passport slide-in
- **Conflict detection** — PostGIS `ST_Intersects` via Supabase RPC
- **Real-time permits** — Supabase realtime subscription
- **Photo uploads** — Supabase Storage for complaints
- **Public pages** — no login required for complaint form + QR work pages

---

## 💰 Free Tier Limits

| Service | Free Limit |
|---|---|
| Supabase DB | 500MB |
| Supabase Storage | 1 GB |
| Supabase MAU | 50,000 |
| Vercel | Unlimited bandwidth |
| Mapbox | 50,000 loads/month |

**Upgrade trigger**: Supabase Pro ($25/mo) when DB > 500MB
