import type { NurseryReadService, NurserySnapshot } from "@dsu/contracts";
/** Deterministic simulated data; never represents company inventory. */
const seed: NurserySnapshot = {
  batches: [
    {
      id: "BT-26001",
      species: "Monstera deliciosa",
      category: "Tanaman hias",
      location: "Area A · Naungan",
      plantedAt: "2026-06-10",
      assignedTo: "petugas-demo",
      physical: 120,
      approved: 80,
      reserved: 12,
    },
    {
      id: "BT-26002",
      species: "Philodendron selloum",
      category: "Tanaman hias",
      location: "Area A · Naungan",
      plantedAt: "2026-07-02",
      assignedTo: "petugas-demo",
      physical: 85,
      approved: 40,
      reserved: 5,
    },
    {
      id: "BT-26003",
      species: "Tabebuya rosea",
      category: "Pohon pelindung",
      location: "Area B · Terbuka",
      plantedAt: "2026-05-15",
      assignedTo: "petugas-lain",
      physical: 160,
      approved: 60,
      reserved: 0,
    },
    {
      id: "BT-26004",
      species: "Syzygium myrtifolium",
      category: "Tanaman pagar",
      location: "Area C · Pembibitan",
      plantedAt: "2026-08-12",
      assignedTo: "petugas-demo",
      physical: 240,
      approved: 0,
      reserved: 0,
    },
  ],
  observations: [
    {
      id: "OBS-001",
      batchId: "BT-26001",
      observedBy: "petugas-demo",
      observedAt: "2026-09-22T08:00:00+07:00",
      method: "Sampel acak",
      sampleCount: 3,
      measurements: [
        { sampleNumber: 1, parameter: "Tinggi", unit: "cm", value: 42 },
        { sampleNumber: 2, parameter: "Tinggi", unit: "cm", value: 45 },
        { sampleNumber: 3, parameter: "Tinggi", unit: "cm", value: 39 },
      ],
      condition: "Sehat",
      notes: "Data simulasi; bukan standar agronomis.",
    },
  ],
};
/** Creates an isolated mock reader with optional failure/empty states for UI validation. */
export function createDemoService(
  scenario: "normal" | "empty" | "error" = "normal",
): NurseryReadService {
  return {
    async read() {
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (scenario === "error")
        throw new Error("Data simulasi gagal dimuat. Silakan coba lagi.");
      return scenario === "empty"
        ? { batches: [], observations: [] }
        : structuredClone(seed);
    },
  };
}
export const localDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
