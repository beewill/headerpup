## ADDED Requirements

### Requirement: Profile Management
The system SHALL allow users to create, rename, duplicate, delete, and reorder profiles. Each profile MUST have a non-empty name and a valid `#rrggbb` color.

#### Scenario: Create profile
- **WHEN** the user creates a new profile
- **THEN** a profile with a default name, a default color, no headers, and no host patterns is added to the end of the list

#### Scenario: Duplicate profile
- **WHEN** the user duplicates a profile
- **THEN** a new profile with a new id and copies of the original's headers, host patterns, color, and badge text is inserted after the original

#### Scenario: Reorder profiles
- **WHEN** the user moves a profile to a new position
- **THEN** the stored profile order reflects the new position

#### Scenario: Reject empty name
- **WHEN** the user clears a profile's name
- **THEN** the name is not saved and a validation error is shown

#### Scenario: Reject invalid color
- **WHEN** a color that does not match `#rrggbb` is entered
- **THEN** the color is not saved and a validation error is shown

### Requirement: Single Active Profile
The system SHALL allow at most one active profile at a time. `activeProfileId` MAY be null, which means Off.

#### Scenario: Activate another profile
- **WHEN** profile A is active and the user activates profile B
- **THEN** B becomes active and A is no longer active

#### Scenario: Delete active profile
- **WHEN** the user deletes the active profile
- **THEN** `activeProfileId` becomes null

### Requirement: Persistence
The system SHALL persist all state in `browser.storage.local` under the key `state`, and MUST rebuild DNR rules from the stored state on startup.

#### Scenario: Browser restart
- **WHEN** the browser restarts while a profile is active
- **THEN** the same profile is still active and its header rules are applied again

#### Scenario: No stored state
- **WHEN** no stored state exists and the extension was not just installed
- **THEN** the default state `{ version: 1, profiles: [], activeProfileId: null }` is used

#### Scenario: First install
- **WHEN** the extension is installed and no stored state exists
- **THEN** two starter profiles are created and no profile is active: "Blue" (`#2b6cb0`, badge `B`) with the rule `set color: blue`, and "Green" (`#2f855a`, badge `G`) with the rule `set color: green`, both with no host patterns

#### Scenario: Update or reinstall with data
- **WHEN** the extension is updated, or installed while state already exists
- **THEN** stored state is left unchanged
