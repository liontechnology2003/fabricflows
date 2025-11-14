
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { User } from '@/lib/types';
import bcrypt from 'bcryptjs';

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

async function writeUsers(users: User[]): Promise<void> {
  await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
}


export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const users = await readUsers();
    const user = users.find((u) => u.id === id);

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const { password, ...userToReturn } = user;
    return NextResponse.json(userToReturn);

  } catch (error) {
    console.error("Failed to read user:", error);
    return NextResponse.json({ message: 'Failed to read user data' }, { status: 500 });
  }
}


export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    let users = await readUsers();
    const userIndex = users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const existingUser = users[userIndex];
    
    const updatedUser: User = {
      ...existingUser,
      name: body.name !== undefined ? body.name : existingUser.name,
      email: body.email !== undefined ? body.email : existingUser.email,
      employeeId: body.employeeId !== undefined ? body.employeeId : existingUser.employeeId,
      role: body.role !== undefined ? body.role : existingUser.role,
      avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : existingUser.avatarUrl,
    };

    if (body.password) {
      updatedUser.password = await bcrypt.hash(body.password, 10);
    }

    users[userIndex] = updatedUser;
    await writeUsers(users);

    const { password, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    let users = await readUsers();
    const usersToKeep = users.filter((u) => u.id !== id);

    if (users.length === usersToKeep.length) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    await writeUsers(usersToKeep);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ message: 'Failed to delete user' }, { status: 500 });
  }
}
