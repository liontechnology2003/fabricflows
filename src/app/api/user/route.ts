
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

async function writeUsers(users: User[]): Promise<void> {
  await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session.isLoggedIn || (session.role !== 'Admin' && session.role !== 'Manager')) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const users = await readUsers();
        const usersWithoutPasswords = users.map(user => {
            const { password, ...userToReturn } = user;
            return userToReturn;
        });

        return NextResponse.json(usersWithoutPasswords);
    } catch (error) {
        console.error("Error reading users:", error);
        return NextResponse.json({ message: 'Failed to read users data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session.isLoggedIn || (session.role !== 'Admin' && session.role !== 'Manager')) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { name, email, role, password } = body;

        if (!name || !email || !role || !password) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const users = await readUsers();
        if (users.some(user => user.email === email)) {
            return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser: User = {
            id: `USR-${Date.now()}`,
            name,
            email,
            role,
            password: hashedPassword,
            avatarUrl: '/avatars/default.png',
        };

        users.push(newUser);
        await writeUsers(users);

        const { password: _, ...userToReturn } = newUser;
        return NextResponse.json(userToReturn, { status: 201 });

    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ message: 'Failed to create user' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getSession();
        if (!session.isLoggedIn || (session.role !== 'Admin' && session.role !== 'Manager')) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
        }

        let users = await readUsers();
        const userIndex = users.findIndex(user => user.id === id);

        if (userIndex === -1) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        const updatedUser = { ...users[userIndex], ...updateData };
        users[userIndex] = updatedUser;

        await writeUsers(users);

        const { password, ...userToReturn } = updatedUser;
        return NextResponse.json(userToReturn);

    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session.isLoggedIn || (session.role !== 'Admin' && session.role !== 'Manager')) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
        }

        let users = await readUsers();
        const initialLength = users.length;
        users = users.filter(user => user.id !== id);

        if (users.length === initialLength) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        await writeUsers(users);

        return NextResponse.json({ message: 'User deleted successfully' });

    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json({ message: 'Failed to delete user' }, { status: 500 });
    }
}
