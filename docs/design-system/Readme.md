# Gym App — Design System

## Purpose

The design system provides reusable visual foundations and UI components for the Gym App.

Its purpose is to keep the application visually consistent across Android, iOS, and Web.

## Design Tokens

The design system currently defines:

- Colors
- Spacing
- Typography
- Border radius
- Themes

These are located in:

```text
src/theme/
```

## Components

Reusable UI components are located in:

```text
src/components/ui/
```

Current components include:

- Button
- Card
- Text

Additional components should be added when a genuine shared requirement exists.

## Component Guidelines

Shared components should be:

- Reusable
- Simple
- Platform-aware where necessary
- TypeScript typed
- Accessible where applicable
- Independent of specific business features

Feature-specific components should remain inside their feature module.

## Design Tokens

Avoid scattering arbitrary values throughout the application when an existing design token represents the same concept.

For example, prefer the application's spacing scale over unrelated padding values.

## Themes

The application foundation supports light and dark theme definitions.

Components should eventually consume theme values rather than hardcoding colors.

## Showcase

During development, the application entry screen may be used as a temporary design-system showcase.

The showcase is not a product feature and should eventually be replaced when the real application navigation and screens are implemented.
