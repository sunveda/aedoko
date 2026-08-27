#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const root = new URL('../public/data/', import.meta.url);
const data = JSON.parse(await readFile(new URL('aed-tokyo.v1.json', root), 'utf8'));
const coverage = JSON.parse(await readFile(new URL('aed-tokyo-coverage.v1.json', root), 'utf8'));
const attribution = JSON.parse(await readFile(new URL('aed-tokyo-attribution.v1.json', root), 'utf8'));
const failures = [];
const ids = new Set();

if (coverage.municipalities.length !== 62) failures.push(`coverage has ${coverage.municipalities.length} municipalities, expected 62`);
if (data.records.length !== data.recordCount) failures.push('recordCount does not match records length');

for (const record of data.records) {
  if (ids.has(record.id)) failures.push(`duplicate id ${record.id}`);
  ids.add(record.id);
  if (!record.nameJa || !record.addressJa) failures.push(`${record.id} lacks a name or address`);
  if (!(record.latitude >= 27 && record.latitude <= 36.5 && record.longitude >= 136 && record.longitude <= 142.5)) failures.push(`${record.id} is outside the Tokyo validation region`);
  for (const key of ['datasetUrl', 'resourceUrl', 'publisher', 'license', 'fetchedAt']) {
    if (!record.source[key]) failures.push(`${record.id} lacks source.${key}`);
  }
}

const recordCounts = new Map();
for (const record of data.records) recordCounts.set(record.municipalityCode, (recordCounts.get(record.municipalityCode) || 0) + 1);
for (const row of coverage.municipalities) {
  if ((recordCounts.get(row.municipalityCode) || 0) !== row.recordCount) failures.push(`coverage count mismatch for ${row.nameJa}`);
}

if (!attribution.sources.length) failures.push('attribution file has no sources');
if (failures.length) {
  console.error(failures.slice(0, 30).join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({ records: data.recordCount, municipalities: coverage.municipalityCount, sourcedMunicipalities: coverage.sourcedMunicipalityCount, coordinateValidMunicipalities: coverage.validatedMunicipalityCount, attributedSources: attribution.sources.length }, null, 2));
