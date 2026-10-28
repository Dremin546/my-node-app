const { Readable, Transform } = require('stream');

class UpperCaseTransform extends Transform {
    constructor() { super({ readableObjectMode: true, writableObjectMode: true }); }
    _transform(chunk, encoding, callback) {
        this.push(`[BBMO-01-23] ${chunk.toString().toUpperCase()}`);
        callback();
    }
}

const readable = Readable.from(['группа ббмо-01-23', 'студент вадим']);
const upper = new UpperCaseTransform();
upper.on('data', (data) => console.log(`Выход: "${data}"`));
readable.on('data', (data) => console.log(`Вход: "${data}"`));
readable.pipe(upper);

setTimeout(() => {
    console.log("\n=== Демонстрация Object Mode ===");
    const students = [
        { id: 1, name: "Вадим", group: "ББМО-01-23" },
        { id: 2, name: "Мария", group: "ББМО-02-23" },
        { id: 3, name: "Петр", group: "ББМО-01-23" }
    ];
    const r2 = Readable.from(students);
    
    console.log("После фильтрации (только ББМО-01-23):");
    const filter = new Transform({
        objectMode: true,
        transform(chunk, enc, cb) {
            if (chunk.group === 'ББМО-01-23') this.push(chunk);
            cb();
        }
    });
    r2.pipe(filter).on('data', (d) => console.log(`[OBJECT]`, d));
}, 500);
