# TSVeSync Project

## Prime Directives

1. **YAML Specifications Are Read-Only**
   - YAML files in `/api` directory must NEVER be modified
   - All implementation must conform exactly to these specifications
   - YAML files serve as the contract between implementation and API

2. **Mock Server Is The Only Mock**
   - The PyVeSync validation server is the only source of mock data
   - No additional mocking or mock data is allowed in tests or implementation
   - All validation must be done through the validation server

## Project Overview

TSVeSync is a TypeScript implementation of the VeSync API client, designed to be a drop-in replacement for PyVeSync while providing type safety and modern TypeScript features. The implementation must maintain exact compatibility with PyVeSync's request/response format.

## Implementation Strategy

1. **Device Discovery**
   - Each device type has a YAML specification in `/api/{device_type}/`
   - Device types are mapped to TypeScript classes
   - Implementation must match PyVeSync's device instantiation

2. **Method Implementation**
   - Methods are defined in YAML specifications
   - Each method must exactly match:
     - URL pattern
     - HTTP method
     - Headers
     - Request body structure
   - Implementation can reference PyVeSync source

3. **Validation Process**
   - Test service validates all implementations
   - Compares against YAML specifications
   - Uses validation server to verify requests
   - Reports missing or incorrect implementations

## Development Process

1. **Device Implementation**
   - Start with YAML specification
   - Create TypeScript class extending base device
   - Implement methods according to spec
   - Validate against PyVeSync server

2. **Testing**
   - Run validation server
   - Execute test service
   - Verify all methods match specs
   - Fix any discrepancies

3. **Documentation**
   - Document implemented features
   - Update checklists
   - Track progress
   - Note any issues or limitations

## Project Structure

```
/
├── api/                    # YAML specifications (READ ONLY)
│   ├── vesyncbulb/        # Bulb device specs
│   ├── vesyncfan/         # Air purifier specs
│   ├── vesyncoutlet/      # Outlet device specs
│   └── vesyncswitch/      # Switch device specs
├── src/                    # TypeScript implementation
│   ├── devices/           # Device class implementations
│   ├── helpers/           # Utility functions
│   └── index.ts           # Main entry point
├── test/                   # Test files
│   └── testService.ts     # Validation test service
└── docs/                   # Documentation
    ├── CHECKLIST.md       # Implementation progress
    ├── DOCUMENTATION.md   # Usage and API docs
    └── PROJECT.md         # This file
```

## Device Types

1. **Outlets**
   - Power control
   - Energy monitoring
   - Timer functionality

2. **Bulbs**
   - Power control
   - Brightness adjustment
   - Color control (some models)
   - Scene settings

3. **Air Purifiers**
   - Power control
   - Fan speed
   - Mode settings
   - Timer functionality
   - Display control
   - Child lock

4. **Switches**
   - Power control
   - Status monitoring
   - Dimming (some models)

## Implementation Requirements

1. **Type Safety**
   - Use TypeScript features
   - Define proper interfaces
   - Ensure type checking

2. **Error Handling**
   - Match PyVeSync error format
   - Provide meaningful messages
   - Handle all error cases

3. **Documentation**
   - Document all public methods
   - Provide usage examples
   - Keep progress updated

## Testing Requirements

1. **Validation Testing**
   - Use PyVeSync validation server
   - Test all implemented methods
   - Verify request formats
   - Check response handling

2. **Error Testing**
   - Test error conditions
   - Verify error handling
   - Check recovery behavior

3. **Type Testing**
   - Verify type safety
   - Check null handling
   - Test edge cases

