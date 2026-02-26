const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const client = require('prom-client');
const http = require('http');
const { createClient } = require('redis');

const packageDef = protoLoader.loadSync('./chat.proto', {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const grpcObject = grpc.loadPackageDefinition(packageDef);
const chat = grpcObject.chat;

const redisUrl = process.env.REDIS_URL || 'redis://redis.chat-system.svc.cluster.local:6379';
const publisher = createClient({ url: redisUrl });
const subscriber = publisher.duplicate();
const dbClient = publisher.duplicate();

(async () => {
  await publisher.connect();
  await subscriber.connect();
  await dbClient.connect();
  console.log('Connected to Redis at ' + redisUrl);
})();

const register = new client.Registry();
client.collectDefaultMetrics({ register });
const activeConnectionsGauge = new client.Gauge({
    name: 'chat_active_connections_total',
    help: 'Total active chat streams',
    labelNames: ['forum_id'],
    registers: [register],
});
const messageSentCounter = new client.Counter({
    name: 'chat_messages_sent_total',
    help: 'Total messages sent',
    labelNames: ['forum_id', 'status'],
    registers: [register],
});

const localStreams = new Map();

subscriber.on('message', (channel, message) => {
    const forumId = channel.split(':')[1];
    if (localStreams.has(forumId)) {
        const msgObj = JSON.parse(message);
        for (const call of localStreams.get(forumId)) {
            try { call.write(msgObj); } catch (e) { }
        }
    }
});

function subscribeToForum(forumId) {
    if (!subscriber.isOpen) return;
    subscriber.subscribe(`forum:${forumId}`, (message) => {});
}

function JoinForum(call) {
    const req = call.request;
    const forum_id = req.forum_id;
    if (!forum_id) { call.end(); return; }

    if (!localStreams.has(forum_id)) {
        localStreams.set(forum_id, new Set());
        subscribeToForum(forum_id);
    }
    localStreams.get(forum_id).add(call);
    activeConnectionsGauge.inc({ forum_id });

    console.log(`User ${req.username} joined forum ${forum_id}`);

    call.on('cancelled', () => {
        if (localStreams.has(forum_id)) {
            localStreams.get(forum_id).delete(call);
            activeConnectionsGauge.dec({ forum_id });
        }
    });
}

async function SendMessage(call, callback) {
    const msg = call.request;
    const forum_id = msg.forum_id;

    if (!msg.timestamp) msg.timestamp = Date.now();

    try {
        const msgString = JSON.stringify(msg);

        // Validação de segurança
        if (!forum_id || forum_id === "undefined") {
             console.error("Tentativa de salvar em forum invalido:", msg);
             callback(new Error("Forum ID invalido"));
             return;
        }

        await dbClient.rPush(`history:${forum_id}`, msgString);
        await publisher.publish(`forum:${forum_id}`, msgString);

        messageSentCounter.inc({ forum_id: forum_id, status: 'success' });
        callback(null, {});
    } catch (err) {
        console.error("Redis error:", err);
        messageSentCounter.inc({ forum_id: forum_id, status: 'error' });
        callback(err);
    }
}

async function GetHistory(call, callback) {
    const forum_id = call.request.forum_id;
    try {
        const rawList = await dbClient.lRange(`history:${forum_id}`, 0, -1);
        const messages = rawList.map(item => JSON.parse(item));
        callback(null, { messages });
    } catch (err) {
        console.error("Redis history error:", err);
        callback(err);
    }
}

function main() {
    const metricsServer = http.createServer(async (req, res) => {
        if (req.url === '/metrics') {
            res.setHeader('Content-Type', register.contentType);
            res.end(await register.metrics());
        } else { res.statusCode = 404; res.end(); }
    });
    metricsServer.listen(8000, () => console.log('Metrics on 8000'));

    const server = new grpc.Server();
    server.addService(chat.ChatServer.service, { JoinForum, SendMessage, GetHistory });
    server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) return console.error(err);
        console.log('Server A listening on', port);
        server.start();
    });
}

main();
