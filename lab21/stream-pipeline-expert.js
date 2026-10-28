const { Readable, Transform, Writable, pipeline } = require('stream');
const fs = require('fs');

// 1. Readable
class StudentReadable extends Readable {
    constructor() { super({ objectMode: true }); this.count = 0; }
    _read() {
        if (this.count >= 10000) return this.push(null);
        const chunk = [];
        for (let i = 0; i < 100; i++) {
            chunk.push({ id: ++this.count, name: "Иван Иванов", group: "ББМО-01-23", course: 2, grade: Math.floor(Math.random() * 5) + 1 });
        }
        this.push(chunk);
    }
}

// 2. Transform
const validate = new Transform({ objectMode: true, transform(chunk, enc, cb) {
    chunk.forEach(s => { if (s.id && s.name) this.push(s); });
    cb();
} });

const enrich = new Transform({ objectMode: true, transform(s, enc, cb) {
    s.averageGrade = (s.grade + 4) / 2;
    cb(null, s);
} });

const filter = new Transform({ objectMode: true, transform(s, enc, cb) {
    if (s.grade > 3) cb(null, s);
    else cb();
} });

const format = new Transform({ objectMode: true, transform(s, enc, cb) {
    cb(null, `${s.id},${s.name},${s.group},${s.course},${s.grade},${s.averageGrade}\n`);
} });

// 3. Writable
const writable = new Writable({ write(chunk, enc, cb) {
    fs.appendFile('lab21/students.csv', chunk, cb);
} });

// 5. Конвейер
console.log("=== Запуск конвейера (Экспертный уровень) ===");
fs.writeFileSync('lab21/students.csv', 'id,name,group,course,grade,averageGrade\n');

pipeline(new StudentReadable(), validate, enrich, filter, format, writable, (err) => {
    if (err) console.error("Ошибка:", err);
    else console.log("Обработка завершена. Файл: students.csv");
});
