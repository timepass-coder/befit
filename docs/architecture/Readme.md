# Gym App — Architecture

## Purpose

This document describes the application architecture and conventions used by the Gym App.

The goal is to keep the application modular, maintainable, testable, and easy to extend.

## High-Level Structure

```text
app/
  Expo Router routes and application entry points

src/
  Application source code

  components/
    Reusable UI and layout components

  features/
    Feature-specific application code

  navigation/
    Navigation-related configuration and helpers

  theme/
    Design tokens, themes, and styling foundations

  storage/
    Local persistence and storage abstractions

  utils/
    Generic utilities that are not specific to a feature

  types/
    Shared TypeScript types

  config/
    Application configuration
```

## Architecture Principles

### 1. Feature Isolation

Feature-specific code should remain inside its feature module.

Examples:

- Workout logic belongs in `src/features/workout`
- Nutrition logic belongs in `src/features/nutrition`
- Progress logic belongs in `src/features/progress`

### 2. Shared Code

Code that is genuinely reusable across multiple features belongs in shared modules.

Examples:

- Generic buttons → `src/components/ui`
- Shared types → `src/types`
- Design tokens → `src/theme`
- Generic utilities → `src/utils`

Do not move code into shared modules merely because it might be reusable in the future.

### 3. Routes vs Features

The `app/` directory is responsible for Expo Router routes and application entry points.

Business logic should not be placed directly inside route files when it belongs to a feature module.

### 4. Platform Independence

Prefer React Native and Expo APIs that work across Android, iOS, and Web.

Platform-specific implementations should only be introduced when necessary.

### 5. TypeScript

Use TypeScript throughout the application.

Avoid `any` unless there is a documented and justified reason.

### 6. Dependencies

Do not add a dependency unless it solves a real project requirement.

Prefer existing Expo and React Native capabilities when they are sufficient.

### 7. Documentation

Important architectural decisions should be documented so that future development remains consistent.

## Feature Structure

As features become implemented, they may use structures such as:

```text
features/
  workout/
    components/
    hooks/
    screens/
    services/
    types/
    utils/
```

The exact structure may evolve according to the complexity of the feature.

## Current Scope

The current project foundation does not contain implemented workout, nutrition, progress, profile, exercise, or program functionality.

Those features will be introduced incrementally in later iterations.
