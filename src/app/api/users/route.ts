
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { User } from '@/lib/types';
import bcrypt from 'bcryptjs';

const usersFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'users.json');

async function readUsers(): Promise<User[]> {
  try {
    const data = await fs.promises.readFile(usersFilePath, 'utf-8');
    const users: User[] = JSON.parse(data);
    users.sort((a, b) => a.name.localeCompare(b.name));
    return users;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeUsers(users: User[]): Promise<void> {
  await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const users = await readUsers();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to read users data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let users = await readUsers();
    
    const newId = `USR-${Date.now()}`;

    const newUser: User = {
      id: newId,
      name: body.name,
      email: body.email || null,
      employeeId: body.employeeId || null,
      role: body.role,
      avatarUrl: '',
    };

    if (body.password) {
        newUser.password = await bcrypt.hash(body.password, 10);
    } else if (body.role !== 'Operator') {
        return NextResponse.json({ message: 'Password is required for non-operator roles' }, { status: 400 });
    }

    if (body.role !== 'Operator' && !body.email) {
         return NextResponse.json({ message: 'Email is required for non-operator roles' }, { status: 400 });
    }
    
    users.push(newUser);
    await writeUsers(users);
    
    const { password, ...userToReturn } = newUser;

    return NextResponse.json(userToReturn, { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json({ message: 'Failed to create user' }, { status: 500 });
  }
}
