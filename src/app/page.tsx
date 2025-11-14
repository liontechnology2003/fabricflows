
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle,
  HardHat,
  Package,
  ListChecks,
  Timer,
  FileText
} from "lucide-react";
import PageHeader from "@/components/page-header";
import type { ProductionTask, Lagam, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ControlTowerData {
  kpis: {
    activeLagams: number;
    tasksInProgress: number;
    tasksCompletedToday: number;
  };
  recentActivities: ProductionTask[];
}

const statusColors: Record<ProductionTask['status'], string> = {
  Pending: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  "In Progress": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};


export default function Dashboard() {
  const [controlData, setControlData] = useState<ControlTowerData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [lagams, setLagams] = useState<Lagam[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [controlRes, usersRes, lagamsRes] = await Promise.all([
          fetch('/api/control-tasks'),
          fetch('/api/users'),
          fetch('/api/lagam')
        ]);

        if (!controlRes.ok || !usersRes.ok || !lagamsRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const controlData = await controlRes.json();
        const usersData = await usersRes.json();
        const lagamsData = await lagamsRes.json();
        
        setControlData(controlData);
        setUsers(usersData);
        setLagams(lagamsData);

      } catch (error) {
        toast({
          title: "Error fetching data",
          description: (error as Error).message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 30000); // Poll every 30 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [toast]);

  const getUserName = (id: string | null) => users.find(u => u.id === id)?.name || "Unassigned";
  const getProductName = (id: string | null) => lagams.find(l => l.lagamId === id)?.productInfo.productName || "Unknown Product";

  if (loading && !controlData) {
    return (
       <div className="flex flex-col gap-8">
        <PageHeader title="Control Tower" />
        <p>Loading real-time data...</p>
      </div>
    )
  }
  
  if (!controlData) {
     return (
       <div className="flex flex-col gap-8">
        <PageHeader title="Control Tower" />
        <p>Could not load control tower data.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Control Tower" description="Real-time overview of the production floor." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Lagams
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{controlData.kpis.activeLagams}</div>
            <p className="text-xs text-muted-foreground">
              Production plans currently in progress.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasks in Progress
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{controlData.kpis.tasksInProgress}</div>
            <p className="text-xs text-muted-foreground">
              Number of tasks being actively worked on.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{controlData.kpis.tasksCompletedToday}</div>
            <p className="text-xs text-muted-foreground">
             Total tasks finished since midnight.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Production Activities</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Time Slot</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Time Taken</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controlData.recentActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">
                      {getProductName(activity.lagamId)}
                    </TableCell>
                    <TableCell>{activity.sectionName}</TableCell>
                    <TableCell>{getUserName(activity.teamMemberId)}</TableCell>
                    <TableCell>{activity.timeSlot}</TableCell>
                    <TableCell>{activity.quantityProduced ?? 0} / {activity.quantity}</TableCell>
                    <TableCell>
                      <Badge className={cn(statusColors[activity.status])}>
                        {activity.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       {activity.actualTime ? `${activity.actualTime} min` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 md:hidden">
            {controlData.recentActivities.map((activity) => (
              <Card key={activity.id} className="p-4">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-lg">{getProductName(activity.lagamId)}</span>
                   <Badge className={cn("text-xs", statusColors[activity.status])}>
                    {activity.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{activity.sectionName}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <HardHat className="h-4 w-4 text-muted-foreground" />
                    <span>{getUserName(activity.teamMemberId)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    <span>{activity.quantityProduced ?? 0} / {activity.quantity} units</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span>{activity.timeSlot} ({activity.actualTime ? `${activity.actualTime} min` : 'N/A'})</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
           {controlData.recentActivities.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No recent activities found.</p>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
