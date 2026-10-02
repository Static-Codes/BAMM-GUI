# Changelog

All notable changes to the BAMM GUI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The GUI version is tracked independently of the BAMM version and lives in
`scripts/version.js` (`GUI_VERSION`). Every release entry below matches the tag
and the value of `GUI_VERSION`.

As of v1.0.0.0, releases are built from this repository's HEAD and published as
release artifacts, and BAMM pulls the GUI from the `gui.zip` attached to the
latest release. The paths below therefore refer to the repository root only.

## [Unreleased]

- N/A

## [1.1.0.0]

### Removed

- Removed the `gui/` directory and `gui.zip` from this repository. Since
  v1.0.0.0, releases are published as artifacts built from this repository's
  HEAD and BAMM pulls the GUI from those artifacts rather than from a nested
  copy in the source tree. The `gui/` tree was a stale mirror of the root
  files and `gui.zip` a build of that mirror, so both are dead weight that only
  invited the two copies drifting apart.

### Changed

- Split five over-complex functions in `scripts/create/create_script.js` into
  named helpers, bringing each under the cognitive complexity limit of 15. This
  is a readability change only: no command text, alert message, disabled state,
  or selection behaviour is different.
  - `populateCommandSelect` (was 16): the per-command availability rules moved
    into `isCommandDisabled`, so "Browser", "Visit", "Feature:", and the
    everything-else default each read as one line.
  - `removeSelectedCommand` (was 27): the JavaScript-block removal path became
    `removeJsBlockCommand`, with `getJsBlockStartIndex`, `collectJsBlockIndices`,
    and `getNextIndexAfterDelete` naming the three decisions it used to bury in
    nested branches. `selectCommandAtIndex` replaces the two copies of the
    "highlight the child at this index" block.
  - `renderArguments` (was 16 in its per-argument callback): building an
    argument's markup moved into `buildArgGroup`, `renderArgOptions`,
    `renderArgTextInput`, and `buildArgOptionElement`, and the placeholder
    fallback into `getPlaceholder`.
  - `validateArguments` (was 30): each rule became its own function
    (`validateSecondsArgument`, `validateHeadersArgument`,
    `validateQuotedArgument`), with `requiresQuotedArgument` naming the
    commands that expect a quoted value, and `isQuotedString` replacing the
    local variable that shadowed what is now a function.
  - The execute button's click handler (was 45): argument collection, feature
    duplicate and proxy checks, JS-block transition checks, and command-text
    construction are now `collectArgumentValues`, `validateFeatureCommand`,
    `isJsModeTransitionValid`, and `buildCommandText` (plus
    `buildFeatureCommandText`, `buildStandardCommandText`, and
    `advanceAfterAddingCommand`). The handler is left as a readable sequence of
    guard clauses.
  - Dropped `.replace(/-/g, "-")` from command-name formatting; it replaced
    hyphens with hyphens and could not affect the result.

### Fixed

- Added the missing `lang="en"` attribute and a `<title>` element to
  `inactive.html`, along with the matching `<meta charset>` and viewport
  declarations. This resolves the `html-has-lang` and `document-title`
  accessibility audits for the "GUI is not currently active" page.
- Removed the duplicate `color` declaration in the `.action-button` rule of
  `styles/create_script.css`. The rule declared `color: var(--white)` and then
  overrode it with `color: invert(var(--page-header-txtColor))`; the redundant
  first declaration is gone and the theme-aware declaration is now the only one,
  so rendering is unchanged.
- Fixed an undeclared-variable bug in the export handler in `index.html`. The
  filename re-prompt assigned to `fileName` while the surrounding code read
  `filename`, so the validation loop could never exit and a global `fileName`
  was created in its place. Both now use a single `let filename` binding.
- Declared `notification` once with `let` in `createAlert` instead of
  redeclaring `var notification` in each branch of `index.html`.
- Removed commented-out code from `index.html`: the `console.log(data)` debug
  line in the script fetch, and the disabled "Load Existing Script", "Delete
  Existing Script", and "Restart GUI" sidebar entries. No live markup or
  behaviour referenced those entries.
- Modernised `scripts/create/create_script.js` to ES2015: every `var`
  declaration is now `let`. No declaration was left behind, no binding was
  moved between scopes, and the two `let child` declarations in
  `removeSelectedCommand` sit in disjoint blocks, so behaviour is unchanged.
- Fixed the global-scope collision that the above change introduced.
  `index.html` declared a second `var commandSelect` in an inline script that
  runs after `create_script.js`. A global `var` that conflicts with an existing
  global `let` is a `SyntaxError` at evaluation time, which would have stopped
  that whole script block from running and left the "Create New Script" button
  dead. The inline script's own reference is now `commandSelectBox`, leaving
  `commandSelect` to `create_script.js`.
- Fixed an implicit global in `loadCurrentScriptCommands`: the Otter-only
  branch iterated with `for (cmd of commandItems)`, leaking `cmd` onto the
  global object. It is now `for (let cmd of ...)`.
- `getIndexOfSelectedCommand` no longer swallows exceptions silently. Its
  `catch` block now logs the error before returning `-1`, matching the handling
  in `getData`.
- Added the missing `Add-JS-Code` entry to `commandCollection`. The command was
  referenced in seven places in `create_script.js` but was never declared, so
  `advanceAfterAddingCommand` set `commandSelect.value` to a value no `<option>`
  had, `renderArguments(undefined)` threw, and the whole
  `Start-Javascript` → `End-Javascript` flow was unreachable. Its `Add-JS-Code`
  branch in `buildCommandText`, which serialises the code as `{"add-to-js": …}`,
  was dead as a result. The entry also carries `isCodeBlock: true`, which is
  read in two places and was defined on no command, so no code `<textarea>`
  rendered and zero-length argument lists were always skipped.
- Fixed `Feature: use-mobile-user-agent` throwing on selection. It declared
  `commandArgs: null` and `renderArguments` calls `Object.keys` on the value
  directly. It is now `{}`, matching the other no-argument features' effect:
  `buildFeatureCommandText` omits the arguments key entirely, so the emitted
  command is `{"feature":"\"use-mobile-user-agent\""}`.
- Fixed the duplicate-feature and duplicate-proxy checks never firing.
  `isDuplicateFeature` and `isOtherProxyFeaturePresent` compared
  `commandObject.feature` against the bare feature name, but
  `buildFeatureCommandText` stores the name JSON-quoted, so the two could never
  be equal and both guards always returned false. A user could add
  `use-http-proxy` twice, or a second proxy, and only find out at validation
  time. The comparison now unquotes the stored value via a new
  `getStoredFeatureName` helper. The emitted format is deliberately unchanged:
  `Parser.IsValidFileContents` consumes the quoted form.

## [1.0.0.0]

### Added

- `add-cookie` command for the script creator.
- `use-mobile-user-agent` command for the script creator.

### Fixed

- Fixed bugs in the `add-header` and `add-cookie` commands.
- Added `target="_blank"` to the "Report a Bug" button.