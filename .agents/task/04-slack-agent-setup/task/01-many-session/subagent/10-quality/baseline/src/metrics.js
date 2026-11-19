import { DatabaseSync } from 'node:sqlite';
export class Metrics {
  constructor(file) {
    this.db = new DatabaseSync(file);
    this.db.exec(
      'PRAGMA busy_timeout=3000;CREATE TABLE IF NOT EXISTS timing(metric TEXT, id TEXT, ms INTEGER, at INTEGER, PRIMARY KEY(metric,id))',
    );
  }
  add(metric, id, ms) {
    this.db
      .prepare('INSERT OR IGNORE INTO timing VALUES(?,?,?,?)')
      .run(metric, id, Math.max(0, Math.round(ms)), Date.now());
  }
  summary() {
    return this.db
      .prepare('SELECT metric,count(*) AS n FROM timing GROUP BY metric')
      .all()
      .map(({ metric, n }) => ({
        metric,
        samples: n,
        p95Ms: this.db
          .prepare('SELECT ms FROM timing WHERE metric=? ORDER BY ms LIMIT 1 OFFSET ?')
          .get(metric, Math.ceil(n * 0.95) - 1).ms,
      }));
  }
  close() {
    this.db.close();
  }
}
