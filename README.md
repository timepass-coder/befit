# Gym App

A cross-platform gym workout tracking application built with React Native and Expo.

## Platforms

- Android
- iOS
- Web

## Technology

- React Native
- Expo
- TypeScript

## Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npx expo start
```

Start Web:

```bash
npx expo start --web
```

## Project Structure

```text
app/
  Expo Router routes and application entry points

src/
  Application source code

assets/
  Static application assets

docs/
  Project documentation
```

## Architecture

See:

```text
docs/architecture/README.md
```

for application architecture and development conventions.

## Design System

See:

```text
docs/design-system/README.md
```

for design-system conventions and reusable UI components.

## Development Philosophy

The application is developed incrementally.

Each iteration should:

1. Introduce a focused feature or foundation.
2. Be independently testable.
3. Preserve existing functionality.
4. Be manually reviewed before the next iteration begins.

The application should not be considered complete merely because it compiles.
