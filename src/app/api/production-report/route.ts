import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { ProductionTask, Lagam, User, Team } from '@/lib/types';
import { isWithinInterval, parseISO, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'; // Import startOfDay
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
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const teamIdParam = searchParams.get('teamId');
        const viewMode = searchParams.get('viewMode') || 'daily';

        const [lagams, tasks, users, allTeams] = await Promise.all([
            readData<Lagam>(lagamsFilePath),
            readData<ProductionTask>(tasksFilePath),
            readData<User>(usersFilePath),
            readData<Team>(teamsFilePath)
        ]);

        let filteredTasks = tasks.filter(task => task.status === 'Completed' || task.status === 'In Progress');

        if (startDateParam && endDateParam) {
            let start = parseISO(startDateParam);
            let end = parseISO(endDateParam);

            if (viewMode === 'monthly') {
                start = startOfMonth(start);
                end = endOfMonth(end);
            } else { // Handle daily view mode explicitly
                // For daily view, ensure start is at the beginning of the day and end is at the end of the day
                start = startOfDay(parseISO(startDateParam));
                end = endOfDay(parseISO(startDateParam)); 
            }

            filteredTasks = filteredTasks.filter(task => {
                if (!task.date) return false;
                const taskDate = new Date(task.date);
                return isWithinInterval(taskDate, { start, end });
            });
        }

        // 1. Calculate raw performance stats for every user who performed tasks
        const operatorPerformance: { [key: string]: { id: string, name: string, unitsProduced: number, stdTimeEarned: number, actualTime: number, avatarUrl?: string, tasks: ProductionTask[] } } = {};

        users.forEach(user => {
            operatorPerformance[user.id] = {
                id: user.id,
                name: user.name,
                unitsProduced: 0,
                stdTimeEarned: 0,
                actualTime: 0,
                avatarUrl: user.avatarUrl,
                tasks: []
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

            if (operatorPerformance[user.id]) {
                operatorPerformance[user.id].unitsProduced += quantity;
                operatorPerformance[user.id].stdTimeEarned += stdTimeForTask;
                operatorPerformance[user.id].actualTime += actualTimeForTask;
                operatorPerformance[user.id].tasks.push(task);
            }
        });

        // 2. Calculate performance for ALL teams first, based on NON-MANAGER members
        const allTeamsPerformance = allTeams.map(team => {
            let unitsProduced = 0;
            let stdTimeEarned = 0;
            let actualTime = 0;

            (team.memberIds || []).forEach(memberId => {
                const memberUser = users.find(u => u.id === memberId);
                if (memberUser && memberUser.role !== 'Manager' && memberUser.role !== 'Supervisor') {
                    const operatorData = operatorPerformance[memberId];
                    if (operatorData) {
                        unitsProduced += operatorData.unitsProduced;
                        stdTimeEarned += operatorData.stdTimeEarned;
                        actualTime += operatorData.actualTime;
                    }
                }
            });

            const performance = actualTime > 0 ? (stdTimeEarned / actualTime) * 100 : 0;
            const ole = performance;

            return {
                id: team.id,
                name: team.name,
                unitsProduced,
                stdTimeEarned,
                actualTime,
                memberIds: team.memberIds || [],
                performance,
                ole,
            };
        });
        
        // 3. Create final operator performance list, substituting managers' stats with their team's stats
        const finalOperatorPerformance = Object.values(operatorPerformance).map(op => {
            const user = users.find(u => u.id === op.id);
            const isManager = user && (user.role === 'Manager' || user.role === 'Supervisor');

            if (isManager) {
                const managerTeam = allTeamsPerformance.find(team => (team.memberIds || []).includes(user.id));
                
                if (managerTeam) {
                    return {
                        ...op,
                        unitsProduced: managerTeam.unitsProduced,
                        stdTimeEarned: managerTeam.stdTimeEarned,
                        actualTime: managerTeam.actualTime,
                        performance: managerTeam.performance,
                        ole: managerTeam.ole,
                        tasks: [],
                        isManager: true
                    };
                } else {
                    return { ...op, unitsProduced: 0, stdTimeEarned: 0, actualTime: 0, performance: 0, ole: 0, tasks: [], isManager: true };
                }
            }

            // For non-managers, calculate performance based on their own tasks
            const performance = op.actualTime > 0 ? (op.stdTimeEarned / op.actualTime) * 100 : 0;
            const ole = performance;
            return { ...op, performance, ole, isManager: false };
        });

        // 4. Filter the list of teams to be returned in the response if a teamId is specified
        let finalTeamPerformance = [...allTeamsPerformance].sort((a,b) => b.performance - a.performance);
        if (teamIdParam) {
            finalTeamPerformance = finalTeamPerformance.filter(team => team.id === teamIdParam);
        }

        return NextResponse.json({
            operators: finalOperatorPerformance,
            teams: finalTeamPerformance,
            allTeams: allTeams // Keep sending all teams for other potential UI uses
        });

    } catch (error) {
        console.error("Failed to generate production report:", error);
        return NextResponse.json({ message: 'Failed to generate report data' }, { status: 500 });
    }
}