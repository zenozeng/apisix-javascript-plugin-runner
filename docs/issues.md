## src/ext-plugin-proto/ext-plugin_generated.ts:1317:3 - error TS2322: Type 'Table' is not assignable to type 'T'.
  'Table' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype of constraint 'Table'.

```bash
flatc --version
# flatc version 1.12.0
flatc --ts ext-plugin.fbs
npx tsc
```

Build latest version (2.x) from https://github.com/google/flatbuffers instead of v1.12.x from debian.