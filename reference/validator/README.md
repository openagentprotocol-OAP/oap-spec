# OAP Conformance Validator

Command line tool that validates OAP artifacts against the normative JSON Schemas.

## Usage

```bash
# Validate a Manifest
node validate.js manifest ../../examples/weather-pro/manifest.json

# Validate a Receipt
node validate.js receipt ../../examples/weather-pro/receipt.json

# Validate a Decision Record
node validate.js decision ../../examples/weather-pro/decision-record.json

# Validate a CCC
node validate.js ccc path/to/ccc.json

# Verify a Receipt Chain
node validate.js chain path/to/receipts-array.json

# Check live endpoints
node validate.js endpoints https://tool.example

# Validate all JSON files in a directory
node validate.js all ../../examples/weather-pro/
```

## Output

JSON result with `valid` (boolean) and `errors` (array of strings). Returns exit code 1 on failure.

## Conformance Level Inference

When validating a Manifest, the tool infers the maximum achievable Conformance Level (L0 through L5) based on declared fields and endpoints.
