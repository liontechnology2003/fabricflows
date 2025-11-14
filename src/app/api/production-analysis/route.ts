
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { ProductionTask, Lagam, User, PlannedOperation } from '@/lib/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { getSession } from '@/lib/session';

// Data paths
const lagamsFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'lagams.json');
const tasksFilePath = path.join(process.cwd(), 'src', 'lib', 'db', 'production-tasks.json');
const usersFilePath = path.join(process.cwd(), 'src/lib', 'db', 'users.json');
const teamsFilePath = path.join(process.cwd(), 'src/lib', 'db', 'teams.json');

// Helper to read and parse JSON files
async function readData<T>(filePath: string): Promise<T[]> {
  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []; // Return empty array if file doesn't exist
    }
    console.error(`Error reading ${filePath}:`, error);
    throw error;
  }
}

// Helper to find standard time for a section in a lagam
const getSectionStdTime = (lagam: Lagam, sectionName: string): number => {
    const section = lagam.productionBlueprint.find(s => s.sectionName === sectionName);
    if (!section) return 0;
    return section.plannedOperations.reduce((acc, op) => acc + (op.tiempo || 0), 0);
};

const getSlotDuration = (timeSlot: string | null): number => {
  if (!timeSlot) return 0;
  switch (timeSlot) {
    case "7:30 to 9:30":
    case "9:30 to 11:30":
    case "11:30 to 1:30":
    case "2:00 to 4:00":
      return 120;
    case "4:00 to 5:00":
      return 60;
    case "Overtime 1":
    case "Overtime 2":
      return 60; // Assuming overtime slots are 1 hour
    default:
      return 0;
  }
};


export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session.isLoggedIn || (session.role !== 'Admin' && session.role !== 'Manager' && session.role !== 'Supervisor')) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');

        const [lagams, tasks, users, teams] = await Promise.all([
            readData<Lagam>(lagamsFilePath),
            readData<ProductionTask>(tasksFilePath),
            readData<User>(usersFilePath),
            readData<any>(teamsFilePath)
        ]);
        
        let filteredTasks = tasks.filter(task => task.status === 'Completed' || task.status === 'In Progress');

        if (dateParam) {
            if (dateParam.length === 7) { // Monthly view
                const start = startOfMonth(new Date(dateParam));
                const end = endOfMonth(new Date(dateParam));
                filteredTasks = filteredTasks.filter(task => {
                    if (!task.date) return false;
                    const taskDate = new Date(task.date);
                    return isWithinInterval(taskDate, { start, end });
                });
            } else { // Daily view
                 const start = startOfDay(parseISO(dateParam));
                 const end = endOfDay(parseISO(dateParam));
                 filteredTasks = filteredTasks.filter(task => {
                    if (!task.date) return false;
                    const taskDate = new Date(task.date);
                    return isWithinInterval(taskDate, { start, end });
                });
            }
        }
        
        const operatorPerformance: { [key: string]: { id: string, name: string, unitsProduced: number, stdTimeEarned: number, actualTime: number, avatarUrl?: string } } = {};

        // Initialize all users with 0 performance to ensure they appear in reports even with no tasks
        users.forEach(user => {
            operatorPerformance[user.id] = {
                id: user.id,
                name: user.name,
                unitsProduced: 0,
                stdTimeEarned: 0,
                actualTime: 0,
                avatarUrl: user.avatarUrl,
            };
        });

        filteredTasks.forEach(task => {
            if (!task.teamMemberId) return;

            const lagam = lagams.find(l => l.lagamId === task.lagamId);
            if (!lagam) return;
            
            const user = users.find(u => u.id === task.teamMemberId);
            if (!user) return;

            const sectionStdTimePerUnit = getSectionStdTime(lagam, task.sectionName);
            
            const quantity = task.quantityProduced ?? 0;
            const stdTimeForTask = quantity * sectionStdTimePerUnit;
            const actualTimeForTask = task.actualTime ?? getSlotDuration(task.timeSlot);
            
            // We are accumulating now, not re-initializing
            operatorPerformance[user.id].unitsProduced += quantity;
            operatorPerformance[user.id].stdTimeEarned += stdTimeForTask;
            operatorPerformance[user.id].actualTime += actualTimeForTask;
        });
        
        const finalOperatorPerformance = Object.values(operatorPerformance).map(op => {
            const performance = op.actualTime > 0 ? (op.stdTimeEarned / op.actualTime) * 100 : 0;
            // OLE = Performance because Availability and Quality are assumed 100%
            const ole = performance;

            return {
                ...op,
                performance: performance,
                ole: ole,
            }
        }).sort((a,b) => b.performance - a.performance);


        const teamPerformance: { [key: string]: { id: string, name: string, unitsProduced: number, stdTimeEarned: number, actualTime: number, memberIds: string[] } } = {};

        teams.forEach(team => {
            teamPerformance[team.id] = {
                id: team.id,
                name: team.name,
                unitsProduced: 0,
                stdTimeEarned: 0,
                actualTime: 0,
                memberIds: team.memberIds || []
            };
            
            (team.memberIds || []).forEach((memberId: string) => {
                const operatorData = operatorPerformance[memberId];
                if (operatorData) {
                    teamPerformance[team.id].unitsProduced += operatorData.unitsProduced;
                    teamPerformance[team.id].stdTimeEarned += operatorData.stdTimeEarned;
                    teamPerformance[team.id].actualTime += operatorData.actualTime;
                }
            });
        });

        const finalTeamPerformance = Object.values(teamPerformance).map(team => {
             const performance = team.actualTime > 0 ? (team.stdTimeEarned / team.actualTime) * 100 : 0;
             // OLE = Performance because Availability and Quality are assumed 100%
             const ole = performance;

             return {
                ...team,
                performance: performance,
                ole: ole,
             }
        }).sort((a,b) => b.performance - a.performance);

        // Update manager performance to match their team's performance
        const managers = users.filter(user => user.role === 'Manager');
        const finalOperatorPerformanceWithManagerUpdates = finalOperatorPerformance.map(operator => {
            // Check if this operator is a manager
            const isManager = managers.some(manager => manager.id === operator.id);
            if (isManager) {
                // Find which team this manager belongs to
                const team = teams.find(team => 
                    team.memberIds && team.memberIds.includes(operator.id)
                );
                
                if (team) {
                    // Find the team performance
                    const teamPerformance = finalTeamPerformance.find(t => t.id === team.id);
                    if (teamPerformance) {
                        // Update the manager's performance to match the team's performance
                        return {
                            ...operator,
                            performance: teamPerformance.performance,
                            ole: teamPerformance.ole
                        };
                    }
                }
            }
            return operator;
        });

        return NextResponse.json({
            operators: finalOperatorPerformanceWithManagerUpdates,
            teams: finalTeamPerformance
        });

    } catch (error) {
        console.error("Failed to generate production analysis:", error);
        return NextResponse.json({ message: 'Failed to generate analysis data' }, { status: 500 });
    }
}
