
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { ProductionTask } from '@/lib/types';
import { format, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { getSession } from '@/lib/session';

const productionTasksFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'production-tasks.json');

async function readProductionTasks(): Promise<ProductionTask[]> {
  try {
    const data = await fs.promises.readFile(productionTasksFilePath, 'utf-8');
    const tasks: ProductionTask[] = JSON.parse(data);
    return tasks;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeProductionTasks(tasks: ProductionTask[]): Promise<void> {
  await fs.promises.writeFile(productionTasksFilePath, JSON.stringify(tasks, null, 2), 'utf-8');
}


export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month');
    const lagamId = searchParams.get('lagamId');
    const teamMemberId = searchParams.get('teamMemberId');

    let tasks = await readProductionTasks();

    if (date) {
      const filterDate = new Date(date);
      tasks = tasks.filter(task => task.date && isSameDay(new Date(task.date), filterDate));
    } else if (month) {
      const filterMonth = parseISO(month);
      tasks = tasks.filter(task => task.date && isSameMonth(new Date(task.date), filterMonth));
    }

    if (lagamId) {
      tasks = tasks.filter(task => task.lagamId === lagamId);
    }
    
    if (teamMemberId) {
      tasks = tasks.filter(task => task.teamMemberId === teamMemberId);
    }

    // Sort by date, descending (newest first)
    tasks.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to read production tasks:", error);
    return NextResponse.json({ message: 'Failed to read production tasks data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || (session.role !== 'Admin' && session.role !== 'Manager' && session.role !== 'Supervisor')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const tasks = await readProductionTasks();
    const newId = (tasks.length > 0 ? String(Math.max(...tasks.map(t => parseInt(t.id))) + 1) : "1");

    const newTask: ProductionTask = {
      id: newId,
      ...body,
    };
    
    tasks.push(newTask);
    await writeProductionTasks(tasks);
    
    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json({ message: 'Failed to create task' }, { status: 500 });
  }
}
