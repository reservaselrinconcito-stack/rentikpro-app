![Release Pipeline](https://github.com/reservaselrinconcito-stack/rentikpro-app/actions/workflows/release.yml/badge.svg)
![Release Healthcheck](https://github.com/reservaselrinconcito-stack/rentikpro-app/actions/workflows/release-healthcheck.yml/badge.svg)

# RentikPro - Property Management App

This is a file-based property management application designed for Tauri.

## Tech Stack
- **Frontend**: React 18+, TypeScript, Tailwind CSS
- **Database**: SQLite (via `sql.js` in browser, native SQLite in Tauri)
- **Icons**: Lucide React

## Local Development (Browser Preview)
```bash
npm install
npm run dev
```

## Desktop Development (Tauri)
To run as a native desktop app:
1. Ensure you have the [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) installed.
2. Run:
```bash
npm run tauri dev
```

## Project Concept
Unlike SaaS apps, RentikPro stores data in standard SQLite files (`*.rentikpro.sqlite`). 
The user can manage these files like regular documents, allowing for easy backups, 
versioning, and multi-device sync via cloud folders (iCloud, Dropbox, etc).
