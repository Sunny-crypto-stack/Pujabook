import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "students.json");

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  degree: string;
  year: string;
  skills: string[];
  linkedin: string;
  jobTypes: string[];
  createdAt: string;
}

export function readStudents(): Student[] {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function writeStudent(student: Student): void {
  const students = readStudents();
  students.push(student);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(students, null, 2));
}
