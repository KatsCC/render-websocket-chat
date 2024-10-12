import express from "express";
import { WebSocketServer } from "ws";
import pkg from "pg";
const { Client } = pkg;

const app = express();
const port = process.env.PORT || 3000;

const db = new Client({
  host: process.env.CLEARDB_DATABASE_HOST,
  user: process.env.CLEARDB_DATABASE_USER,
  password: process.env.CLEARDB_DATABASE_PASSWORD,
  database: process.env.CLEARDB_DATABASE_DB,
});

db.connect((err: Error | null) => {
  if (err) {
    console.error("DB 연결 실패:", err);
    return;
  }
  console.log("PostgreSQL 연결 성공");
});

app.use(express.static("public"));

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("클라이언트가 연결되었습니다.");

  db.query("SELECT * FROM messages ORDER BY timestamp ASC", (err, results) => {
    if (err) throw err;

    const messages = results.rows.map(
      (row: { username: string; message: string; timestamp: Date }) => ({
        username: row.username,
        message: row.message,
        timestamp: row.timestamp,
      })
    );

    ws.send(JSON.stringify({ type: "history", messages }));
  });

  ws.on("message", (message: string) => {
    const msgData = JSON.parse(message);
    const { username, message: chatMessage } = msgData;

    db.query(
      "INSERT INTO messages (username, message) VALUES ($1, $2)",
      [username, chatMessage],
      (err: Error) => {
        if (err) throw err;
        console.log("DB에 메시지 저장 성공");
      }
    );

    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  });

  ws.on("close", () => {
    console.log("클라이언트 연결 종료");
  });
});
