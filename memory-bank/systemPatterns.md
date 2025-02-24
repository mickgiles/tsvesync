# System Patterns

## Architecture Overview

```mermaid
flowchart TD
    Client[Client Application] --> VeSync[VeSync Class]
    VeSync --> Auth[Authentication]
    VeSync --> Discovery[Device Discovery]
    
    Discovery --> Outlets[VeSyncOutlet]
    Discovery --> Bulbs[VeSyncBulb]
    Discovery --> Fans[VeSyncFan]
    Discovery --> Switches[VeSyncSwitch]
    
    Outlets --> BaseDevice[VeSyncBaseDevice]
    Bulbs --> BaseDevice
    Fans --> BaseDevice
    Switches --> BaseDevice
```

## Core Design Patterns

### 1. Base Device Pattern
- `VeSyncBaseDevice` abstract class
- Common device functionality
- Shared authentication handling
- Base API methods

### 2. Implementation Inheritance
```mermaid
flowchart TD
    Base[VeSyncBaseDevice] --> OutletBase[VeSyncOutlet]
    Base --> BulbBase[VeSyncBulb]
    Base --> FanBase[VeSyncFan]
    Base --> SwitchBase[VeSyncSwitch]
    
    OutletBase --> OutletImpl[VeSyncOutletImpl]
    BulbBase --> BulbImpl[VeSyncBulbImpl]
    SwitchBase --> SwitchImpl[VeSyncSwitchImpl]
    
    FanBase --> AirBypass[VeSyncAirBypass]
    AirBypass --> AirBaseV2[VeSyncAirBaseV2]
    AirBaseV2 --> TowerFan[VeSyncTowerFan]
    
    FanBase --> Humidifier[VeSyncHumidifier]
    Humidifier --> WarmHumidifier[VeSyncWarmHumidifier]
    WarmHumidifier --> Humid200300S[VeSyncHumid200300S]
```

### 3. Fan Implementation Organization
```mermaid
flowchart TD
    FansDir[src/lib/fans/] --> Index[index.ts]
    FansDir --> AirBypass[airBypass.ts]
    FansDir --> AirBaseV2[airBaseV2.ts]
    FansDir --> TowerFan[towerFan.ts]
    FansDir --> Humidifier[humidifier.ts]
    FansDir --> WarmHumidifier[warmHumidifier.ts]
    FansDir --> Humid200300S[humid200300S.ts]
    
    Index --> Exports[Re-exports all classes]
    Index --> FanModules[fanModules mapping]
```

### 4. Factory Pattern
- Device discovery system
- Dynamic class instantiation
- Model-specific implementations

### 5. Specification Pattern
- YAML-driven implementation
- Strict conformance checking
- Validation-first development
- Device-specific feature configuration:
  * Features defined in fanConfig
  * Inherited through class hierarchy
  * Protected from API response overwrites
  * Used for runtime feature detection

### 6. Configuration Pattern
```mermaid
flowchart TD
    Config[Fan Configuration] --> Features[Feature List]
    Config --> Levels[Speed Levels]
    Config --> Module[Module Type]
    
    Features --> Runtime[Runtime Feature Detection]
    Features --> Validation[Method Validation]
    Features --> Display[Status Display]
    
    Runtime --> Methods[Method Availability]
    Runtime --> UI[UI Elements]
    Runtime --> Tests[Test Selection]
```

## Key Technical Patterns

### 1. API Communication
```mermaid
sequenceDiagram
    participant App
    participant Device
    participant API
    
    App->>Device: Method Call
    Device->>Device: Validate Request
    Device->>API: HTTP Request
    API->>Device: Response
    Device->>Device: Parse Response
    Device->>App: Typed Result
```

### 2. Error Handling
- Consistent error types
- PyVeSync-compatible errors
- Detailed error information
- Type-safe error handling

### 3. Type System
- Interface-first design
- Strict null checking
- Comprehensive type definitions
- Generic type constraints
- String literal types for status values:
  * 'on' | 'off' for screen status
  * Consistent across inheritance chain
  * Type-safe state management
  * Improved test coverage

## Implementation Rules

### 1. YAML Specification Compliance
- Exact URL matching
- Identical request structure
- Matching response handling
- Header conformance
- Field mapping verification
  * Check both request and response fields
  * Verify virtual vs actual field usage
  * Validate configuration field access

### 2. Feature Support Verification
- Check YAML spec for supported features
- Verify through API response codes
- Remove unsupported features from implementation
- Document feature limitations per model
- Configuration-based feature detection:
  * Features defined in static config
  * Protected from runtime overwrites
  * Used for method validation
  * Drives test behavior

### 2. Type Safety
- No type assertions
- Complete interface coverage
- Strict null checks
- Generic constraints
- String literal types for status values
- Consistent type handling in inheritance

### 3. Error Management
- Consistent error types
- Proper error propagation
- Detailed error context
- Recovery patterns

### 4. Code Organization
- One class per file
- Clear file naming
- Logical directory structure
- Separation of concerns

## Testing Patterns

### 1. Validation Testing
```mermaid
flowchart TD
    Test[Test Service] --> Spec[YAML Spec]
    Test --> Mock[PyVeSync Server]
    Test --> Implementation[TSVeSync Implementation]
    
    Spec --> Validation[Validation]
    Mock --> Validation
    Implementation --> Validation
```

### 2. Type Testing
- Interface compliance
- Null handling
- Edge cases
- Generic constraints

### 3. Integration Testing
- End-to-end flows
- Error scenarios
- Recovery testing
- Performance validation
- Feature support validation
  * Test for unsupported features
  * Verify error codes (e.g. 11000000)
  * Check field mapping correctness
  * Validate configuration usage
