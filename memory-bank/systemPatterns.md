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
    FanBase --> FanImpl[VeSyncFanImpl]
    SwitchBase --> SwitchImpl[VeSyncSwitchImpl]
```

### 3. Factory Pattern
- Device discovery system
- Dynamic class instantiation
- Model-specific implementations

### 4. Specification Pattern
- YAML-driven implementation
- Strict conformance checking
- Validation-first development

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

## Implementation Rules

### 1. YAML Specification Compliance
- Exact URL matching
- Identical request structure
- Matching response handling
- Header conformance

### 2. Type Safety
- No type assertions
- Complete interface coverage
- Strict null checks
- Generic constraints

### 3. Error Management
- Consistent error types
- Proper error propagation
- Detailed error context
- Recovery patterns

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
