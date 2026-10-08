import { spawn } from "node:child_process";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import {
  appendFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { createGzip, createGunzip } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { config as loadEnv } from "dotenv";

const root = fileURLToPath(new URL("../", import.meta.url));
loadEnv({ path: path.join(root, ".env"), quiet: true });
const [command, file, confirmation] = process.argv.slice(2);
const directory = path.resolve(
  process.env.BACKUP_DIR || path.join(root, "backups"),
);
const uploads = path.resolve(
  process.env.BACKUP_UPLOADS_DIR || path.join(root, "apps/api/uploads"),
);
const magic = Buffer.from("DSUBAK01");

// Never invoke a shell or put database passwords in command arguments.
function run(binary, args, connection, input, output) {
  const child = spawn(binary, args, {
    windowsHide: true,
    env: { ...process.env, MYSQL_PWD: decodeURIComponent(connection.password) },
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stderr.resume();
  const done = new Promise((resolve, reject) => {
    child.once("error", () =>
      reject(
        new Error(
          "Program backup tidak tersedia. Periksa MYSQL_BIN dan TAR_BIN.",
        ),
      ),
    );
    child.once("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              "Program backup gagal. Periksa koneksi dan hak akses database.",
            ),
          ),
    );
  });
  const streams = [];
  if (input) streams.push(pipeline(input, child.stdin));
  else child.stdin.end();
  if (output) streams.push(pipeline(child.stdout, output));
  else child.stdout.resume();
  return Promise.all([done, ...streams]);
}
function connection(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "mysql:")
    throw new Error("DATABASE_URL harus MySQL.");
  const database = decodeURIComponent(parsed.pathname.slice(1));
  if (!/^[a-zA-Z0-9_]+$/.test(database))
    throw new Error("Nama database tidak valid.");
  return {
    parsed,
    database,
    args: [
      "--protocol=tcp",
      `--host=${parsed.hostname}`,
      `--port=${parsed.port || "3306"}`,
      `--user=${decodeURIComponent(parsed.username)}`,
      "--default-character-set=utf8mb4",
    ],
  };
}
const mysqlBinary = (name) =>
  process.env.MYSQL_BIN
    ? path.join(
        process.env.MYSQL_BIN,
        name + (process.platform === "win32" ? ".exe" : ""),
      )
    : name;
const tar =
  process.env.TAR_BIN ||
  (process.platform === "win32"
    ? path.join(process.env.SystemRoot || "C:/Windows", "System32/tar.exe")
    : "tar");

