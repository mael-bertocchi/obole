# Claude Code Instructions

These guidelines apply to the entire project.

- The backend and web frontend use TypeScript.
- The mobile frontend uses Swift.
- Apply the same principles to all three codebases unless a language-specific convention requires otherwise.

## Documentation comments

Use the project's JSDoc/Doxygen hybrid style for constants, interfaces, types, classes, and functions.

### Requirements

- Use a `/** ... */` documentation block.
- Include the appropriate tag:
  - `@constant` for constants
  - `@interface` for interfaces
  - `@type` for type definitions
  - `@class` for classes
  - `@method` for methods
  - `@function` for functions
- Include `@description` in every documentation block.
- Document interface and object properties with inline comments in this format:
  `/*!< Comment text */`

### Example

```typescript
/**
 * @interface User
 * @description Represents a system user
 */
export interface User {
    id: string; /*!< Unique identifier */
}
```

## Coding standards

### Types and nullability

- Use `interface` for data structures.
- Use `Maybe<T>` for nullable values (`T | null`).
- Use `Perhaps<T>` for optional values (`T | undefined`).

### Type safety

- Do not use TypeScript type assertions with `as`.
- Use schema validation or type guards to narrow types.
- Use `unknown` only when a cast is unavoidable and no safer alternative exists.

### Control flow

- Prefer early returns and guard clauses to reduce nesting.
- Always use braces for `if` and `else` blocks, even when the block contains only one statement.

```typescript
// Bad
if (x) return;
if (x) { return; }

// Good
if (x) {
    return;
}
```

### Functions

- Always specify an explicit return type, such as `: void` or `: Promise<void>`.

### HTML and JSX

- Keep simple tags on one line.
- Split a tag across multiple indented lines when it has more than two attributes or exceeds the standard line length.

## Commit and push workflow

When pending changes are ready, use the following workflow:

1. Group changes by intent, not by file.
2. Squash changes that are too small to stand alone into the related commit.
3. Create a commit using Conventional Commits, matching the style already used in the repository:
   - Use a lowercase description.
   - Use an optional scope in parentheses.
   - Keep the message to exactly one line.
   - Do not add a body, co-author trailer, or tool-attribution trailer.
4. Do not push. Push only when the user explicitly asks for it in the current conversation; otherwise, once committed, stop and ask.

### Version bumps

Create version bumps in a separate commit for each repository touched. Determine the version change using SemVer:

- Bug fix: patch version
- New capability: minor version
- Breaking change: major version

When the project uses both files, update `package.json` and `package-lock.json` together. Use this commit format:

```text
chore: bump version to X.Y.Z
```
