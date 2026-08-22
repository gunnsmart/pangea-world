# Checklist: NPY Embedding Regeneration & Verification

## A) Regenerate Embedding Files (Local/Dev)

1.  **Backup Existing Files**
    *   Backup `public/data/adam_knowledge_embeddings_128.npy`
    *   Backup `public/data/eve_knowledge_embeddings_128.npy`

2.  **Generate New Files from Metadata**
    *   Run the reconstruction script:
        ```bash
        npx tsx scripts/reconstruct_npy.ts
        ```
    *   This script reads `total_entries` from `adam_knowledge.json` and `eve_knowledge.json` and generates binary `.npy` files with dimension 128.

## B) Automatic Verification (CI/Validation)

Run the verification suite:
```bash
npm run verify-data
```

### Verification Criteria (Automated):

- [x] **Header Magic String**: Must start with `\x93NUMPY`.
- [x] **Version**: Must be `1.0`.
- [x] **Header Cleanliness**: No UTF-8 replacement characters (`0xEF 0xBF 0xBD`) which indicate text-mode corruption.
- [x] **Shape Matching**: Header shape `(n, 128)` must match the `total_entries` in JSON metadata.
- [x] **File Size Integrity**: Byte length must equal `header_offset + (entries * 128 * 4)`.
- [x] **Structure Compatibility**: Verified to be parsable by `src/lib/npyLoader.ts`.

## C) Final Application Check

1.  Start the development server: `npm run dev`.
2.  Monitor the console for any `NPY Magic Mismatch` or `HTTP error` related to `.npy` files.
3.  Observe character initialization; if embeddings load successfully, characters will be able to retrieve knowledge via cosine similarity.
