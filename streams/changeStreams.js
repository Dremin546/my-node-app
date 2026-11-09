const { WebSocketServer } = require('ws');

function setupChangeStreams(db, wsPort = 3001) {
  const wss = new WebSocketServer({ port: wsPort });

  wss.on('connection', (ws) => {
    console.log("[WS] Подключен новый клиент");
    ws.send(JSON.stringify({ type: "INFO", message: "Подключено к Change Stream" }));
  });

  const studentsCol = db.collection('students');
  const stream = studentsCol.watch();

  stream.on('change', (change) => {
    let payload = null;

    if (change.operationType === 'insert') {
      console.log(`[WS] insert: { name: "${change.fullDocument.name}" }`);
      payload = { type: 'insert', doc: change.fullDocument };
    } else if (change.operationType === 'update') {
      console.log(`[WS] update: { _id: ${change.documentKey._id} }`);
      payload = { type: 'update', id: change.documentKey._id, fields: change.updateDescription.updatedFields };
    } else if (change.operationType === 'delete') {
      console.log(`[WS] delete: { _id: ${change.documentKey._id} }`);
      payload = { type: 'delete', id: change.documentKey._id };
    }

    if (payload) {
      const message = JSON.stringify(payload);
      for (const client of wss.clients) {
        if (client.readyState === 1) {
          client.send(message);
        }
      }
    }
  });

  return { wss, stream };
}

module.exports = { setupChangeStreams };
