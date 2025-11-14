
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Lagam, ProductionTask, Team, User } from '@/lib/types';

const lagamsFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'lagams.json');
const tasksFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'production-tasks.json');
const usersFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'users.json');

async function readLagams(): Promise<Lagam[]> {
  try {
    const data = await fs.promises.readFile(lagamsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeLagams(lagams: Lagam[]): Promise<void> {
  await fs.promises.writeFile(lagamsFilePath, JSON.stringify(lagams, null, 2), 'utf-8');
}

async function readTasks(): Promise<ProductionTask[]> {
  try {
    const data = await fs.promises.readFile(tasksFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeTasks(tasks: ProductionTask[]): Promise<void> {
  await fs.promises.writeFile(tasksFilePath, JSON.stringify(tasks, null, 2), 'utf-8');
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
  { params }: { params: { lagamId: string } }
) {
  try {
    const { lagamId } = params;
    const lagams = await readLagams();
    const lagam = lagams.find((l) => l.lagamId === lagamId);

    if (!lagam) {
      return NextResponse.json({ message: 'Lagam not found' }, { status: 404 });
    }

    if (lagam.teamInfo && lagam.teamInfo.assignedTeamId) {
        const teamId = lagam.teamInfo.assignedTeamId;
        const host = request.headers.get('host');
        const protocol = host?.startsWith('localhost') ? 'http' : 'https';
        const teamApiUrl = `${protocol}://${host}/api/teams/${teamId}`;

        try {
            const teamRes = await fetch(teamApiUrl, { cache: 'no-store' });
            if (teamRes.ok) {
                const teamData: Team & { operatorCount: number } = await teamRes.json();
                const users = await readUsers();
                const manager = users.find(u => teamData.memberIds.includes(u.id) && u.role === 'Manager');

                lagam.teamInfo.teamMemberCount = teamData.memberIds.length;
                lagam.teamInfo.operatorCount = teamData.operatorCount;
                lagam.teamInfo.assignedTeamName = teamData.name;
                if (manager) {
                    lagam.teamInfo.managerName = manager.name;
                }
            } else {
                console.warn(`Could not fetch team data for teamId: ${teamId}`);
            }
        } catch (fetchError) {
            console.error(`Error fetching team data for teamId: ${teamId}`, fetchError);
        }
    }

    return NextResponse.json(lagam);
  } catch (error) {
    console.error("Failed to read Lagam:", error);
    return NextResponse.json({ message: 'Failed to read Lagam data' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { lagamId: string } }
) {
  try {
    const { lagamId } = params;
    const body = await request.json();
    let lagams = await readLagams();
    const lagamIndex = lagams.findIndex((l) => l.lagamId === lagamId);

    if (lagamIndex === -1) {
      return NextResponse.json({ message: 'Lagam not found' }, { status: 404 });
    }

    lagams[lagamIndex] = { ...body, lagamId };
    await writeLagams(lagams);

    return NextResponse.json(lagams[lagamIndex]);
  } catch (error) {
    console.error("Failed to update Lagam:", error);
    return NextResponse.json({ message: 'Failed to update Lagam' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { lagamId: string } }
) {
  try {
    const { lagamId } = params;
    
    let tasks = await readTasks();
    const updatedTasks = tasks.filter((task) => task.lagamId !== lagamId);
    await writeTasks(updatedTasks);

    let lagams = await readLagams();
    const updatedLagams = lagams.filter((l) => l.lagamId !== lagamId);

    if (lagams.length === updatedLagams.length) {
      return NextResponse.json({ message: 'Lagam not found' }, { status: 404 });
    }

    await writeLagams(updatedLagams);

    return NextResponse.json({ message: 'Lagam and associated tasks deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete Lagam:", error);
    return NextResponse.json({ message: 'Failed to delete Lagam' }, { status: 500 });
  }
}
