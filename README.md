# ISKER — Construction Management App

React Native (Expo) app for ISKER construction project management.
Data is pulled live from Google Sheets — no backend required.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the dev server

```bash
npx expo start
```

### 3. Open on your phone

- Download **Expo Go** from the App Store or Google Play
- Scan the QR code shown in the terminal
- The app opens instantly — no build required

### 4. Open in browser (web)

Press `w` in the terminal after `expo start`.

---

## Project Structure

```
isker-app/
├── app/
│   ├── _layout.tsx              # Root navigator
│   ├── index.tsx                # Home — projects list
│   ├── project/
│   │   └── [id].tsx             # Project overview — metrics grid
│   └── detail/
│       └── [projectId]/
│           └── [section].tsx    # Detail page (workers, budget, etc.)
├── components/
│   └── ui.tsx                   # Shared UI components
├── hooks/
│   └── useSheetData.ts          # Google Sheets data fetching + types
├── constants/
│   └── index.ts                 # Colors, Sheet ID, config
└── README.md
```

---

## Google Sheets Setup

The Sheet ID is already configured in `constants/index.ts`:

```
SHEET_ID = '1CVvkZMdjxXG8fBdRJskg3g5fsXMmuzfG6bHdR5WWn9k'
```

**Make sure the sheet is public:**
1. Open the Google Sheet
2. File → Share → Share with others
3. Change to "Anyone with the link" → Viewer
4. Click Done

Data refreshes on pull-to-refresh in any screen.

---

## Sections available per project

| Section    | What it shows |
|------------|---------------|
| `workers`  | Team list, departments bar chart, attendance rings |
| `equipment`| Fleet list, type breakdown, utilization rings |
| `budget`   | KPIs, spend progress, category breakdown, monthly rows |
| `cpi`/`spi`| EVM metrics — CPI, SPI, EAC, variance trend |
| `schedule` | Milestones by phase with progress bars |
| `issues`   | Issue tracker with priority and status badges |
| `reports`  | Daily site reports with weather and incident flags |

---

## Next Steps

- [ ] Add Google Sheets OAuth for write-back (daily report submission)
- [ ] Add push notifications for threshold alerts (CPI < 0.9, etc.)
- [ ] Add photo upload for daily reports
- [ ] Add offline caching with AsyncStorage
- [ ] Build native release with `eas build`
