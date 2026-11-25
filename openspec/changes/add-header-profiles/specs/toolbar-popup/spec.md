## ADDED Requirements

### Requirement: Toolbar Badge
When a profile is active, the system SHALL set the badge background to `profile.color` and the badge text to `badgeText`, or a single space if that is empty. The badge text color MUST be black or white, whichever contrasts better with the background (`action.setBadgeTextColor`). The tooltip MUST be `HeaderPup: <name>`. When the state is Off, the badge MUST be cleared.

#### Scenario: Active profile with badge text
- **WHEN** profile "Staging" with color `#ffcc00` and badge text `ST` is activated
- **THEN** the badge shows `ST` in black on `#ffcc00` and the tooltip is `HeaderPup: Staging`

#### Scenario: Empty badge text
- **WHEN** the active profile has empty badge text
- **THEN** the badge text is a single space, so a colored chip still shows

#### Scenario: Off
- **WHEN** no profile is active
- **THEN** the badge text is cleared and the tooltip is `HeaderPup: Off`

### Requirement: Profile Switcher Popup
The popup SHALL list "Off" followed by every profile, each with a color swatch, name, and header count. Clicking a row MUST activate it immediately. The active row MUST be highlighted. The popup MUST NOT provide profile editing, and MUST provide a link that opens the options page.

#### Scenario: Switch profile
- **WHEN** the user clicks a profile row
- **THEN** that profile becomes active and its row is highlighted

#### Scenario: Turn off
- **WHEN** the user clicks "Off"
- **THEN** `activeProfileId` becomes null

#### Scenario: Open options
- **WHEN** the user clicks the options link
- **THEN** the options page opens

### Requirement: Host Permission Warning
The popup SHALL show a warning with a grant button when the `<all_urls>` host permission is not granted.

#### Scenario: Missing permission
- **WHEN** the popup opens without host permission
- **THEN** a warning is shown, and clicking grant calls `permissions.request({ origins: ["<all_urls>"] })`

### Requirement: Cycle Shortcut
The system SHALL provide a command `cycle-profile` (default `Alt+Shift+H`) that steps through Off → P1 → … → Pn → Off in profile order.

#### Scenario: Cycle forward
- **WHEN** P1 is active and the shortcut is pressed
- **THEN** P2 becomes active

#### Scenario: Wrap to Off
- **WHEN** the last profile is active and the shortcut is pressed
- **THEN** the state becomes Off
