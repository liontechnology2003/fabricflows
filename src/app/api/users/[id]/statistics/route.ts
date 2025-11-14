
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { ProductionData, User } from '@/lib/types';

const productionFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'production.json');
const usersFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'users.json');

async function readProductionData(): Promise<ProductionData[]> {
    try {
        const data = await fs.promises.readFile(productionFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading production data file:', error);
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const users = await readUsers();
    const user = users.find(u => u.id === id);

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const productionData = await readProductionData();

    const userProduction = productionData.filter(p => p.operatorId === user.id);

    const totalProduction = userProduction.reduce((sum, p) => sum + p.quantity, 0);
    const averagePerformance = userProduction.length > 0 
      ? userProduction.reduce((sum, p) => sum + p.performance, 0) / userProduction.length 
      : 0;
    const totalDowntime = userProduction.reduce((sum, p) => sum + p.downtime, 0);

    return NextResponse.json({
      totalProduction,
      averagePerformance,
      totalDowntime,
      productionCount: userProduction.length,
    });

  } catch (error) {
    console.error(`Failed to get statistics for user ${params.id}:`, error);
    return NextResponse.json({ message: 'Failed to get user statistics' }, { status: 500 });
  }
}
