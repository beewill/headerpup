## ADDED Requirements

### Requirement: Header Operations
The system SHALL apply each enabled rule of the active profile to request headers on matching requests. A `set` rule MUST set the header to the given value. A `remove` rule MUST delete the header.

#### Scenario: Set header
- **WHEN** the active profile has an enabled rule `set X-Tenant: acme` and a matching request is sent
- **THEN** the request carries `X-Tenant: acme`, overwriting any existing value

#### Scenario: Remove header
- **WHEN** the active profile has an enabled rule `remove Cookie` and a matching request is sent
- **THEN** the request is sent without a `Cookie` header

### Requirement: Inactive Rules Have No Effect
Disabled rules and rules in inactive profiles SHALL NOT modify requests. When `activeProfileId` is null, there MUST be no HeaderPup dynamic rules.

#### Scenario: Disabled rule
- **WHEN** a rule in the active profile is disabled
- **THEN** that header is not modified

#### Scenario: Off
- **WHEN** `activeProfileId` is null
- **THEN** `getDynamicRules()` returns no rules

### Requirement: Header Name Validation
Header names MUST match the RFC 7230 token pattern `` ^[!#$%&'*+.^_`|~0-9A-Za-z-]+$ ``. When several enabled rules in one profile share a name (ignoring case), the last enabled rule SHALL win.

#### Scenario: Invalid header name
- **WHEN** the user enters a header name that contains a space or colon
- **THEN** the name is rejected with a validation error

#### Scenario: Duplicate names
- **WHEN** two enabled rules set `X-Flag` to `a` and then `b`
- **THEN** requests carry `X-Flag: b` and the options page shows a duplicate warning

### Requirement: Host Pattern Matching
Host patterns SHALL be wildcard globs where `*` matches zero or more host characters (including dots) in its position. Matching MUST ignore case and port. An empty pattern list MUST match all hosts. A profile MUST NOT have more than 100 patterns.

#### Scenario: Subdomain wildcard
- **WHEN** the pattern is `*.example.com`
- **THEN** `a.example.com` and `a.b.example.com` match and `example.com` does not

#### Scenario: Wildcard matches zero characters
- **WHEN** the pattern is `pup*.domain.com`
- **THEN** `pup.domain.com` and `pup-test.domain.com` match and `other.domain.com` does not

#### Scenario: Case and port
- **WHEN** the pattern is `api.example.com` and the request is to `https://API.Example.com:8443/x`
- **THEN** the request matches

#### Scenario: Non-matching host
- **WHEN** the request host matches none of the active profile's patterns
- **THEN** its headers are not modified

#### Scenario: Empty pattern list
- **WHEN** the active profile has no host patterns
- **THEN** rules apply to requests to every host

#### Scenario: Pattern limit
- **WHEN** the user enters more than 100 patterns
- **THEN** a validation error is shown and the patterns are not saved

### Requirement: DNR Rule Generation
The background script SHALL be the only writer of dynamic rules. Each host pattern MUST become one DNR rule with `regexFilter` `^[a-z][a-z0-9+.-]*://(<host-regex>)(:\d+)?(/|$)`, `isUrlFilterCaseSensitive: false`, action `modifyHeaders`, `requestHeaders` taken from the enabled rules, and every `resourceTypes` value. An empty pattern list MUST produce one rule with no URL restriction. On every state change, all existing dynamic rule IDs MUST be replaced atomically in one `updateDynamicRules` call.

#### Scenario: Atomic replacement
- **WHEN** the state changes
- **THEN** one `updateDynamicRules` call removes all previous rule IDs and adds the newly built rules

#### Scenario: No enabled rules
- **WHEN** the active profile has no enabled header rules
- **THEN** no dynamic rules are added

#### Scenario: DNR rejects update
- **WHEN** `updateDynamicRules` throws
- **THEN** the error is stored and shown on the options page, and the badge text shows `!`
