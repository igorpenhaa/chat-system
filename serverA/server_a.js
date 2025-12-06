const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const client = require('prom-client');
const http = require('http');

const packageDef = protoLoader.loadSync('./chat.proto', {});
const grpcObject = grpc.loadPackageDefinition(packageDef);
const chat = grpcObject.chat;

const forums = new Map();

// Definicao e Registro das Metricas
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Gauge para rastrear o número de streams de chat abertos
const activeConnectionsGauge = new client.Gauge({
    name: 'chat_active_connections_total',
    help: 'Total number of active chat streaming connections per forum',
    labelNames: ['forum_id'],
    registers: [register],
});

// Contador para mensagens enviadas
const messageSentCounter = new client.Counter({
    name: 'chat_messages_sent_total',
    help: 'Total number of messages sent (called SendMessage)',
    labelNames: ['forum_id', 'status'],
    registers: [register],
});

// Summary para rastrear a latencia do SendMessage
const sendMessageLatency = new client.Summary({
    name: 'chat_send_message_latency_seconds',
    help: 'SendMessage call processing latency',
    labelNames: ['forum_id'],
    percentiles: [0.5, 0.9, 0.99],
    registers: [register],
});

function JoinForum(call) {
  const req = call.request;
  const forum_id = req.forum_id || req.forumId;

  if (!forum_id) { call.end(); return; }
  if (!forums.has(forum_id)) forums.set(forum_id, new Set());
  forums.get(forum_id).add(call);
  //METRICA: incrementa o gauge de conexoes ativas
  activeConnectionsGauge.inc({ forum_id });

  console.log(`User joined forum ${forum_id}. total connections: ${forums.get(forum_id).size}`);

  // cliente pode cancelar; quando isso acontecer, remover a stream:
  call.on('cancelled', () => {
    forums.get(forum_id).delete(call);
    // METRICA: Decrementa o Gauge
    activeConnectionsGauge.dec({ forum_id });
    console.log(`Connection left forum ${forum_id}. remaining: ${forums.get(forum_id).size}`);
  });

  // nao fechamos o call — mantemos o stream aberto
}

function SendMessage(call, callback) {
  const endTimer = sendMessageLatency.startTimer({ forum_id: call.request.forum_id });
  let status = 'success';

  const msg = call.request;
  console.log('SendMessage received:', msg);
  const list = forums.get(msg.forum_id);
  try {
    if (list) {
      for (const c of Array.from(list)) {
        try {
          c.write(msg);
        } catch (err) {
          list.delete(c);
        }
      }
    }
    callback(null, {});
  } catch (err) {
    status = 'error';
    console.error('Error during SendMessage processing:', err);
    callback(err, null);
  } finally {
    // METRICA: Incrementa o contador e finaliza o Summary
    messageSentCounter.inc({ forum_id: msg.forum_id, status });
    endTimer()
  }
}

function main() {
  // Inicializar o Servidor de Métricas HTTP (Porta 8000)
  const metricsServer = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } else {
      res.statusCode = 404;
      res.end('404 Not Found');
    }
  });

  const metricsPort = 8000;
  metricsServer.listen(metricsPort, () => {
    console.log(`Prometheus Metrics Server listening on http://0.0.0.0:${metricsPort}/metrics`);
  });

  const server = new grpc.Server();
  server.addService(chat.ChatServer.service, { JoinForum, SendMessage });
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) return console.error(err);
    console.log('Server A listening on', port);
    server.start();
  });
}

main();

