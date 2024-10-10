// const express = require('express');
// const WebSocket = require('ws');
//const { Client } = require("pg");
import express from "express";
import { WebSocketServer } from "ws";
import pkg from "pg";
const { Client } = pkg;

// Express 서버 설정
const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL 연결 정보는 환경 변수로부터 가져옵니다.
const db = new Client({
  host: process.env.CLEARDB_DATABASE_HOST,
  user: process.env.CLEARDB_DATABASE_USER,
  password: process.env.CLEARDB_DATABASE_PASSWORD,
  database: process.env.CLEARDB_DATABASE_DB,
});

db.connect((err) => {
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

  // 기존 메시지 로드
  db.query("SELECT * FROM messages ORDER BY timestamp ASC", (err, results) => {
    if (err) throw err;
    results.rows.forEach((row) => {
      ws.send(
        JSON.stringify({
          username: row.username,
          message: row.message,
          timestamp: row.timestamp,
        })
      );
    });
  });

  // 메시지 전송 및 저장
  ws.on("message", (message) => {
    const msgData = JSON.parse(message);
    const { username, message: chatMessage } = msgData;

    db.query(
      "INSERT INTO messages (username, message) VALUES ($1, $2)",
      [username, chatMessage],
      (err) => {
        if (err) throw err;
        console.log("DB에 메시지 저장 성공");
      }
    );

    wss.clients.forEach((client) => {
      console.log("client.readyState : ", client.readyState);
      console.log("WebSocketServer.OPEN : ", WebSocketServer.OPEN);

      if (client.readyState === WebSocketServer.OPEN) {
        client.send(message);
        console.log("Sent message to client:", message);
      }
    });
  });

  ws.on("close", () => {
    console.log("클라이언트 연결 종료");
  });
});
