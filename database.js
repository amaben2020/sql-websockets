import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql
  .createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })
  .promise();

const [result = undefined] = await pool.query('SELECT * FROM notes');

async function getNote(id) {
  const [rows = undefined] = await pool.query(
    `SELECT * FROM notes WHERE id = ?`,
    [id]
  );

  return rows;
}

async function createNote(title, content) {
  const result = await pool.query(
    `INSERT INTO notes (title,content,user_id) VALUES (?,?,?)`,
    [title, content, 1]
  );

  return result;
}

// await createNote('My first note', 'This is my first note');

// const note = await getNote(1);
// console.log(note);
const rows = result;
console.log(rows);
