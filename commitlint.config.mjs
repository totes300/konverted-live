/**
 * Enforces the commit format documented in the `conventional-commits` skill.
 * Wired to the `commit-msg` hook in `lefthook.yml`.
 *
 * `@commitlint/config-conventional` already supplies the type enum (the eleven
 * standard types), lowercase types, a non-empty subject that may not start
 * upper-case or end in a period, and a 100 character body line limit. Only the
 * rules where this repo differs from those defaults are restated below.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Keep subjects scannable in `git log --oneline`. The default allows 100.
    "header-max-length": [2, "always", 72],

    // One canonical spelling per area, lowercase. `kebab-case` is the obvious
    // choice and is wrong: it rejects a scope whose first word carries a digit,
    // so `a11y`, `i18n` and `oauth2` all fail it. `lower-case` still rejects
    // `IDE` and `pageBuilder`. config-conventional constrains neither.
    "scope-case": [2, "always", "lower-case"],

    // Without the blank line git folds the body into the subject, so this is a
    // correctness rule rather than a style one. Both are warnings by default.
    "body-leading-blank": [2, "always"],
    "footer-leading-blank": [2, "always"],
  },
};
