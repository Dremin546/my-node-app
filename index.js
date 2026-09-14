const http = require('http');
function calculatePi(precision) {
    let pi = 3;
    let sign = 1;
    for (let i = 2; i < 100000; i += 2) {
        pi += sign * (4 / (i * (i + 1) * (i + 2)));
        sign *= -1;
    }
    return pi.toFixed(precision);
}

const Name = "Дёмин Вадим Эдуардович";
const Group = "477";
const Num = 6; 
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <h1>${Name}</h1>
    <h2>Группа: ${Group}</h2>
    <h2>Число Пи до ${Num} знака ${calculatePi(Num)}</h2>
  `);
});
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Серверак на http://localhost:${PORT}`);
});