---
name: commit
description: Conventional Commits
---

Write a commit message with the current changes following the format below, in English. Finally use the terminal to write the commit.

# Conventional Commits

Follow the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) standard to create consistent and readable commit messages.

## Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Main Types

- `feat`: A new feature or functionality
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Formatting changes (whitespace, semicolons, etc.) without affecting code behavior
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or correcting tests
- `build`: Changes to the build system or dependencies
- `ci`: Changes to CI/CD configuration
- `chore`: General maintenance tasks

## Scope (Optional)

The scope provides additional context about which part of the codebase was affected:

```
feat(auth): add login with Google
fix(api): resolve timeout issue
docs(readme): update installation steps
```

## Breaking Changes

For changes that break compatibility, use `!` or the `BREAKING CHANGE:` footer:

```
feat!: remove support for legacy API
```

Or:

```
feat: update authentication flow

BREAKING CHANGE: old auth tokens are no longer valid
```

## Examples

### Simple Example
```
feat: add user profile page
```

### With Scope
```
fix(database): resolve connection timeout
```

### With Body
```
feat: implement dark mode

Add dark mode toggle in settings panel.
Update all components to support theme switching.
```

### With Footer
```
fix: prevent memory leak in video player

Close all streams properly on component unmount.

Refs: #123
```

### Breaking Change
```
feat(api)!: change response format for user endpoints

BREAKING CHANGE: API now returns user data in snake_case instead of camelCase
```

## Best Practices

1. Use the imperative mood in the description: "add" not "added" or "adds"
2. Don't capitalize the first letter of the description
3. Don't use a period at the end of the description
4. Keep the description brief (maximum 50-72 characters)
5. Use the body to explain the "what" and "why", not the "how"
6. One commit = one logical change
