
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Team } from '@/lib/types';
import { getSession } from '@/lib/session';

const teamsFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'teams.json');

async function readTeams(): Promise<Team[]> {
  try {
    const data = await fs.promises.readFile(teamsFilePath, 'utf-8');
    const teams: Team[] = JSON.parse(data);
    // Sort teams alphabetically by name
    teams.sort((a, b) => a.name.localeCompare(b.name));
    return teams;
  } catch (error) {
    console.error("Error reading teams file:", error);
     if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeTeams(teams: Team[]): Promise<void> {
  await fs.promises.writeFile(teamsFilePath, JSON.stringify(teams, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || (session.role !== 'Admin' && session.role !== 'Manager' && session.role !== 'Supervisor')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const teams = await readTeams();
    return NextResponse.json(teams);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to read teams data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || (session.role !== 'Admin' && session.role !== 'Manager' && session.role !== 'Supervisor')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    let teams = await readTeams();
    
    const newTeam: Team = {
      id: (teams.length > 0 ? String(Math.max(...teams.map(t => parseInt(t.id))) + 1) : "1"),
      ...body,
    };
    
    teams.push(newTeam);
    await writeTeams(teams);
    
    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    console.error("Failed to create team:", error);
    return NextResponse.json({ message: 'Failed to create team' }, { status: 500 });
  }
}
