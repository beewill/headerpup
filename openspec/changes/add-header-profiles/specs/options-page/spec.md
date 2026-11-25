## ADDED Requirements

### Requirement: Options Layout
The options page SHALL show a profile list on the left and an editor for the selected profile on the right. The editor MUST include: name, color picker, badge text (0–2 characters), a host patterns textarea (one pattern per line), and a header rule table with enable, op, name, value, and delete controls.

#### Scenario: Select profile
- **WHEN** the user clicks a profile in the list
- **THEN** the editor shows that profile's fields

#### Scenario: Add header rule
- **WHEN** the user adds a header rule
- **THEN** a new enabled `set` row with an empty name and value is appended to the table

### Requirement: Inline Validation and Auto-save
Edits SHALL be validated inline and saved automatically on change, debounced by about 300ms. An invalid field MUST block saving only that field. Other valid edits MUST still be saved.

#### Scenario: Valid edit
- **WHEN** the user changes a header value and stops typing for about 300ms
- **THEN** the change is saved to storage

#### Scenario: Invalid field
- **WHEN** the user enters badge text longer than 2 characters
- **THEN** an inline error is shown and the badge text is not saved, while other fields still save

### Requirement: Status and Diagnostics
The options page SHALL show a live preview of the active host patterns, any DNR error from the last apply, warnings for duplicate header names, and help text noting that some protected headers (e.g. `Host`) cannot be modified.

#### Scenario: DNR error shown
- **WHEN** the last `updateDynamicRules` call failed
- **THEN** the error message is shown on the options page

#### Scenario: Pattern preview
- **WHEN** the user edits host patterns
- **THEN** the preview lists the valid patterns that will be applied, or "all hosts" when the list is empty

### Requirement: Host Permission Prompt
The options page SHALL show a prompt with a grant button when the `<all_urls>` host permission is missing.

#### Scenario: Grant permission
- **WHEN** the user clicks grant
- **THEN** `permissions.request({ origins: ["<all_urls>"] })` is called and the prompt hides once the permission is granted
