export async function tableHasColumn(
  db: any,
  table: string,
  column: string
): Promise<boolean> {
  try {
    if (typeof db.queryAll === 'function') {
      const rows = await db.queryAll(`PRAGMA table_info(${table});`, []);
      return (
        Array.isArray(rows) &&
        rows.some((r: any) => String(r?.name) === column)
      );
    }
  } catch {
    // ignore
  }

  try {
    const res = await db.exec?.(`PRAGMA table_info(${table});`);
    const values: any[][] = res?.[0]?.values ?? [];
    return values.some((row) => String(row?.[1]) === column);
  } catch {
    return false;
  }
}
