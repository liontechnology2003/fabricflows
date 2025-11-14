
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Team, User } from '@/lib/types';

const teamsFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'teams.json');
const usersFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'users.json');

async function readTeams(): Promise<Team[]> {
  try {
    const data = await fs.promises.readFile(teamsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

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

export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;
    const teams = await readTeams();
    const team = teams.find((t) => t.id === teamId);

    if (!team) {
      return NextResponse.json({ message: 'Team not found' }, { status: 404 });
    }

    const users = await readUsers();
    const operatorIds = team.memberIds.filter(memberId => {
        const user = users.find(u => u.id === memberId);
        return user && user.role === 'Operator';
    });

    const teamData = {
        ...team,
        memberIds: operatorIds, // Overwrite memberIds with only operators
        operatorCount: operatorIds.length,
    }

    return NextResponse.json(teamData);
  } catch (error) {
    console.error("Failed to read team:", error);
    return NextResponse.json({ message: 'Failed to read team data' }, { status: 500 });
  }
}
