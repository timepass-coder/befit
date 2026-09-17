# BeFit — AI Coding Standards

This document defines the coding and validation standards that every AI coding agent must follow when working on BeFit.

---

## 1. Before Starting Any Task

Before writing code, the agent MUST:

- Read this file.
- Read the relevant iteration requirements.
- Inspect the existing implementation and project structure.
- Search for existing components, hooks, utilities, types, services, and logic that can be reused.
- Understand how similar functionality is already implemented.
- Identify which files actually need to change.

### Important

**Do not rewrite, delete, or replace existing code unnecessarily.**

If existing code is used in multiple places, preserve it or safely update all affected usages.

Do not introduce a new pattern when an established project pattern already exists.

---

# 2. Iteration-Based Development

BeFit is developed incrementally through iterations.

For each task:

- Implement only the functionality required by the current iteration.
- Do not implement features belonging to future iterations.
- Preserve functionality from previous iterations.
- Avoid unrelated refactoring.
- Keep each iteration independently testable.

If a requirement is unclear and could affect architecture, data, security, or user behavior, ask before making assumptions.

---

# 3. TypeScript Standards

TypeScript must be used consistently.

### Required

- Prefer strong, explicit types.
- Define proper types/interfaces for shared data and API responses.
- Type component props.
- Type function parameters and return values when inference is insufficient.
- Use union types for fixed values.

Example:

```ts
type WorkoutStatus = 'planned' | 'active' | 'completed';
```

### Avoid

```ts
any;
```

Use `unknown` when the type is genuinely unknown and narrow it safely.

Avoid unnecessary:

```ts
as SomeType
```

Do not use type assertions to hide TypeScript errors.

Do not use `@ts-ignore` or similar suppression unless there is a documented, unavoidable reason.

---

# 4. React Standards

- Keep components focused and reasonably small.
- Use reusable components instead of duplicating UI.
- Keep business logic out of presentational components where practical.
- Use custom hooks for reusable stateful logic.
- Avoid unnecessary global state.
- Prefer existing project components and patterns.
- Do not add state, effects, memoization, or abstractions without a reason.

Avoid unnecessary `useEffect`, `useMemo`, and `useCallback`.

Follow React's rules of hooks.

---

# 5. Code Structure & Naming

Follow the existing project structure.

Use:

- `PascalCase` for React components.
- `camelCase` for functions, hooks, and utilities.
- `UPPER_SNAKE_CASE` for constants where appropriate.
- Clear, descriptive names.

Examples:

```text
WorkoutCard.tsx
ExerciseList.tsx
useWorkout.ts
formatDuration.ts
```

Avoid meaningless names such as:

```text
data
temp
thing
foo
value1
```

unless the context makes them genuinely clear.

Prefer small, focused modules over large files containing unrelated responsibilities.

---

# 6. Code Reuse

Before creating new code:

1. Search for existing functionality.
2. Check whether an existing component/util/hook can be extended.
3. Reuse existing types and constants.
4. Only create new abstractions when they provide real value.

Do not duplicate logic simply because it is faster.

Do not create multiple versions of the same component or utility.

---

# 7. UI Standards

For UI changes:

- Follow the existing design system.
- Reuse existing components.
- Follow existing colors, typography, spacing, and interaction patterns.
- Keep layouts responsive.
- Consider mobile, tablet, and desktop.
- Provide appropriate loading, empty, and error states.
- Avoid arbitrary hardcoded styles when project tokens/utilities already exist.

### Accessibility

Use semantic HTML and accessible controls.

Ensure:

- Buttons are actual buttons.
- Form fields have labels.
- Interactive elements are keyboard accessible.
- Focus states are preserved.
- Images have appropriate `alt` text.
- Information is not communicated by color alone.

---

# 8. Error Handling & Validation

Never assume external or user-provided data is valid.

Handle appropriate:

- Invalid input
- Missing data
- API failures
- Network errors
- Empty states
- Loading states
- Unexpected responses

Do not silently swallow errors.

Avoid empty catch blocks:

```ts
try {
  ...
} catch {
}
```

unless intentionally justified.

Never expose secrets or sensitive information in errors or logs.

---

# 9. Security

