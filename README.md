# Apollo Reborn

On-demand workouts, structured training programs, and practical nutrition tools — delivered as a web app and native iOS / Android apps via Capacitor.

## Setup

```sh
npm install
```

## Development

```sh
npm run dev
```

## Build (web)

```sh
npm run build
```

## Build (iOS)

```sh
npm run build
npx cap sync ios
open ios/App/App.xcworkspace
```

## Build (Android)

```sh
npm run build
npx cap sync android
open -a "Android Studio" android
```

## Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Capacitor (iOS / Android)
- Supabase (auth, database, storage, edge functions)
- RevenueCat (subscriptions)
