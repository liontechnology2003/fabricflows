
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Lagam, ProductionTask, SizeQuantity } from '@/lib/types';

const lagamsFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'lagams.json');
const tasksFilePath = path.join(process.cwd(), 'src/lib', 'db', 'production-tasks.json');

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

const getProducedQuantityForTask = (task: ProductionTask) => {
    // If a task is marked completed, it counts for its full planned quantity, regardless of quantityProduced
    if (task.status === 'Completed') {
        return task.quantity || 0;
    }
    // Otherwise, use the recorded produced quantity
    if (typeof task.quantityProduced === 'number') {
        return task.quantityProduced;
    }
    return 0;
};


const getProducedQuantitiesByTask = (task: ProductionTask): SizeQuantity[] => {
    if (task.status === 'Completed') {
        return task.sizeQuantities || [];
    }
    return task.sizeQuantitiesProduced || [];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lagamId = searchParams.get('lagamId');

  if (!lagamId) {
    return NextResponse.json({ message: 'Lagam ID is required' }, { status: 400 });
  }

  try {
    const lagams = await readData<Lagam>(lagamsFilePath);
    const tasks = await readData<ProductionTask>(tasksFilePath);

    const lagam = lagams.find((l) => l.lagamId === lagamId);

    if (!lagam) {
      return NextResponse.json({ message: 'Lagam not found' }, { status: 404 });
    }
    
    const sectionStatuses = lagam.productionBlueprint.map(section => {
      const relevantTasks = tasks.filter(
        (task) => task.lagamId === lagamId && task.sectionName === section.sectionName
      );
      
      const producedBySze = lagam.productInfo.sizes.map(sizeInfo => {
          const produced = relevantTasks.reduce((acc, task) => {
              const taskSizes = getProducedQuantitiesByTask(task);
              const sizeQty = taskSizes.find(s => s.size === sizeInfo.size);
              return acc + (sizeQty?.quantity || 0);
          }, 0);
          return { size: sizeInfo.size, quantity: produced };
      });

      const totalProducedForSection = producedBySze.reduce((acc, curr) => acc + curr.quantity, 0);

      return {
        sectionName: section.sectionName,
        produced: totalProducedForSection,
        planned: lagam.productInfo.totalQuantity,
        isCompleted: totalProducedForSection >= lagam.productInfo.totalQuantity,
        producedBySze: producedBySze
      };
    });

    return NextResponse.json(sectionStatuses);
  } catch (error) {
    console.error("Failed to get lagam status:", error);
    return NextResponse.json({ message: 'Failed to retrieve lagam status' }, { status: 500 });
  }
}
