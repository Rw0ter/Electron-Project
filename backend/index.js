import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const PORT = process.env.PORT || 3001;

const app = express();

app.use(express.json());
app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const ensureStorage = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_PATH);
  } catch {
    await fs.writeFile(USERS_PATH, '[]', 'utf-8');
  }
};

const readUsers = async () => {
  await ensureStorage();
  const raw = await fs.readFile(USERS_PATH, 'utf-8');
  return JSON.parse(raw);
};

const writeUsers = async (users) => {
  await ensureStorage();
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');
};

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ success: false, message: '请输入用户名和密码。' });
    return;
  }

  const users = await readUsers();
  if (users.some((user) => user.username === username)) {
    res.status(409).json({ success: false, message: '用户名已存在。' });
    return;
  }

  users.push({ username, password });
  await writeUsers(users);
  res.json({ success: true, message: '注册成功，请登录。' });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ success: false, message: '请输入用户名和密码。' });
    return;
  }

  const users = await readUsers();
  const match = users.find(
    (user) => user.username === username && user.password === password
  );

  if (!match) {
    res.status(401).json({ success: false, message: '用户名或密码错误。' });
    return;
  }

  res.json({ success: true, message: '登录成功。' });
});

app.listen(PORT, async () => {
  await ensureStorage();
  console.log(`Backend listening on http://localhost:${PORT}`);
});
