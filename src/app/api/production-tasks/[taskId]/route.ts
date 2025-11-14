import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { ProductionTask } from '@/lib/types';

const tasksFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'production-tasks.json');

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

export async function PUT(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;
    const body = await request.json();
    let tasks = await readTasks();
    const taskIndex = tasks.findIndex((t) => t.id === taskId);

    if (taskIndex === -1) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    // Merge the existing task with the updates from the body
    tasks[taskIndex] = { ...tasks[taskIndex], ...body, id: taskId };
    
    await writeTasks(tasks);

    return NextResponse.json(tasks[taskIndex]);
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json({ message: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;
    let tasks = await readTasks();
    const updatedTasks = tasks.filter((t) => t.id !== taskId);

    if (tasks.length === updatedTasks.length) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }
    
    await writeTasks(updatedTasks);

    return NextResponse.json({ message: 'Task deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json({ message: 'Failed to delete task' }, { status: 500 });
  }
}
