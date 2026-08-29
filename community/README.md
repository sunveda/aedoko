# Community city submissions

AEDoko accepts community leads for official AED data through the repository's **Add AED data for a city** issue form.

## Review flow

1. A contributor submits a city, coverage area, official source links, format, and reuse terms.
2. GitHub creates a public issue labeled `city-submission`.
3. The community workflow copies that submission into an unverified draft source-proposal pull request.
4. A maintainer checks publisher authority, licensing, freshness, coverage, coordinates, addresses, access hours, and placement details.
5. Merging the proposal records the reviewed source lead. It does not add locations to the production snapshot.
6. Dataset-specific import and normalization are implemented and validated separately before AED records are published.

This separation prevents unverified community input from entering an emergency-use dataset automatically while keeping every source lead attributable and reviewable.

Generated proposals are stored in `community/submissions/`.

