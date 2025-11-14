
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

export async function POST(request: Request) {
  try {
    const { userId, currentPassword, newPassword } = await request.json();

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json({ message: 'User ID, current password, and new password are required' }, { status: 400 });
    }

    const users = await readUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const user = users[userIndex];

    if (!user.password) {
        return NextResponse.json({ message: "Password not set for this user." }, { status: 400 });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid current password' }, { status: 401 });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    users[userIndex].password = hashedNewPassword;
    await writeUsers(users);

    return NextResponse.json({ message: 'Password changed successfully' });

  } catch (error) { 
    console.error("Password change error:", error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