async function backup(db, key, work) {
  const stage = await mkdtemp(path.join(work, "snapshot-"));
  const sql = path.join(stage, "database.sql");
  await run(
    mysqlBinary("mysqldump"),
    [
      ...db.args,
      "--single-transaction",
      "--quick",
      "--routines",
      "--events",
      "--triggers",
      `--result-file=${sql}`,
      db.database,
    ],
    db.parsed,
  );
  // Restored cookies must never reactivate sessions from the snapshot.
  await appendFile(sql, "\nDELETE FROM `Session`;\n");
  await mkdir(path.join(stage, "uploads"));
  try {
    await cp(uploads, path.join(stage, "uploads"), {
      recursive: true,
      dereference: false,
    });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await writeFile(
    path.join(stage, "manifest.json"),
    JSON.stringify({
      version: 1,
      database: db.database,
      createdAt: new Date().toISOString(),
    }),
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const target = path.join(
    directory,
    `dsu-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(4).toString("hex")}.dsu`,
  );
  const partial = target + ".partial";
  await writeFile(partial, Buffer.concat([magic, iv]), {
    flag: "wx",
    mode: 0o600,
  });
  const child = spawn(
    tar,
    ["-cf", "-", "-C", stage, "database.sql", "uploads", "manifest.json"],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stderr.resume();
  const done = new Promise((resolve, reject) => {
    child.once("error", () => reject(new Error("Program tar tidak tersedia.")));
    child.once("close", (code) =>
      code === 0 ? resolve() : reject(new Error("Arsip backup gagal.")),
    );
  });
  try {
    await Promise.all([
      done,
      pipeline(
        child.stdout,
        createGzip(),
        cipher,
        createWriteStream(partial, { flags: "a" }),
      ),
    ]);
    await appendFile(partial, cipher.getAuthTag());
    await rename(partial, target);
    return target;
  } finally {
    await rm(partial, { force: true });
  }
}

async function restore(db, key, work) {
  if (
    confirmation !== `--confirm=${db.database}` ||
    process.env.BACKUP_MAINTENANCE !== "true"
  )
    throw new Error(
      "Restore memerlukan BACKUP_MAINTENANCE=true dan --confirm=NAMA_DATABASE. Matikan API terlebih dahulu.",
    );
  const source = path.resolve(file || "");
  const size = (await stat(source)).size;
  if (size < 37) throw new Error("File backup tidak valid.");
  const handle = await import("node:fs/promises").then((fs) =>
    fs.open(source, "r"),
  );
  let header, tag;
  try {
    header = Buffer.alloc(20);
    tag = Buffer.alloc(16);
    await handle.read(header, 0, 20, 0);
    await handle.read(tag, 0, 16, size - 16);
  } finally {
    await handle.close();
  }
  if (!header.subarray(0, 8).equals(magic))
    throw new Error("Format backup tidak dikenali.");
  const decipher = createDecipheriv("aes-256-gcm", key, header.subarray(8));
  decipher.setAuthTag(tag);
  const archive = path.join(work, "verified.tar");
  // Authenticate the entire encrypted file before extracting or changing any data.
  await pipeline(
    createReadStream(source, { start: 20, end: size - 17 }),
    decipher,
    createGunzip(),
    createWriteStream(archive, { flags: "wx", mode: 0o600 }),
  );
  const stage = path.join(work, "restore");
  await mkdir(stage);
  await run(tar, ["-xf", archive, "-C", stage], db.parsed);
  const manifest = JSON.parse(
    await readFile(path.join(stage, "manifest.json"), "utf8"),
  );
  if (manifest.version !== 1 || !manifest.database)
    throw new Error("Manifest backup tidak valid.");
  for (const entry of await readdir(path.join(stage, "uploads"), {
    withFileTypes: true,
  })) {
    if (
      !entry.isFile() ||
      !/^[a-f0-9-]{36}\.(jpg|png|webp)(\.json)?$/.test(entry.name)
    )
      throw new Error("File unggahan dalam backup tidak valid.");
  }
  const previous = await backup(db, key, work);
  console.log(`Backup sebelum restore: ${previous}`);
  await run(
    mysqlBinary("mysql"),
    [...db.args, "--binary-mode", db.database],
    db.parsed,
    createReadStream(path.join(stage, "database.sql")),
  );
  const oldUploads = path.join(work, "previous-uploads");
  try {
    await rename(uploads, oldUploads);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  try {
    await cp(path.join(stage, "uploads"), uploads, { recursive: true });
  } catch (error) {
    await rm(uploads, { recursive: true, force: true });
    try {
      await rename(oldUploads, uploads);
    } catch {}
    throw error;
  }
  console.log(
    "Database dan unggahan dipulihkan. Semua sesi login telah dicabut.",
  );
}

let work;
try {
  if (!["create", "restore"].includes(command))
    throw new Error(
      "Gunakan npm run backup:data atau npm run restore:data -- FILE --confirm=NAMA_DATABASE.",
    );
  if (!/^[a-f0-9]{64}$/i.test(process.env.BACKUP_KEY || ""))
    throw new Error(
      "BACKUP_KEY wajib 64 karakter hex acak. Simpan kunci terpisah dari backup.",
    );
  const key = Buffer.from(process.env.BACKUP_KEY, "hex");
  const db = connection(process.env.DATABASE_URL || "");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  work = await mkdtemp(path.join(directory, ".work-"));
  if (command === "create")
    console.log(`Backup terenkripsi: ${await backup(db, key, work)}`);
  else await restore(db, key, work);
} catch {
  console.error(
    "Operasi gagal. Periksa DATABASE_URL, BACKUP_KEY, MYSQL_BIN, file backup, dan konfirmasi maintenance. Database mungkin sudah berubah jika proses restore terputus; pulihkan backup sebelum restore sebelum membuka API.",
  );
  process.exitCode = 1;
} finally {
  if (work) await rm(work, { recursive: true, force: true });
}
