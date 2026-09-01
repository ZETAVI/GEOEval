import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const args = parseArgs(process.argv.slice(2));
const sourceReleaseId = "mca-administrative-divisions@2025-12-31";
const rootPath = required(args, "root");
const outputPath = required(args, "output");
const specialInputs = new Map([
  ["441900", required(args, "dongguan")],
  ["442000", required(args, "zhongshan")],
  ["460400", required(args, "danzhou")],
  ["620200", required(args, "jiayuguan")],
]);

const rootRaw = await readFile(rootPath, "utf8");
const rootEnvelope = JSON.parse(rootRaw);
const root = assertEnvelope(rootEnvelope, rootPath);
const specialChildren = new Map();
const specialHashes = {};

for (const [officialCode, path] of specialInputs) {
  const raw = await readFile(path, "utf8");
  const envelope = JSON.parse(raw);
  const node = assertEnvelope(envelope, path);
  if (officialCodeFor(node) !== officialCode || node.level !== 2) {
    throw new Error(`${path} does not contain expected city ${officialCode}`);
  }
  if (!Array.isArray(node.children) || node.children.length === 0) {
    throw new Error(`${path} contains no township children`);
  }
  specialChildren.set(officialCode, node.children);
  specialHashes[officialCode] = sha256(raw);
}

const provinces = root.children
  .filter((node) => node.level === 1 && /^\d+$/.test(node.code))
  .filter((node) => !["81", "82"].includes(node.code))
  .map(projectProvince);

if (provinces.length !== 31) {
  throw new Error(
    `Expected 31 mainland province-level divisions, got ${provinces.length}`,
  );
}

validateProjection(provinces, specialChildren);
const counts = countProjection(provinces);

const snapshot = {
  source: {
    id: sourceReleaseId,
    authority: "中华人民共和国民政部 中国·国家地名信息库",
    asOf: "2025-12-31",
    retrievedAt: "2026-09-01",
    publicationUrl: "https://dmfw.mca.gov.cn/XzqhVersionPublish.html",
    apiDocumentationUrl: "https://dmfw.mca.gov.cn/baseHtmls/docfile/_2.htm",
    attribution: "行政区划数据来源：中国·国家地名信息库",
    counts,
    rawSha256: sha256(rootRaw),
    specialCityRawSha256: specialHashes,
  },
  contentHash: sha256(JSON.stringify(provinces)),
  provinces,
};

await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);

function projectProvince(source) {
  const province = officialOption(source, null);
  const officialCities = source.children.filter((node) => node.level === 2);
  const directTerminals = source.children.filter((node) => node.level === 3);
  const cities = [];

  if (source.type === "直辖市") {
    cities.push({
      id: `CN-MCA-VIEW-MUNICIPALITY-${province.officialCode}`,
      label: source.name,
      identityKind: "MUNICIPALITY_REPEAT",
      officialDivisionId: province.id,
      terminalRegions: source.children.map((node) =>
        officialOption(node, province.id),
      ),
    });
  } else {
    for (const city of officialCities) {
      const cityOption = officialOption(city, province.id);
      const terminalSource =
        city.children.length > 0
          ? city.children
          : specialChildren.get(cityOption.officialCode);
      if (!terminalSource || terminalSource.length === 0) {
        throw new Error(
          `City ${city.name} (${cityOption.officialCode}) has no terminal regions`,
        );
      }
      cities.push({
        id: cityOption.id,
        label: cityOption.label,
        identityKind: "OFFICIAL_DIVISION",
        officialDivisionId: cityOption.id,
        officialDivision: cityOption,
        terminalRegions: terminalSource.map((node) =>
          officialOption(node, cityOption.id),
        ),
      });
    }
    if (directTerminals.length > 0) {
      cities.push({
        id: `CN-MCA-VIEW-DIRECT-${province.officialCode}`,
        label: "省直辖县级行政区划",
        identityKind: "PROVINCE_DIRECT_GROUP",
        terminalRegions: directTerminals.map((node) =>
          officialOption(node, province.id),
        ),
      });
    }
  }

  return { ...province, cities };
}

function officialOption(node, parentId) {
  const officialCode = officialCodeFor(node);
  return {
    id: `CN-MCA-${levelName(node.level)}-${officialCode}`,
    officialCode,
    officialLevel: levelName(node.level),
    label: requiredString(node.name, `name for ${officialCode}`),
    divisionType: requiredString(node.type, `type for ${officialCode}`),
    parentId,
    status: "ACTIVE",
    sourceReleaseId,
  };
}

function officialCodeFor(node) {
  if (!/^\d+$/.test(node.code))
    throw new Error(`Invalid official code ${node.code}`);
  if (node.level >= 1 && node.level <= 3) return node.code.padEnd(6, "0");
  if (node.level === 4 && node.code.length === 9) return node.code;
  throw new Error(`Invalid level/code combination ${node.level}/${node.code}`);
}

function levelName(level) {
  return (
    { 1: "PROVINCE", 2: "PREFECTURE", 3: "COUNTY", 4: "TOWNSHIP" }[level] ?? ""
  );
}

function validateProjection(provinces, expectedSpecials) {
  const ids = new Set();
  const specialCounts = new Map();
  for (const province of provinces) {
    unique(ids, province.id);
    if (province.cities.length === 0)
      throw new Error(`${province.label} has no city choices`);
    for (const city of province.cities) {
      unique(ids, city.id);
      if (city.terminalRegions.length === 0)
        throw new Error(`${city.label} has no terminal choices`);
      for (const terminal of city.terminalRegions) {
        unique(ids, terminal.id);
        if (terminal.officialLevel === "TOWNSHIP") {
          const cityCode = `${terminal.officialCode.slice(0, 4)}00`;
          specialCounts.set(cityCode, (specialCounts.get(cityCode) ?? 0) + 1);
        }
      }
    }
  }
  for (const [code, children] of expectedSpecials) {
    if (specialCounts.get(code) !== children.length) {
      throw new Error(`Special city ${code} lost township children`);
    }
  }
}

function countProjection(provinces) {
  const counts = {
    provinces: provinces.length,
    prefectures: 0,
    counties: 0,
    townships: 0,
    presentationCities: 0,
  };
  for (const province of provinces) {
    for (const city of province.cities) {
      if (city.officialDivision) counts.prefectures += 1;
      else counts.presentationCities += 1;
      for (const terminal of city.terminalRegions) {
        if (terminal.officialLevel === "COUNTY") counts.counties += 1;
        if (terminal.officialLevel === "TOWNSHIP") counts.townships += 1;
      }
    }
  }
  return counts;
}

function unique(seen, id) {
  if (seen.has(id)) throw new Error(`Duplicate region ID ${id}`);
  seen.add(id);
}

function assertEnvelope(envelope, path) {
  if (
    envelope?.status !== 200 ||
    !envelope.data ||
    !Array.isArray(envelope.data.children)
  ) {
    throw new Error(
      `${path} is not a successful MCA administrative-division response`,
    );
  }
  return envelope.data;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requiredString(value, name) {
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`Missing ${name}`);
  return value;
}

function required(values, key) {
  const value = values.get(key);
  if (!value) throw new Error(`Missing --${key}`);
  return value;
}

function parseArgs(values) {
  const parsed = new Map();
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith("--") || !value)
      throw new Error(`Invalid arguments near ${key ?? "end"}`);
    parsed.set(key.slice(2), value);
  }
  return parsed;
}
