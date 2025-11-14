
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import type { User } from '@/lib/types';
import { getSession } from '@/lib/session';

const usersFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'users.json');

async function readUsers(): Promise<User[]> {
  try {
    const data = await fs.promises.readFile(usersFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const users = await readUsers();
    const user = users.find(u => u.email === email);

    if (!user || !user.password) {
      return NextResponse.json({ message: 'User not found or password not set' }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const session = await getSession();
    session.id = user.id;
    session.name = user.name;
    session.email = user.email;
    session.role = user.role;
    session.isLoggedIn = true;
    await session.save();

    const { password: _, ...userToReturn } = user;

    return NextResponse.json(userToReturn);

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
