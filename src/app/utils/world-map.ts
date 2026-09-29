import topology from '@d3-maps/atlas/world/countries/countries-110m';
import metadata from '@d3-maps/atlas/metadata/countries';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { iso31661Alpha3ToAlpha2 } from 'iso-3166';
import type { GeometryCollection } from 'topojson-specification';

type CountryProperties = { id: string; name: string };
const countries = feature(topology, topology.objects.features as GeometryCollection<CountryProperties>);
const geography = {
  ...countries,
  features: countries.features.filter(country => country.properties?.id !== 'ATA'),
};
const projection = geoNaturalEarth1().fitExtent(
  [
    [25, 18],
    [975, 502],
  ],
  geography
);
const path = geoPath(projection);
const codes = new Map(metadata.map(country => [country.adm0A3, country.isoA2]));

export const worldCountries = geography.features.map(country => {
  const id = String(country.properties?.id);
  const metadataCode = codes.get(id);
  const code =
    iso31661Alpha3ToAlpha2[id] ||
    (metadataCode && /^[A-Z]{2}$/.test(metadataCode) ? metadataCode : undefined) ||
    (id === 'KOS' ? 'XK' : undefined);
  return { id, code, path: path(country) ?? '', name: String(country.properties?.name) };
});
