# Daggboard - AggLayer Bridge Analytics Dashboard

A minimalistic React TypeScript dashboard for visualizing AggLayer bridge data with DuckDB integration.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📊 Data Structure

The dashboard reads directly from `data.duckdb` with these key tables:
- `rollups` - Network information and sync status
- `bridge_events` - L1 to L2 bridge transactions (Assets)
- `claim_events` - L2 claim transactions (Liabilities) 
- `new_wrapped_token_events` - Token wrapping events
- `bridge_transfer_events` - Transfer events
- `wrapped_transfer_events` - Wrapped token transfers

## 🌐 Deployment

The application serves the database file statically from the `public/` folder, making it deployable to any static hosting service like Vercel, Netlify, or GitHub Pages.

## ⚠️ Note

Ensure `data.duckdb` is present in the `public/` folder before starting the application. The dashboard will show loading states until the database connection is established.