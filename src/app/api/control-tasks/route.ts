import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { ProductionTask, Lagam } from '@/lib/types';
import { format } from 'date-fns';
import { getSession } from '@/lib/session';

const productionTasksFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'production-tasks.json');
const lagamsFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'lagams.json');

async function readData<T>(filePath: string): Promise<T[]> {
  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || (session.role !== 'Admin' && session.role !== 'Manager' && session.role !== 'Supervisor')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const tasks = await readData<ProductionTask>(productionTasksFilePath);
    const lagams = await readData<Lagam>(lagamsFilePath);

    const getLagamStatus = (lagam: Lagam, allTasks: ProductionTask[]): Lagam['status'] => {
        const relevantTasks = allTasks.filter(t => t.lagamId === lagam.lagamId);
        if (relevantTasks.length === 0) {
            return 'Draft';
        }
        const totalProduced = relevantTasks.reduce((acc, task) => acc + (task.quantityProduced || 0), 0);
        if (totalProduced >= lagam.productInfo.totalQuantity) {
            return 'Completed';
        }
        return 'Active';
    };

    const activeLagamsCount = lagams.filter(lagam => getLagamStatus(lagam, tasks) === 'Active').length;
    const tasksInProgressCount = tasks.filter(task => task.status === 'In Progress').length;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const tasksCompletedToday = tasks.filter(task => task.status === 'Completed' && task.date === today).length;

    // Sort tasks by date, descending, and take the most recent ones for activities
    const recentActivities = tasks
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);


    const data = {
      kpis: {
        activeLagams: activeLagamsCount,
        tasksInProgress: tasksInProgressCount,
        tasksCompletedToday,
      },
      recentActivities,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to read control tower data:", error);
    return NextResponse.json({ message: 'Failed to read control tower data' }, { status: 500 });
  }
}
