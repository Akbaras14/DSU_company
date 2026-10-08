import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";

const exec = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
loadEnv({ path: path.join(root, ".env"), quiet: true });

test("Encrypted backup restores SQL and uploads, revokes sessions and rejects tampering before changes", async () => {
  const base = new URL(
    process.env.TEST_DATABASE_URL || "mysql://root@127.0.0.1:3306/db_dsu_test",
  );
  if (!base.pathname.endsWith("_test"))
    throw new Error("Test database must end with _test.");
  const suffix = randomBytes(4).toString("hex");
  const source = `dsu_backup_source_${suffix}_test`,
    target = `dsu_backup_target_${suffix}_test`;
  const mysqlBin = process.env.MYSQL_BIN || "";
  const binary = mysqlBin
    ? path.join(mysqlBin, process.platform === "win32" ? "mysql.exe" : "mysql")
    : "mysql";
  const mysqlEnv = {
    ...process.env,
    MYSQL_PWD: decodeURIComponent(base.password),
  };
  const sql = async (statement) =>
    (
      await exec(
        binary,
        [
          "--protocol=tcp",
          `--host=${base.hostname}`,
          `--port=${base.port || "3306"}`,
          `--user=${decodeURIComponent(base.username)}`,
          "-N",
          "-B",
          "-e",
          statement,
        ],
        { env: mysqlEnv, windowsHide: true },
      )
    ).stdout.trim();
  const work = await mkdtemp(path.join(root, ".tmp-backup-test-"));
  const backupDir = path.join(work, "backups"),
    sourceUploads = path.join(work, "source-uploads"),
    targetUploads = path.join(work, "target-uploads");
  const image = `${randomUUID()}.png`;
  const key = randomBytes(32).toString("hex");
  const url = (database) => {
    const parsed = new URL(base);
    parsed.pathname = "/" + database;
    return parsed.href;
  };
  const operate = (args, database, uploadDir, extra = {}) =>
    exec(process.execPath, [path.join(root, "scripts/backup.mjs"), ...args], {
      cwd: root,
      windowsHide: true,
      env: {
        ...process.env,
        MYSQL_BIN: mysqlBin,
        DATABASE_URL: url(database),
        BACKUP_DIR: backupDir,
        BACKUP_UPLOADS_DIR: uploadDir,
        BACKUP_KEY: key,
        ...extra,
      },
    });
  try {
    await sql(
      `CREATE DATABASE ${source}; CREATE DATABASE ${target}; CREATE TABLE ${source}.Fixture (id INT PRIMARY KEY, value VARCHAR(100)); INSERT INTO ${source}.Fixture VALUES (1, 'original-test-data'); CREATE TABLE ${source}.Session (tokenHash VARCHAR(64)); INSERT INTO ${source}.Session VALUES ('expired-cookie'); CREATE TABLE ${target}.Fixture (id INT PRIMARY KEY, value VARCHAR(100)); INSERT INTO ${target}.Fixture VALUES (1, 'before-restore'); CREATE TABLE ${target}.Session (tokenHash VARCHAR(64));`,
    );
    await mkdir(sourceUploads);
    await mkdir(targetUploads);
    await writeFile(path.join(sourceUploads, image), "image-test-bytes");
    await writeFile(
      path.join(sourceUploads, image + ".json"),
      JSON.stringify({ ownerId: "test", purpose: "plant" }),
    );
    await operate(["create"], source, sourceUploads);
    const [filename] = (await readdir(backupDir)).filter((name) =>
      name.endsWith(".dsu"),
    );
    const backup = path.join(backupDir, filename);
    const encrypted = await readFile(backup);
    assert.equal(encrypted.includes(Buffer.from("original-test-data")), false);
    await assert.rejects(
      operate(
        ["restore", backup, `--confirm=${target}`],
        target,
        targetUploads,
      ),
    );
    await assert.rejects(
      operate(
        ["restore", backup, `--confirm=${target}`],
        target,
        targetUploads,
        {
          BACKUP_MAINTENANCE: "true",
          BACKUP_KEY: randomBytes(32).toString("hex"),
        },
      ),
    );
    encrypted[25] ^= 1;
    const corrupt = path.join(work, "corrupt.dsu");
    await writeFile(corrupt, encrypted);
    await assert.rejects(
      operate(
        ["restore", corrupt, `--confirm=${target}`],
        target,
        targetUploads,
        { BACKUP_MAINTENANCE: "true" },
      ),
    );
    assert.equal(
      await sql(`SELECT value FROM ${target}.Fixture`),
      "before-restore",
    );
    await operate(
      ["restore", backup, `--confirm=${target}`],
      target,
      targetUploads,
      { BACKUP_MAINTENANCE: "true" },
    );
    assert.equal(
      await sql(`SELECT value FROM ${target}.Fixture`),
      "original-test-data",
    );
    assert.equal(await sql(`SELECT COUNT(*) FROM ${target}.Session`), "0");
    assert.equal(
      await readFile(path.join(targetUploads, image), "utf8"),
      "image-test-bytes",
    );
    assert.equal(
      (await readdir(backupDir)).filter((name) => name.endsWith(".dsu")).length,
      2,
    );
    assert.equal(
      (await readdir(backupDir)).some((name) => name.startsWith(".work-")),
      false,
    );
  } finally {
    await sql(
      `DROP DATABASE IF EXISTS ${source}; DROP DATABASE IF EXISTS ${target};`,
    );
    await rm(work, { recursive: true, force: true });
  }
});
