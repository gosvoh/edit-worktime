import sqlite from "better-sqlite3";

export const db = sqlite("main.sqlite");
db.exec(`CREATE TABLE IF NOT EXISTS user (
    id TEXT NOT NULL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    admin BOOLEAN NOT NULL DEFAULT FALSE
)`);
db.exec(`CREATE TABLE IF NOT EXISTS session (
    id TEXT NOT NULL PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id)
)`);

export interface DatabaseUser {
  id: string;
  username: string;
  password: string;
  admin?: number;
}

export interface DatabaseSession {
  id: string;
  expires_at: number;
  user_id: string;
}
