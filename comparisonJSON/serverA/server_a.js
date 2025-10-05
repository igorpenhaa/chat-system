const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const forums = new Map();

app.post('/join', (req, res) => {
  const { username, forum_id } = req.body;
  if (!forum_id) {
    return res.status(400).json({ error: 'Missing forum_id' });
  }

  if (!forums.has(forum_id)) {
    forums.set(forum_id, new Set());
  }

  console.log(`User ${username} joined forum ${forum_id}. Total connections: ${forums.get(forum_id).size}`);

  res.json({ success: true, message: 'Joined forum successfully' });
});

app.post('/send', (req, res) => {
  const msg = req.body;
  console.log('SendMessage received:', msg);

  const list = forums.get(msg.forum_id);
  if (list) {
    console.log(`Broadcasting message to ${list.size} connections in forum ${msg.forum_id}`);
  }

  res.json({ success: true });
});

function main() {
  const PORT = 3001;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server A listening on port ${PORT}`);
  });
}

main();