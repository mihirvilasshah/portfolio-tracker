# All-in-One Portfolio App — Technical Specification  
### (React Native + Expo + TypeScript + Expo Router + Supabase + React Native Paper)

---

## Table of Contents
1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Asset Classes & Integration Approach](#4-asset-classes--integration-approach)
5. [Supabase Database Schema](#5-supabase-database-schema)
6. [Integration Patterns (Auth, Sync, Reconciliation)](#6-integration-patterns)
7. [Mobile App UX (React Native + Expo Router + RN Paper)](#7-mobile-app-ux-react-native--expo-router--react-native-paper)
8. [Security & Compliance](#8-security--compliance)
9. [Implementation Plan (Sprints)](#9-implementation-plan-sprints)
10. [Fallback Strategy](#10-fallback-strategy)
11. [Appendix](#11-appendix)

---

## 1. Overview

This mobile app provides a consolidated portfolio view across:

- **Indian Stocks & ETFs** (Zerodha, Groww)
- **US Stocks & ETFs** (INDmoney, Vested)
- **Mutual Funds** (via MFCentral/CAMS/KFin or CAS PDFs)
- **Crypto** (Binance, CoinDCX)
- **Unlisted Shares** (Precize)
- **Invoice Discounting** (Amplio)

The app:
- Normalizes all holdings into a single data model  
- Tracks real-time P&L and historical performance  
- Reconciles broker data with CAS/depository  
- Supports API integrations + CSV/PDF uploads  
- Runs on a modern, scalable serverless backend (Supabase)

---

## 2. Tech Stack

### **Frontend**
- **React Native**
- **TypeScript**
- **Expo**
- **Expo Router** (file-based navigation)
- **React Native Paper** (UI components)
- **React Query** or Supabase hooks
- Optional: Zustand/Jotai for lightweight state

### **Backend**
- **Supabase** (Postgres DB + Auth + Storage + Edge Functions)
- Supabase Row Level Security (RLS)
- Supabase Edge Functions for:
  - broker integrations  
  - sync jobs  
  - CAS parsing  
  - reconciliation logic  

### **Hosting**
- Expo EAS for builds + OTA updates  
- Supabase for backend hosting  

---

## 3. High-Level Architecture

### **Frontend Flow (React Native + Expo)**
1. User logs in through Supabase Auth  
2. User links external accounts (API key, OAuth, or document upload)  
3. App displays consolidated dashboard  
4. Portfolio & price data fetched from Supabase tables or Edge Functions  
5. UI stays in sync with real-time backend updates  

### **Backend (Supabase)**
- **Postgres DB** stores normalized holdings, users, transactions, instruments  
- **Edge Functions** communicate with:
  - Zerodha Kite API  
  - Groww Trade API  
  - Binance & CoinDCX API  
  - MFCentral/CAMS/KFin (if partner access)  
- **Cron Jobs** (Supabase or Cloudflare) run periodic syncs  
- **Storage** holds CAS PDFs, CSVs, logs  

### **Adapters (Edge Functions)**
Each provider has a dedicated adapter with:
- Auth handling (API key / OAuth / token refresh)  
- Fetch holdings & transactions  
- Normalize symbols → ISIN/FIGI  
- Insert/update Supabase DB  

---

## 4. Asset Classes & Integration Approach

### **Indian Stocks — Zerodha**
- Use Kite Connect REST & WebSocket APIs  
- Store tokens encrypted in DB  
- Sync holdings, positions, orders  
- WebSocket for LTP can be used client-side  

### **Indian Stocks — Groww**
- Groww Trade API (requires partner access)  
- Edge Function fetches portfolio + transactions  
- Sync periodically  

### **Mutual Funds — MFCentral / CAMS / KFin**
Two approaches supported:
1. **Partner APIs**  
2. **CAS PDF upload** → parsed → normalized  

CAS parsing is handled using a Supabase Edge Function.

### **US Stocks — Vested / INDmoney**
- Partner API if available  
- Otherwise CSV upload flow  

### **Crypto — Binance & CoinDCX**
- API key + secret stored encrypted  
- Server-side signed requests  
- Sync: balances, trades, deposit/withdraw history  
- Price WebSockets handled on frontend or via aggregated feeds  

### **Unlisted Shares — Precize**
- No public API  
- Support:
  - CSV upload  
  - Manual entry  
- Add partner API later if available  

### **Invoice Discounting — Amplio**
- No public/integration API found  
- CSV/manual entry for holdings  
- Support yield computation & maturity tracking  

---

## 5. Supabase Database Schema

### `users`
| column | type | description |
|--------|--------|-------------|
| id | uuid | Supabase Auth UID |
| email | text | |
| created_at | timestamp | |

### `linked_accounts`
| column | type | description |
|--------|--------|-------------|
| id | uuid | |
| user_id | uuid | FK → users |
| provider | text | zerodha/groww/binance/... |
| credentials_enc | text | encrypted JSON |
| last_synced_at | timestamp | |

### `instruments`
| column | type | description |
|--------|--------|-------------|
| id | uuid | |
| symbol | text | BTCUSDT, INFY, etc. |
| isin | text | nullable for crypto |
| name | text | |
| type | text | equity/mf/crypto/etc |
| currency | text | INR/USD/USDT |

### `positions`
| column | type | description |
|--------|--------|-------------|
| id | uuid | |
| user_id | uuid | |
| linked_account_id | uuid | |
| instrument_id | uuid | |
| quantity | numeric | |
| avg_price | numeric | |
| currency | text | |
| last_updated | timestamp | |

### `transactions`
| column | type | description |
|--------|--------|-------------|
| id | uuid | |
| user_id | uuid | |
| linked_account_id | uuid | |
| instrument_id | uuid | |
| type | text | buy/sell/dividend/etc |
| quantity | numeric | |
| price | numeric | |
| timestamp | timestamp | |

### `prices`
| column | type | description |
|--------|--------|-------------|
| instrument_id | uuid | |
| timestamp | timestamp | |
| price | numeric | |
| source | text | |

### `reconciliation_issues`
Tracks mismatches between broker vs CAS vs DP.

---

## 6. Integration Patterns

### **Authentication**
- Supabase Auth for users  
- Provider credentials encrypted with `pgp_sym_encrypt`  
- Decrypted only inside Edge Functions  

### **Sync Patterns**
1. **Webhooks** → for providers that support it  
2. **Polling (cron)** → Binance, CoinDCX, Groww, Zerodha  
3. **On-demand** → when user opens app  
4. **Document upload** → CAS/CSV

### **Normalization**
- Use ISIN as the canonical identifier when available  
- For crypto → use symbol + exchange  
- For mutual funds → ISIN from CAS mapping  

### **Reconciliation**
Daily/weekly job:
- Compare holdings from broker  
- With positions stored  
- With CAS data  
- Raise issues (quantity mismatch, missing instrument, missing transaction)

---

## 7. Mobile App UX (React Native + Expo Router + React Native Paper)

### **Navigation Structure (Expo Router)**

- `/` → Dashboard
- `/accounts` → Linked Accounts
- `/holdings` → Your Positions
- `/transactions` → Transaction History
- `/upload` → CAS/CSV Upload
- `/settings` → Preferences
- `/instrument/[id]` → Instrument Details


### **UI Components (React Native Paper)**
- AppBar for headers  
- Cards for holdings  
- List.Item for transactions  
- Dialog for API key entry  
- BottomNavigation or Drawer for main navigation  
- FAB for “Add account / Upload CAS”  

### **Key Screens**

#### **Dashboard**
- Summary card → net worth, total P&L  
- Asset allocation pie chart  
- Recently updated holdings  
- Sync status badges  

#### **Linked Accounts**
- List of providers  
- Connect via:
  - API key modal  
  - OAuth redirect  
  - Statement upload  

#### **Holdings**
- Grouped by asset class  
- Each card shows:
  - Symbol  
  - Quantity  
  - Current value  
  - P&L  
- Clicking a card opens full details  

#### **Transactions**
- Filter chips (Paper)  
- Paginated list  

#### **Reconciliation**
- Color-coded issue cards  
- Button to fix/sync  
- Upload CAS again  

---

## 8. Security & Compliance

- **Supabase RLS** ensures only owners can read/write their data  
- **API credentials stored encrypted** using `pgp_sym_encrypt`  
- **Edge Functions** prevent secrets from reaching frontend  
- **Audit logs** for all integrations  
- **JWT auth** enforced on all database operations  
- **Least privilege** access pattern  

---

## 9. Implementation Plan (Sprints)

### **Sprint 0 — Setup**
- Create Supabase project  
- Enable RLS, create schema  
- Initialize Expo + TypeScript + React Native Paper  
- Configure theming + navigation structure  

### **Sprint 1 — Core Functionality**
- Supabase Auth  
- Dashboard + holdings UI  
- Zerodha adapter (Edge Function)  
- Binance adapter  
- Price tracking  

### **Sprint 2 — Mutual Funds**
- CAS upload UI  
- Parse CAS in Edge Function  
- Store normalized MF data  

### **Sprint 3 — More Integrations**
- Groww adapter  
- CoinDCX adapter  
- US stocks (CSV upload or partner API)  

### **Sprint 4 — Enhancements**
- Push alerts (price triggers)  
- Data exports  
- Advanced analytics  
- Performance charts  

---

## 10. Fallback Strategy

When an official API is unavailable:

### **Tier 1 — Partner onboarding**
- Vested, INDmoney, Precize, Amplio may provide partner APIs privately  

### **Tier 2 — Statements**
- CSV upload for brokers/exchanges  
- CAS PDF for mutual funds  

### **Tier 3 — Manual entry**
- For unlisted shares  
- For invoice discounting holdings  

### **Tier 4 — Public pricing APIs**
- Alpha Vantage  
- Yahoo Finance  
- CoinGecko  

---

## 11. Appendix

### API Docs & Notes
- Zerodha Kite Connect  
- Groww developer API  
- Binance API  
- CoinDCX API  
- MFCentral / CAMS / KFin  
- CAS PDF parsing references  
- Supabase Edge Functions documentation  
- Expo Router documentation  
- React Native Paper documentation  

---

**Document End**

For questions or updates, refer to individual platform documentation links provided throughout this spec.