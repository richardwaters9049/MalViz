import { NextResponse } from "next/server";
import { Pool } from "pg";
import fs from "fs/promises";
import path from "path";

// Set up PostgreSQL connection
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});

// Handle file upload
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Save file temporarily
    const filePath = path.join("uploads", `${Date.now()}-${file.name}`);
    const fileBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(fileBuffer));

    console.log("File received:", file.name);

    // Insert into PostgreSQL
    const client = await pool.connect();
    const query =
      "INSERT INTO files (filename, mimetype) VALUES ($1, $2) RETURNING *";
    const values = [file.name, file.type];

    const result = await client.query(query, values);
    client.release();

    console.log("File stored in DB:", result.rows[0]);

    // Remove file after storing metadata
    await fs.unlink(filePath);

    return NextResponse.json({
      message: "File uploaded successfully",
      file: result.rows[0],
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
