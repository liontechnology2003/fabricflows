
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { User, ProductionTask, Lagam } from "@/lib/types";
import { ArrowLeft, Shield, Briefcase, ClipboardList, User as UserIcon, Package, Hash, Percent, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isSameDay, isSameMonth, parseISO } from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";


const statusColors: Record<ProductionTask['status'], string> = {
  Pending: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  "In Progress": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return "hsl(var(--chart-2))";
    if (efficiency >= 80) return "hsl(var(--chart-4))";
    return "hsl(var(--destructive))";
};

const chartConfig = {
  attainment: {
    label: "Attainment",
  },
} satisfies ChartConfig;

const roleIcons: Record<User['role'], React.ElementType> = {
    Admin: Shield,
    Manager: Briefcase,
    Supervisor: ClipboardList,
    Operator: UserIcon,
};

const UserRoleIcon = ({ role, className }: { role: User['role'], className?: string }) => {
    const Icon = roleIcons[role] || UserIcon;
    return <Icon className={cn("h-4 w-4 text-muted-foreground", className)} />;
};


type ViewMode = "all" | "daily" | "monthly";

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [allTasks, setAllTasks] = useState<ProductionTask[]>([]);
  const [lagams, setLagams] = useState<Lagam[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const getProductName = (lagamId: string | null) => {
    if (!lagamId) return "Unknown";
    return lagams.find(l => l.lagamId === lagamId)?.productInfo.productName || "Unknown";
  }

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, tasksRes, lagamsRes] = await Promise.all([
          fetch(`/api/users`),
          fetch('/api/production-tasks'),
          fetch('/api/lagam')
        ]);
        
        if (!usersRes.ok || !tasksRes.ok || !lagamsRes.ok) {
          throw new Error("Failed to fetch profile data");
        }

        const usersData = await usersRes.json();
        const tasksData = await tasksRes.json();
        const lagamsData = await lagamsRes.json();
        
        const currentUser = usersData.find((u: User) => u.id === userId);
        
        if (!currentUser) {
            throw new Error("User not found");
        }

        setUser(currentUser);
        setAllTasks(tasksData.filter((task: ProductionTask) => task.teamMemberId === userId));
        setLagams(lagamsData);

      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: (error as Error).message || "Could not load the user profile.",
        });
        router.push('/users');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, router, toast]);

    const getTaskObjective = (task: ProductionTask) => {
        const lagam = lagams.find(l => l.lagamId === task.lagamId);
        if (!lagam) return 0;
        const section = lagam.productionBlueprint.find(s => s.sectionName === task.sectionName);
        if (!section) return 0;

        const sectionTime = section.plannedOperations.reduce((acc, op) => acc + op.tiempo, 0);
        if (!sectionTime) return 0;

        let slotDurationMinutes = 120; // Default 2 hours
        if (!task.timeSlot) return 0;
        
        if (task.timeSlot === "4:00 to 5:00" || task.timeSlot === "Overtime 1" || task.timeSlot === "Overtime 2") {
            slotDurationMinutes = 60;
        }
        
        return Math.floor(slotDurationMinutes / sectionTime);
    };

  const filteredTasks = useMemo(() => {
    if (viewMode === "daily") {
      return allTasks.filter(task => task.date && isSameDay(new Date(task.date), selectedDate));
    }
    if (viewMode === "monthly") {
      return allTasks.filter(task => task.date && isSameMonth(new Date(task.date), selectedDate));
    }
    return allTasks;
  }, [allTasks, viewMode, selectedDate]);


  const userStats = useMemo(() => {
    const tasksToAnalyze = filteredTasks;
    const totalTasks = tasksToAnalyze.length;
    const completedTasks = tasksToAnalyze.filter(t => t.status === 'Completed').length;
    const totalUnitsProduced = tasksToAnalyze.reduce((acc, task) => acc + (task.quantityProduced || 0), 0);
    
    const attainments = tasksToAnalyze.map(task => {
        const objective = getTaskObjective(task);
        const actual = task.quantityProduced || 0;
        if (objective === 0) return actual > 0 ? 100 : 0;
        return (actual / objective) * 100;
    }).filter(attainment => attainment > 0);

    const averageAttainment = attainments.length > 0 ? attainments.reduce((a, b) => a + b, 0) / attainments.length : 0;

    return { totalTasks, completedTasks, totalUnitsProduced, averageAttainment };
  }, [filteredTasks, lagams, getTaskObjective]);

  const chartData = useMemo(() => {
    const groupedByDate: Record<string, { totalAttainment: number; count: number; tasks: { productName: string; sectionName: string; attainment: number }[] }> = {};

    filteredTasks.forEach(task => {
      const date = task.date ? format(parseISO(task.date), 'MMM d') : 'N/A';
      if (date === 'N/A') return;

      const objective = getTaskObjective(task);
      const actual = task.quantityProduced || 0;
      const attainment = objective > 0 ? (actual / objective) * 100 : (actual > 0 ? 100 : 0);

      if (!groupedByDate[date]) {
        groupedByDate[date] = { totalAttainment: 0, count: 0, tasks: [] };
      }
      
      groupedByDate[date].totalAttainment += attainment;
      groupedByDate[date].count += 1;
      groupedByDate[date].tasks.push({
        productName: getProductName(task.lagamId),
        sectionName: task.sectionName,
        attainment,
      });
    });

    return Object.keys(groupedByDate).map(date => {
      const data = groupedByDate[date];
      const avgAttainment = data.totalAttainment / data.count;
      return {
        date,
        attainment: avgAttainment,
        tasks: data.tasks,
        fill: getEfficiencyColor(avgAttainment),
      };
    }).sort((a,b) => (new Date(a.date) > new Date(b.date)) ? 1 : -1);
  }, [filteredTasks, getTaskObjective, lagams, getProductName]);


  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const getFilterTitle = () => {
    switch (viewMode) {
      case 'daily':
        return `for ${format(selectedDate, 'PPP')}`;
      case 'monthly':
        return `for ${format(selectedDate, 'MMMM yyyy')}`;
      default:
        return 'for all time';
    }
  };

  if (loading) {
    return <div className="p-8">Loading user profile...</div>;
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p>User not found.</p>
        <Button asChild variant="link">
          <Link href="/users">Return to User Management</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-4 mb-2">
          <Link href="/production">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Production Tracking
          </Link>
        </Button>
        <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <UserRoleIcon role={user.role} className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
                <PageHeader
                title={user.name}
                description={`Role: ${user.role} | Employee ID: ${user.employeeId || 'N/A'}`}
                />
            </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks ({getFilterTitle()})</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.completedTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Produced</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalUnitsProduced}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Attainment</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.averageAttainment.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
         <Card>
          <CardHeader>
              <CardTitle>Performance History {getFilterTitle()}</CardTitle>
          </CardHeader>
          <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                          dataKey="date"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
                      />
                      <YAxis
                        tickFormatter={(value) => `${value}%`}
                      />
                      <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent 
                            formatter={(_, name, props) => {
                              const { payload } = props;
                              return (
                                <div className="flex flex-col gap-2">
                                  <div className="font-semibold">
                                    Avg. Attainment: {payload.attainment.toFixed(0)}%
                                  </div>
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    {payload.tasks.map((task: any, index: number) => (
                                      <div key={index}>
                                        {task.productName} - {task.sectionName}: {task.attainment.toFixed(0)}%
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            }}
                          />}
                      />
                      <Bar dataKey="attainment" radius={4} />
                  </BarChart>
              </ChartContainer>
          </CardContent>
      </Card>
      )}
      
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Task History</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
            </Select>
            {viewMode !== 'all' && (
              <DatePicker 
                  date={selectedDate} 
                  setDate={handleDateChange}
                  viewMode={viewMode === 'monthly' ? 'monthly' : 'daily'}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Qty Produced</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time Taken</TableHead>
                <TableHead className="text-right">Attainment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => {
                   const objective = getTaskObjective(task);
                   const actual = task.quantityProduced || 0;
                   const attainment = objective > 0 ? (actual / objective) * 100 : (actual > 0 ? 100 : 0);
                  
                   return (
                    <TableRow key={task.id}>
                        <TableCell>{task.date ? new Date(task.date + 'T00:00:00').toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{getProductName(task.lagamId)}</TableCell>
                        <TableCell>{task.sectionName}</TableCell>
                        <TableCell>{task.quantityProduced || 0}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            (statusColors as any)[task.status] || "bg-gray-200"
                          )}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                        {task.actualTime !== null ? `${task.actualTime} min` : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={cn(
                              attainment >= 95 ? "bg-green-100 text-green-800" :
                              attainment >= 80 ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                          )}>
                              {attainment.toFixed(0)}%
                          </Badge>
                        </TableCell>
                    </TableRow>
                   )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    No tasks found for this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
