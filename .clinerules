# TSVeSync Project Rules

## Project Intelligence

### 1. YAML Specifications
- Located in `/api/{device_type}/` directories
- Are READ-ONLY - never modify these files
- Serve as the source of truth for implementation
- Must be followed exactly for PyVeSync compatibility

### 2. Implementation Patterns
- Each device type has a base class and implementation class
- Base classes handle common functionality
- Implementation classes match YAML specs exactly
- No additional methods beyond YAML specs

### 3. File Organization
- Source code in `/src/lib/`
- Device implementations follow naming pattern: `vesynctypeImpl.ts`
- Base classes in separate files from implementations
- Tests in `/test/` directory

### 4. Code Style
- Use TypeScript strict mode
- No any types allowed
- Full type coverage required
- ESM module format

### 5. Testing Requirements
- All implementations must pass validation server
- Test files match implementation files
- Coverage must be comprehensive
- PyVeSync compatibility verified

## Critical Paths

### 1. Device Implementation
```
1. Read YAML specification
2. Create/update TypeScript interfaces
3. Implement in appropriate *Impl.ts file
4. Add to device discovery
5. Create/update tests
6. Validate against PyVeSync server
```

### 2. Feature Addition
```
1. Verify feature in YAML spec
2. Update type definitions
3. Implement in appropriate class
4. Add test coverage
5. Validate implementation
```

### 3. Documentation Updates
```
1. Update Memory Bank files
2. Update API documentation
3. Update usage examples
4. Verify documentation accuracy
```

## Project Preferences

### 1. Code Organization
- One class per file
- Clear file naming
- Logical directory structure
- Separation of concerns

### 2. Type Definitions
- Interfaces over types
- Strict null checks
- No type assertions
- Complete type coverage

### 3. Error Handling
- Consistent error types
- Detailed error messages
- Proper error propagation
- PyVeSync-compatible errors

### 4. Documentation
- Memory Bank driven
- Clear and concise
- Always up to date
- Examples included

## Known Challenges

### 1. Implementation
- Exact PyVeSync compatibility required
- Complex device type hierarchy
- Strict type safety requirements
- No additional features allowed

### 2. Testing
- Must use validation server
- Complete coverage required
- All error cases tested
- Performance validation

### 3. Documentation
- Keep Memory Bank updated
- Track all changes
- Document all features
- Maintain consistency

## Tool Usage Patterns

### 1. TypeScript Compiler
- Strict mode enabled
- No type assertions
- Complete type checking
- ESM module format

### 2. Testing Tools
- PyVeSync validation server
- Test service runner
- Coverage reporting
- Type checking

### 3. Documentation Tools
- Memory Bank markdown
- Mermaid diagrams
- API documentation
- Usage examples

## Evolution Notes

### 1. Project Growth
- Document new patterns
- Update implementation rules
- Track technical decisions
- Note challenges encountered

### 2. Learning Points
- PyVeSync compatibility insights
- Implementation patterns discovered
- Testing strategies refined
- Documentation improvements

### 3. Future Considerations
- New device types
- API changes
- Testing improvements
- Documentation updates