Never hardcode:

- API keys
- Passwords
- Tokens
- Secrets
- Private credentials

Do not commit secret environment files.

Validate and authorize sensitive operations on the server where applicable.

Never disable security protections simply to make an implementation work.

Do not log sensitive user or authentication information.

---

# 10. Dependencies

Before adding a dependency:

- Check whether the project already has a suitable solution.
- Check whether native/framework functionality is sufficient.
- Consider bundle size and maintenance.
- Use the project's existing package manager.

Do not upgrade unrelated dependencies during a feature implementation.

---

# 11. Comments & Logging

Write comments only when they explain **why** something is necessary or non-obvious.

Do not add comments explaining obvious code.

Remove temporary debugging code before completion.

Do not leave unnecessary:

```ts
console.log(...)
```

in production code.

---

# 12. Testing

Every meaningful feature or bug fix must have appropriate testing.

Test behavior, not implementation details.

Where applicable cover:

- Normal/happy path
- Edge cases
- Invalid input
- Error states
- Important user interactions
- Regression scenarios

Do not create meaningless tests solely to increase coverage.

---

# 13. Mandatory Validation

After implementing a change, the agent MUST inspect `package.json` and run the project's available validation commands.

At minimum, check for and run the applicable equivalents of:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Do **not** assume these exact scripts exist.

Use the project's actual scripts.

### Validation order

Run:

1. **ESLint**
2. **TypeScript type checking**
3. **Tests**
4. **Production build**

If a check fails:

1. Determine whether the failure was caused by the current change.
2. Fix the underlying issue.
3. Re-run the failed check.
4. Re-run related checks when necessary.

Never:

- Disable ESLint rules just to pass validation.
- Add `@ts-ignore` just to pass type checking.
- Delete functionality to avoid errors.
- Claim validation passed without actually running it.

---

# 14. Regression Check

After implementation, verify that:

- The new feature works.
- Existing related functionality still works.
- Shared components still work correctly.
- Existing routes/pages are not broken.
- No unintended behavior was introduced.

For UI changes, manually verify the relevant user flow when possible.

---

# 15. Build & Dependency Integrity

Before completion:

- Ensure imports are valid.
- Ensure there are no unused imports or variables.
- Ensure TypeScript has no errors.
- Ensure linting passes.
- Ensure tests pass where available.
- Ensure the production build succeeds where applicable.
- Ensure no unnecessary dependency or configuration changes were introduced.

---

# 16. Handling Existing Errors

If validation fails because of an issue that existed before the current task:

- Do not incorrectly attribute it to the current implementation.
- Clearly identify it as a pre-existing issue.
- Do not modify unrelated code merely to hide it unless fixing it is explicitly requested or necessary.

If the current change introduces the error, it must be fixed before completion.

---

# 17. Definition of Done

A task is complete only when:

- [ ] Requirements for the current iteration are implemented.
- [ ] Existing functionality is preserved.
- [ ] Existing code was reused where appropriate.
- [ ] TypeScript is properly typed.
- [ ] No unnecessary `any`/type suppression is used.
- [ ] UI is responsive and accessible where applicable.
- [ ] Errors and invalid states are handled.
- [ ] No secrets or sensitive information are exposed.
- [ ] No unnecessary dependencies were added.
- [ ] No unrelated refactoring was performed.
- [ ] ESLint passes.
- [ ] TypeScript/typecheck passes.
- [ ] Relevant tests pass.
- [ ] Production build passes when applicable.
- [ ] Introduced errors are fixed.
- [ ] Relevant regression checks are completed.

---

# 18. Final Agent Report

After completing the task, provide a concise report:

```text
## Implementation
- What was implemented
- Important files changed

## Validation
✓ ESLint
✓ TypeScript
✓ Tests
✓ Production build

## Regression
- What was verified

## Notes
- Assumptions
- Pre-existing issues
- Remaining limitations
```

Only mark a validation item as passed if it was actually executed.

---

## Core Development Workflow

**Read → Inspect → Plan → Implement → Lint → Typecheck → Test → Build → Regression Check → Report**

The agent must prioritize:

**Correctness → Type Safety → Maintainability → Security → Accessibility → Performance**
