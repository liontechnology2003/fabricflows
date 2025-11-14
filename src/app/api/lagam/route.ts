
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Lagam } from '@/lib/types';
import { getSession } from '@/lib/session';

const lagamsFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'lagams.json');

async function readLagams(): Promise<Lagam[]> {
  try {
    const data = await fs.promises.readFile(lagamsFilePath, 'utf-8');
    const lagams: Lagam[] = JSON.parse(data);
    // Sort by timestamp in ID, descending (newest first)
    lagams.sort((a, b) => {
        const timeA = parseInt(a.lagamId.split('-')[1] || '0');
        const timeB = parseInt(b.lagamId.split('-')[1] || '0');
        return timeB - timeA;
    });
    return lagams;
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

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || (session.role !== 'Admin' && session.role !== 'Manager' && session.role !== 'Supervisor')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const lagams = await readLagams();
    return NextResponse.json(lagams);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to read Lagams data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || (session.role !== 'Admin' && session.role !== 'Manager' && session.role !== 'Supervisor')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    let lagams = await readLagams();
    
    // For simplicity, assuming the body is a single new Lagam or an array to overwrite.
    // A real app would have more robust logic for updates/deletes.
    if (Array.isArray(body)) {
        await writeLagams(body);
        return NextResponse.json({ message: 'Lagams updated successfully' }, { status: 200 });
    } else {
        const newLagam: Lagam = {
          ...body,
          lagamId: `LAG-${Date.now()}` // Simple unique ID
        };
        lagams.push(newLagam);
        await writeLagams(lagams);
        return NextResponse.json(newLagam, { status: 201 });
    }
  } catch (error) {
    console.error("Failed to process Lagam request:", error);
    return NextResponse.json({ message: 'Failed to process Lagam request' }, { status: 500 });
  }
}
