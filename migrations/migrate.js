const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.sql')).sort();
  let appliedCount = 0;

  for (const file of files) {
    const [existing] = await pool.query("SELECT * FROM migrations WHERE name = ?", [file]);
    if (existing.length === 0) {
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      await pool.query(sql);
      await pool.query("INSERT INTO migrations (name) VALUES (?)", [file]);
      appliedCount++;
    }
  }

  return files.length;
}

if (require.main === module) {
  runMigrations()
    .then(count => {
      console.log(`[INFO] Миграции применены: ${count}`);
      process.exit(0);
    })
    .catch(err => {
      console.error("[ERROR] Ошибка миграции:", err.message);
      process.exit(1);
    });
}

module.exports = { runMigrations };
