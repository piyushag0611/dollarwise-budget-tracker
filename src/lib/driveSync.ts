import type { DatabaseAdapter } from "@/integrations/sqlite/types";

const BACKUP_FILENAME = "dollarwise_backup.json";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

export interface BackupSnapshot {
  version: number;
  exportedAt: string;
  categories: Record<string, unknown>[];
  subcategories: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
}

export interface BackupInfo {
  exists: boolean;
  modifiedAt: string | null;
}

// ─── DB serialization ─────────────────────────────────────────────────────────

export async function exportDatabase(db: DatabaseAdapter): Promise<string> {
  const [categories, subcategories, transactions] = await Promise.all([
    db.query("SELECT * FROM categories ORDER BY created_at"),
    db.query("SELECT * FROM subcategories ORDER BY created_at"),
    db.query("SELECT * FROM transactions ORDER BY created_at"),
  ]);

  const snapshot: BackupSnapshot = {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    subcategories,
    transactions,
  };

  return JSON.stringify(snapshot);
}

export async function importDatabase(db: DatabaseAdapter, json: string): Promise<void> {
  const snapshot: BackupSnapshot = JSON.parse(json); // throws on invalid JSON

  // Delete in FK-safe order: children before parents
  await db.execute("DELETE FROM transactions");
  await db.execute("DELETE FROM subcategories");
  await db.execute("DELETE FROM categories");

  if (snapshot.categories.length > 0) {
    const placeholders = snapshot.categories.map(() => "(?,?,?,?,?)").join(",");
    const params = snapshot.categories.flatMap((c) => [c.id, c.name, c.type, c.created_at, c.updated_at]);
    await db.execute(
      `INSERT INTO categories (id, name, type, created_at, updated_at) VALUES ${placeholders}`,
      params
    );
  }

  if (snapshot.subcategories.length > 0) {
    const placeholders = snapshot.subcategories.map(() => "(?,?,?,?,?)").join(",");
    const params = snapshot.subcategories.flatMap((s) => [s.id, s.name, s.category_id, s.created_at, s.updated_at]);
    await db.execute(
      `INSERT INTO subcategories (id, name, category_id, created_at, updated_at) VALUES ${placeholders}`,
      params
    );
  }

  if (snapshot.transactions.length > 0) {
    const placeholders = snapshot.transactions.map(() => "(?,?,?,?,?,?,?,?,?,?)").join(",");
    const params = snapshot.transactions.flatMap((t) => [
      t.id, t.amount, t.date, t.type, t.category_id,
      t.subcategory_id, t.description, t.is_recurring, t.created_at, t.updated_at,
    ]);
    await db.execute(
      `INSERT INTO transactions (id, amount, date, type, category_id, subcategory_id, description, is_recurring, created_at, updated_at) VALUES ${placeholders}`,
      params
    );
  }
}

// ─── Drive API helpers ────────────────────────────────────────────────────────

async function listBackupFile(accessToken: string): Promise<{ id: string; modifiedTime?: string } | null> {
  const url = `${DRIVE_FILES_URL}?spaces=appDataFolder&q=name%3D'${BACKUP_FILENAME}'&fields=files(id,modifiedTime)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const { files } = await res.json();
  return (files as { id: string; modifiedTime?: string }[])?.[0] ?? null;
}

export async function getBackupInfo(accessToken: string): Promise<BackupInfo> {
  const file = await listBackupFile(accessToken);
  if (!file) return { exists: false, modifiedAt: null };
  return { exists: true, modifiedAt: file.modifiedTime ?? null };
}

export async function uploadBackup(accessToken: string, json: string): Promise<void> {
  const existing = await listBackupFile(accessToken);

  const boundary = "dollarwise_boundary";
  const metadata = existing
    ? JSON.stringify({ name: BACKUP_FILENAME })
    : JSON.stringify({ name: BACKUP_FILENAME, parents: ["appDataFolder"] });

  const body = [
    `--${boundary}`,
    "Content-Type: application/json\r\n",
    metadata,
    `--${boundary}`,
    "Content-Type: application/json\r\n",
    json,
    `--${boundary}--`,
  ].join("\r\n");

  const url = existing
    ? `${DRIVE_UPLOAD_URL}/${existing.id}?uploadType=multipart`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart`;

  const res = await fetch(url, {
    method: existing ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => String(res.status));
    throw new Error(`Drive upload failed: ${msg}`);
  }
}

export async function downloadBackup(accessToken: string): Promise<string | null> {
  const file = await listBackupFile(accessToken);
  if (!file) return null;

  const res = await fetch(`${DRIVE_FILES_URL}/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
  return res.text();
}
