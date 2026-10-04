import { readFile } from "node:fs/promises";
import { db } from "./db.js";

const sources = {
  provinces: new URL("../../web/lib/maps/provinces.csv", import.meta.url),
  regencies: new URL("../../web/lib/maps/regencies.csv", import.meta.url),
  districts: new URL("../../web/lib/maps/districts.csv", import.meta.url),
  villages: new URL("../../web/lib/maps/villages.csv", import.meta.url),
};

const cleanName = (value: string) =>
  value.replace(/^"|"$/g, "").replaceAll('""', '"');

async function roots(source: URL) {
  return (await readFile(source, "utf8"))
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const comma = line.indexOf(",");
      return {
        id: line.slice(0, comma),
        name: cleanName(line.slice(comma + 1)),
      };
    });
}

async function children(source: URL) {
  return (await readFile(source, "utf8"))
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const first = line.indexOf(",");
      const second = line.indexOf(",", first + 1);
      return {
        id: line.slice(0, first),
        parentId: line.slice(first + 1, second),
        name: cleanName(line.slice(second + 1)),
      };
    });
}

function chunks<T>(rows: T[], size = 5000) {
  return Array.from({ length: Math.ceil(rows.length / size) }, (_, index) =>
    rows.slice(index * size, (index + 1) * size),
  );
}

try {
  const provinces = await roots(sources.provinces);
  const regencies = (await children(sources.regencies)).map(
    ({ parentId: provinceId, ...row }) => ({ ...row, provinceId }),
  );
  const districts = (await children(sources.districts)).map(
    ({ parentId: regencyId, ...row }) => ({ ...row, regencyId }),
  );
  const villages = (await children(sources.villages)).map(
    ({ parentId: districtId, ...row }) => ({ ...row, districtId }),
  );

  // ponytail: reference codes are immutable; use a sync/upsert job only if the source starts changing names.
  for (const rows of chunks(provinces))
    await db.province.createMany({ data: rows, skipDuplicates: true });
  for (const rows of chunks(regencies))
    await db.regency.createMany({ data: rows, skipDuplicates: true });
  for (const rows of chunks(districts))
    await db.district.createMany({ data: rows, skipDuplicates: true });
  for (const rows of chunks(villages))
    await db.village.createMany({ data: rows, skipDuplicates: true });

  console.info(
    `${provinces.length} provinsi, ${regencies.length} kabupaten/kota, ${districts.length} kecamatan, dan ${villages.length} desa/kelurahan tersedia.`,
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Import wilayah gagal.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
