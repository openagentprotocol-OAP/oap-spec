# Behavior Tests

Behavior tests run against a live OAP server. They verify protocol lifecycle correctness rather than schema correctness. The default target is the Reference Server at `http://localhost:3100`. Override the target by setting the `OAP_TARGET` environment variable.

Each test file exports a `run` function that takes a context object with `target` and optional `ajv` and returns an array of test result objects of the form:

```js
{ name: 'descriptive-name', category: 'behavior', passed: boolean, reason: string|null }
```

The behavior suite intentionally treats the server as a black box. It exercises only public endpoints declared through the manifest. It MUST NOT depend on private knowledge of the server implementation.

## Conformance Tagging

Each test file declares the Conformance Levels it exercises in a structured comment header. The runner parses these annotations to produce coverage reports. See the example in `lifecycle.test.js`.

## Adversarial Subdirectory

`behavior/adversarial/` contains tests that attempt to subvert the protocol. These tests are maintained by the Working Group on Implementation and Conformance and are run as part of every CI pass. A passing adversarial test in this directory is a test that successfully detected the subversion.
