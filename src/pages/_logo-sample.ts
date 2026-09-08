// TEMPORARY: sample wordmarks for the logo preview routes. Delete with the preview pages.
const NAMES = [
  "Northwind",
  "Kaleido",
  "Baseline",
  "Orbit",
  "Fernpath",
  "Quill",
  "Havenly",
  "Mercator",
  "Signalz",
  "Ardent",
  "Volta",
  "Cobalt",
];

const wordmark = (name: string, width: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 40"><text x="${width / 2}" y="29" font-family="Helvetica,Arial" font-size="26" text-anchor="middle">${name}</text></svg>`;

// Real client artwork is a mixed bag of proportions, so the samples are too: the strip sizes every
// logo from its own ratio, and a row of identical boxes would hide a bug there.
export const sampleLogos = NAMES.map((name) => {
  const width = 24 + name.length * 16;

  return {
    name,
    ratio: width / 40,
    url: `data:image/svg+xml;utf8,${encodeURIComponent(wordmark(name, width))}`,
  };
});
