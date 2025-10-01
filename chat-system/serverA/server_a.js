// serverA/server_a.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDef = protoLoader.loadSync('../chat.proto', {});
const grpcObject = grpc.loadPackageDefinition(packageDef);
const chat = grpcObject.chat;

const forums = new Map(); // forumId -> Set of call (ServerWritableStream)

function JoinForum(call) {
  const forum_id = call.request && call.request.forum_id;
  if (!forum_id) { call.end(); return; }
  if (!forums.has(forum_id)) forums.set(forum_id, new Set());
  forums.get(forum_id).add(call);

  console.log(`User joined forum ${forum_id}. total connections: ${forums.get(forum_id).size}`);

  // cliente pode cancelar; quando isso acontecer, remover a stream:
  call.on('cancelled', () => {
    forums.get(forum_id).delete(call);
    console.log(`Connection left forum ${forum_id}. remaining: ${forums.get(forum_id).size}`);
  });

  // não fechamos o call — mantemos o stream aberto
}

function SendMessage(call, callback) {
  const msg = call.request;
  console.log('SendMessage received:', msg);
  const list = forums.get(msg.forum_id);
  if (list) {
    for (const c of Array.from(list)) {
      // tente escrever; se erro, remova
      try {
        c.write(msg);
      } catch (err) {
        list.delete(c);
      }
    }
  }
  callback(null, {}); // retorna Empty
}

function main() {
  const server = new grpc.Server();
  server.addService(chat.ChatServer.service, { JoinForum, SendMessage });
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) return console.error(err);
    console.log('Server A listening on', port);
    server.start();
  });
}

main();

