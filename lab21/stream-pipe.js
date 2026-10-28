const fs = require('fs');
const { pipeline } = require('stream');

async function runTasks() {
    console.log("=== Демонстрация pipe() ===");
    const r1 = fs.createReadStream('lab21/input.txt');
    const w1 = fs.createWriteStream('lab21/output-pipe.txt');
    r1.pipe(w1);
    await new Promise(resolve => w1.on('finish', resolve));
    console.log("Копирование завершено");

    console.log("\n=== Демонстрация pipe() с ошибкой ===");
    const missing = fs.createReadStream('lab21/missing.txt');
    const w2 = fs.createWriteStream('lab21/output-pipe-error.txt');
    missing.on('error', (err) => {
        console.log("Ошибка:", err.message);
        console.log("Внимание: pipe() не закрыл целевой поток!");
    });
    missing.pipe(w2);
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log("\n=== Демонстрация pipeline() ===");
    const r3 = fs.createReadStream('lab21/input.txt');
    const w3 = fs.createWriteStream('lab21/output-pipeline.txt');
    await new Promise(resolve => {
        pipeline(r3, w3, (err) => {
            if (err) console.error("Ошибка:", err.message);
            else console.log("Копирование завершено");
            resolve();
        });
    });

    console.log("\n=== Демонстрация pipeline() с ошибкой ===");
    const missing2 = fs.createReadStream('lab21/missing.txt');
    const w4 = fs.createWriteStream('lab21/output-pipeline-error.txt');
    await new Promise(resolve => {
        pipeline(missing2, w4, (err) => {
            if (err) {
                console.log("Ошибка:", err.message);
                console.log("Все потоки автоматически закрыты");
            }
            resolve();
        });
    });
}

runTasks();
