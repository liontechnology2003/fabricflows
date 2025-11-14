
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import PageHeader from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { Lagam, ProductionTask, SizeQuantity, User } from "@/lib/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DatePicker } from "@/components/date-picker";
import { format, startOfMonth } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, RefreshCw, Users, Download, Info } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


type OperatorPerformance = {
  id: string;
  name: string;
  unitsProduced: number;
  stdTimeEarned: number;
  actualTime: number;
  performance: number;
  ole: number;
  avatarUrl?: string;
};

type TeamPerformance = {
  id:string;
  name: string;
  unitsProduced: number;
  stdTimeEarned: number;
  actualTime: number;
  performance: number;
  ole: number;
  memberIds: string[];
}

type AnalysisData = {
  operators: OperatorPerformance[];
  teams: TeamPerformance[];
}

type SortOrder = "asc" | "desc";
type ViewMode = "daily" | "monthly";

const timeSlots = [
  "7:30 to 9:30",
  "9:30 to 11:30",
  "11:30 to 1:30",
  "2:00 to 4:00",
  "4:00 to 5:00",
  "Overtime 1",
  "Overtime 2",
];

const regularTimeSlots = [
  "7:30 to 9:30",
  "9:30 to 11:30",
  "11:30 to 1:30",
  "2:00 to 4:00",
  "4:00 to 5:00",
];

export default function ProductionTrackingPage() {
  const [lagams, setLagams] = useState<Lagam[]>([]);
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const isMobile = useIsMobile();

  // State for the operator details modal
  const [selectedOperator, setSelectedOperator] = useState<OperatorPerformance | null>(null);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);

  // Sorting state
  const [teamSortOrder, setTeamSortOrder] = useState<SortOrder>('desc');


  const fetchLagamsAndTasks = useCallback(async () => {
    try {
      const [lagamsRes, tasksRes] = await Promise.all([
        fetch("/api/lagam"),
        fetch("/api/production-tasks"),
      ]);
      if (!lagamsRes.ok || !tasksRes.ok) {
        throw new Error("Failed to fetch Lagam or Task data");
      }
      const lagamsData = await lagamsRes.json();
      const tasksData = await tasksRes.json();
      setLagams(lagamsData);
      setTasks(tasksData);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch initial Lagam and Task data.",
      });
    }
  }, [toast]);

  const fetchAnalysisData = useCallback(async (date: Date) => {
    setAnalysisLoading(true);
    try {
      let dateString;
      if (viewMode === 'monthly') {
          dateString = format(date, 'yyyy-MM');
      } else {
          dateString = format(date, 'yyyy-MM-dd');
      }
      
      const analysisRes = await fetch(`/api/production-analysis?date=${dateString}`);
      if (!analysisRes.ok) {
        throw new Error("Failed to fetch analysis or user data");
      }
      const analysisData = await analysisRes.json();
      setAnalysisData(analysisData);

    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch analysis data.",
      });
    } finally {
      setAnalysisLoading(false);
    }
  }, [toast, viewMode]);
  
  const fetchUsers = useCallback(async () => {
     try {
        const usersRes = await fetch("/api/users");
        if (!usersRes.ok) throw new Error("Failed to fetch users");
        const usersData = await usersRes.json();
        setUsers(usersData);
     } catch(error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch user data.",
        });
     }
  }, [toast]);
  
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchLagamsAndTasks(),
      fetchAnalysisData(selectedDate),
      fetchUsers()
    ]);
    setLoading(false);
    toast({ title: "Data refreshed successfully." });
  }, [selectedDate, fetchLagamsAndTasks, fetchAnalysisData, fetchUsers, toast]);

  useEffect(() => {
    handleRefresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, viewMode]);


  const getTaskObjective = (task: ProductionTask) => {
    const lagam = lagams.find(l => l.lagamId === task.lagamId);
    if (!lagam) return 0;
    const section = lagam.productionBlueprint.find(s => s.sectionName === task.sectionName);
    if (!section) return 0;

    const sectionTime = section.plannedOperations.reduce((acc, op) => acc + op.tiempo, 0);
    if (sectionTime === 0) return 0;

    let slotDurationMinutes = 120; // Default 2 hours
    if (task.timeSlot === "4:00 to 5:00" || task.timeSlot === "Overtime 1" || task.timeSlot === "Overtime 2") {
        slotDurationMinutes = 60;
    }
    
    return Math.floor(slotDurationMinutes / sectionTime);
  };
  
  const getOperatorTasksForDay = (operatorId: string, date: Date) => {
    const formattedDate = date.toISOString().split("T")[0];
    return tasks.filter(
      (task) => task.teamMemberId === operatorId && task.date === formattedDate
    );
  };

  const dailyOperatorSummary = useMemo(() => (operator: OperatorPerformance | null) => {
    if (!operator || viewMode === 'monthly') return null;

    const operatorTasks = getOperatorTasksForDay(operator.id, selectedDate);
    
    const slotAttainments = regularTimeSlots.map(slot => {
        const task = operatorTasks.find(t => t.timeSlot === slot);
        if (!task) return null; 
        const objective = getTaskObjective(task);
        const actual = task.quantityProduced || 0;
        if (objective === 0) return actual > 0 ? 100 : 0; // If objective is 0, any production is 100%
        return (actual / objective) * 100;
    }).filter(attainment => attainment !== null) as number[];

    const averageAttainment = slotAttainments.length > 0
        ? slotAttainments.reduce((acc, curr) => acc + curr, 0) / slotAttainments.length
        : 0;

    const totalObjective = operatorTasks.reduce((acc, task) => acc + getTaskObjective(task), 0);
    const totalActual = operator.unitsProduced;
    
    return { totalObjective, totalActual, dailyAttainment: averageAttainment };
  }, [selectedDate, tasks, lagams, viewMode]);

  const teamsWithAvgAttainment = useMemo(() => {
    if (!analysisData?.teams || !analysisData.operators) return [];

    return analysisData.teams.map(team => {
      const membersWithData = (team.memberIds || []).map(memberId => {
        const operatorData = analysisData.operators.find(op => op.id === memberId);
        if (!operatorData) return null;
        if(viewMode === 'monthly') {
          return operatorData.performance;
        }
        const summary = dailyOperatorSummary(operatorData);
        return summary ? summary.dailyAttainment : null;
      }).filter(attainment => attainment !== null && attainment > 0) as number[];

      const avgAttainment = membersWithData.length > 0
        ? membersWithData.reduce((acc, curr) => acc + curr, 0) / membersWithData.length
        : 0;

      return { ...team, avgDayAttainment: avgAttainment };
    });
  }, [analysisData, dailyOperatorSummary, viewMode]);

  const toggleTeamSortOrder = () => {
    setTeamSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const sortedTeams = useMemo(() => {
    if (!teamsWithAvgAttainment) return [];
    return [...teamsWithAvgAttainment].sort((a, b) => {
      const sortMetric = viewMode === 'monthly' ? 'performance' : 'avgDayAttainment';
      if (teamSortOrder === 'asc') {
        return a[sortMetric] - b[sortMetric];
      }
      return b[sortMetric] - a[sortMetric];
    });
  }, [teamsWithAvgAttainment, teamSortOrder, viewMode]);

  const getSortedOperators = (team: TeamPerformance) => {
    if (!analysisData?.operators) return [];
    
    const teamMembersPerformance = analysisData.operators
      .filter(op => (team.memberIds || []).includes(op.id));
      
    return teamMembersPerformance.sort((a, b) => {
       if (viewMode === 'monthly') {
         return b.performance - a.performance;
       }
       const summaryA = dailyOperatorSummary(a);
       const summaryB = dailyOperatorSummary(b);
       const attainmentA = summaryA?.dailyAttainment || 0;
       const attainmentB = summaryB?.dailyAttainment || 0;
      
       return attainmentB - attainmentA;
    });
  };


  const getProducedQuantitiesForTask = (task: ProductionTask): SizeQuantity[] => {
    if (task.status === 'Completed') {
      return task.sizeQuantities || [];
    }
    return task.sizeQuantitiesProduced || [];
  };

  const getSectionProgress = (lagam: Lagam, sectionName: string) => {
      const relevantTasks = tasks.filter(task => task.lagamId === lagam.lagamId && task.sectionName === sectionName);
      
      const producedBySize = lagam.productInfo.sizes.map(sizeInfo => {
          const produced = relevantTasks.reduce((acc, task) => {
              const taskSizes = getProducedQuantitiesForTask(task);
              const sizeQty = taskSizes.find(s => s.size === sizeInfo.size);
              return acc + (sizeQty?.quantity || 0);
          }, 0);
          return { size: sizeInfo.size, quantity: produced };
      });
      
      const totalProduced = producedBySize.reduce((acc, curr) => acc + curr.quantity, 0);
      const totalPlanned = lagam.productInfo.totalQuantity;
      const progress = totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0;

      return { planned: totalPlanned, produced: totalProduced, progress, producedBySize };
  };

  const getLagamProgress = (lagam: Lagam) => {
    if (!lagam.productionBlueprint || lagam.productionBlueprint.length === 0) {
      return { totalProduced: 0, overallProgress: 0, remaining: lagam.productInfo.totalQuantity };
    }
    
    const lastSection = lagam.productionBlueprint[lagam.productionBlueprint.length - 1];
    const { produced: totalProduced } = getSectionProgress(lagam, lastSection.sectionName);
    
    const totalPlanned = lagam.productInfo.totalQuantity;
    const overallProgress = totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0;
    const remaining = totalPlanned - totalProduced;

    return { totalProduced, overallProgress, remaining };
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (efficiency >= 80) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };
  
  const getUserAvatar = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.avatarUrl;
  }
  
  const openOperatorDetails = (operator: OperatorPerformance) => {
    if (viewMode === 'monthly') return;
    setSelectedOperator(operator);
    setIsOperatorModalOpen(true);
  };

  const getProductName = (lagamId: string | null) => {
    if (!lagamId) return "N/A";
    return lagams.find(l => l.lagamId === lagamId)?.productInfo.productName || "N/A";
  }

  const overallTeamProductivity = useMemo(() => {
    if (!analysisData?.teams || analysisData.teams.length === 0) {
        return 0;
    }

    const teamsWithMembers = analysisData.teams.filter(team => (team.memberIds || []).length > 0 && team.ole > 0);

    if (teamsWithMembers.length === 0) return 0;
    
    const totalOle = teamsWithMembers.reduce((acc, team) => acc + team.ole, 0);
    
    return totalOle / teamsWithMembers.length;
  }, [analysisData]);

  const handleDateChange = (date: Date | undefined) => {
      if(date) {
        if (viewMode === 'monthly') {
           setSelectedDate(startOfMonth(date));
        } else {
           setSelectedDate(date);
        }
      }
  }


  if (loading) {
    return (
       <div className="flex flex-col gap-8">
          <PageHeader
            title="Production Tracking"
            description="Monitor the real-time progress and performance across all production plans."
          />
          <p>Loading production data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <PageHeader
          title="Production Tracking"
          description="Monitor the real-time progress and performance across all production plans."
        />
        <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <DatePicker 
                date={selectedDate} 
                setDate={handleDateChange}
                viewMode={viewMode}
            />
            <Button onClick={handleRefresh} variant="outline" size="icon" disabled={loading || analysisLoading}>
                <RefreshCw className={cn("h-4 w-4", (loading || analysisLoading) && "animate-spin")} />
            </Button>
        </div>
      </div>
      <Tabs defaultValue="lagams">
        <TabsList>
            <TabsTrigger value="lagams">Lagams</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>
        <TabsContent value="lagams" className="mt-4">
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {lagams.map((lagam) => {
              const { totalProduced, overallProgress, remaining } = getLagamProgress(lagam);
              const totalPlanned = lagam.productInfo.totalQuantity;

              return (
                <Card key={lagam.lagamId}>
                  <CardHeader>
                    <CardTitle>{lagam.productInfo.productName}</CardTitle>
                    <CardDescription>
                      Lagam ID: {lagam.lagamId}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2 text-sm">
                        <span className="font-medium">Overall Progress</span>
                        <span className="text-muted-foreground">
                          {Math.round(totalProduced)} / {totalPlanned} units
                        </span>
                      </div>
                      <Progress value={overallProgress} />
                       <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Planned</p>
                                <p className="font-bold text-lg">{totalPlanned}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Produced</p>
                                <p className="font-bold text-lg text-primary">{Math.round(totalProduced)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Remaining</p>
                                <p className="font-bold text-lg">{remaining > 0 ? Math.round(remaining) : 0}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-medium mb-2">Sections Breakdown</h4>
                         <Accordion type="single" collapsible className="w-full border rounded-lg">
                            {lagam.productionBlueprint.map(section => {
                                const { progress, producedBySize } = getSectionProgress(lagam, section.sectionName);
                                const totalForSection = lagam.productInfo.totalQuantity;
                                const totalProducedForSection = producedBySize.reduce((acc, s) => acc + s.quantity, 0);

                                return (
                                    <AccordionItem value={section.sectionName} key={section.sectionName}>
                                        <AccordionTrigger className="px-4 py-2 hover:no-underline">
                                            <div className="flex items-center justify-between w-full">
                                                <span className="font-medium">{section.sectionName}</span>
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-xs text-muted-foreground w-24 text-right">{totalProducedForSection} / {totalForSection}</span>
                                                    <Progress value={progress} className="w-24 h-2" />
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="px-4 pb-2">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Size</TableHead>
                                                            <TableHead className="text-right">Produced</TableHead>
                                                            <TableHead className="text-right">Planned</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                    {lagam.productInfo.sizes.map(sizeInfo => {
                                                        const produced = producedBySize.find(p => p.size === sizeInfo.size)?.quantity || 0;
                                                        return (
                                                            <TableRow key={sizeInfo.size}>
                                                                <TableCell>{sizeInfo.size || 'N/A'}</TableCell>
                                                                <TableCell className="text-right">{produced}</TableCell>
                                                                <TableCell className="text-right">{sizeInfo.quantity}</TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                             {lagam.productionBlueprint.length === 0 && (
                                <div className="text-center text-muted-foreground p-4">No sections in blueprint.</div>
                            )}
                        </Accordion>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {lagams.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                    <p>No active Lagams found.</p>
                </div>
            )}
            </div>
        </TabsContent>
        <TabsContent value="teams" className="mt-4 space-y-4">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">Overall Labor Effectiveness (OLE)</CardTitle>
                     <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-bold">OLE % = Performance %</p>
                           <br />
                          <p>OLE is a composite KPI measuring true team effectiveness.</p>
                           <p><span className="font-semibold">Performance:</span> How fast the team worked vs. standard.</p>
                           <br />
                           <p className="text-xs text-muted-foreground">Currently, Availability and Quality are assumed to be 100%, so OLE equals the Performance score.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{overallTeamProductivity.toFixed(2)}%</div>
                    <p className="text-xs text-muted-foreground">
                        Average OLE across all teams for {format(selectedDate, viewMode === 'daily' ? 'PPP' : 'LLLL yyyy')}.
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <CardTitle>Team Performance Breakdown</CardTitle>
                      <CardDescription>OLE analysis for each team on {format(selectedDate, viewMode === 'daily' ? 'PPP' : 'LLLL yyyy')}.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                    {analysisLoading ? (
                      <p>Loading analysis...</p>
                    ) : isMobile ? (
                      // Mobile View: Accordion of Cards
                      <Accordion type="single" collapsible className="w-full">
                        {sortedTeams && sortedTeams.length > 0 ? (
                          sortedTeams.map((team) => {
                            const teamMembersPerformance = getSortedOperators(team);
                            const displayMetric = team.ole;
                            return (
                              <AccordionItem value={team.id} key={team.id}>
                                <AccordionTrigger className="hover:no-underline">
                                  <div className="flex justify-between items-center w-full">
                                    <div className="text-left">
                                      <p className="font-medium">{team.name}</p>
                                      <p className="text-xs text-muted-foreground">{team.unitsProduced} units</p>
                                    </div>
                                    <Badge className={cn("ml-auto", getEfficiencyColor(displayMetric))}>
                                      {displayMetric.toFixed(2)}%
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-4 pt-2">
                                    {teamMembersPerformance.length > 0 ? teamMembersPerformance.map(op => {
                                      const opDisplayMetric = op.ole;
                                      return (
                                        <Card key={op.id}>
                                          <CardHeader className="p-4">
                                            <Link href={`/users/${op.id}`} className="flex items-center gap-3">
                                              <Avatar className="h-8 w-8">
                                                <AvatarImage src={getUserAvatar(op.id)} alt={op.name} />
                                                <AvatarFallback>{op.name.charAt(0)}</AvatarFallback>
                                              </Avatar>
                                              <div>
                                                <p className="font-semibold">{op.name}</p>
                                                <p className="text-xs text-muted-foreground">{op.unitsProduced} units</p>
                                              </div>
                                              <div className="ml-auto text-right">
                                                 <p className="text-xs text-muted-foreground">OLE</p>
                                                 <Badge className={cn(getEfficiencyColor(opDisplayMetric))}>
                                                  {opDisplayMetric.toFixed(0)}%
                                                 </Badge>
                                              </div>
                                            </Link>
                                          </CardHeader>
                                        </Card>
                                      )
                                    }) : (
                                      <p className="text-center text-muted-foreground p-4">No member data.</p>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            )
                          })
                        ) : (
                          <div className="text-center text-muted-foreground p-4">No team performance data available for this period.</div>
                        )}
                      </Accordion>
                    ) : (
                      // Desktop View: Accordion of Tables
                      <Accordion type="single" collapsible className="w-full">
                          {sortedTeams && sortedTeams.length > 0 ? (
                              sortedTeams.map((team) => {
                                  const teamMembersPerformance = getSortedOperators(team);
                                  return (
                                  <AccordionItem value={team.id} key={team.id}>
                                      <AccordionTrigger className="hover:no-underline">
                                          <Table className="w-full">
                                            <TableHeader>
                                                <TableRow className="border-none hover:bg-transparent">
                                                    <TableHead className="font-medium w-3/5">Team</TableHead>
                                                    <TableHead className="w-1/5">Performance</TableHead>
                                                    <TableHead className="text-right w-1/5">
                                                      <Button variant="ghost" onClick={(e) => { e.stopPropagation(); toggleTeamSortOrder(); }} size="sm">
                                                          OLE
                                                          <ArrowUpDown className="ml-2 h-4 w-4" />
                                                      </Button>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                              <TableBody>
                                                  <TableRow className="border-none hover:bg-transparent">
                                                      <TableCell className="font-medium">{team.name}</TableCell>
                                                      <TableCell>{team.performance.toFixed(0)}%</TableCell>
                                                      <TableCell className="text-right">
                                                          <Badge className={cn(getEfficiencyColor(team.ole))}>
                                                              {team.ole.toFixed(2)}%
                                                          </Badge>
                                                      </TableCell>
                                                  </TableRow>
                                              </TableBody>
                                          </Table>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                          <div className="px-4 pb-2 border-t pt-2">
                                              <h4 className="text-sm font-semibold mb-2">Team Members</h4>
                                              <Table>
                                                  <TableHeader>
                                                      <TableRow>
                                                          <TableHead>Operator</TableHead>
                                                          <TableHead>Units</TableHead>
                                                          <TableHead>Performance</TableHead>
                                                          <TableHead className="text-right">OLE</TableHead>
                                                      </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                      {teamMembersPerformance.length > 0 ? teamMembersPerformance.map(op => {
                                                        const summary = dailyOperatorSummary(op);
                                                        return (
                                                          <TableRow key={op.id} onClick={() => openOperatorDetails(op)} className={cn("cursor-pointer")}>
                                                            <TableCell className="font-medium">
                                                              <Link href={`/users/${op.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarImage src={getUserAvatar(op.id)} alt={op.name} />
                                                                    <AvatarFallback>{op.name.charAt(0)}</AvatarFallback>
                                                                </Avatar>
                                                                {op.name}
                                                              </Link>
                                                            </TableCell>
                                                              <TableCell>{op.unitsProduced}</TableCell>
                                                              <TableCell>
                                                                <Badge className={cn(getEfficiencyColor(op.performance))}>
                                                                    {op.performance.toFixed(0)}%
                                                                </Badge>
                                                              </TableCell>
                                                              <TableCell className="text-right">
                                                                  <Badge className={cn(getEfficiencyColor(op.ole))}>
                                                                      {op.ole.toFixed(0)}%
                                                                  </Badge>
                                                              </TableCell>
                                                          </TableRow>
                                                        )
                                                      }) : (
                                                          <TableRow>
                                                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                                  No performance data for members of this team.
                                                              </TableCell>
                                                          </TableRow>
                                                      )}
                                                  </TableBody>
                                              </Table>
                                          </div>
                                      </AccordionContent>
                                  </AccordionItem>
                              )})
                          ) : (
                              <div className="text-center text-muted-foreground p-4">No team performance data available for this period.</div>
                          )}
                      </Accordion>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
      {/* Operator Details Modal */}
      {selectedOperator && viewMode === 'daily' && (
        <Dialog open={isOperatorModalOpen} onOpenChange={setIsOperatorModalOpen}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Daily Analytics: {selectedOperator.name}</DialogTitle>
                    <DialogDescription>
                        Productivity breakdown for {format(selectedDate, 'PPP')}.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-4">
                    {dailyOperatorSummary(selectedOperator) && (
                      <Card className="mb-4">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Daily Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Objective (Assigned)</p>
                              <p className="font-bold text-2xl">{dailyOperatorSummary(selectedOperator)!.totalObjective}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Actual</p>
                              <p className="font-bold text-2xl text-primary">{dailyOperatorSummary(selectedOperator)!.totalActual}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Average Attainment</p>
                               <div className="flex items-center justify-center gap-2">
                                <p className="font-bold text-2xl">{dailyOperatorSummary(selectedOperator)!.dailyAttainment.toFixed(0)}%</p>
                                <Badge className={cn("text-sm", getEfficiencyColor(dailyOperatorSummary(selectedOperator)!.dailyAttainment))}>
                                  {dailyOperatorSummary(selectedOperator)!.dailyAttainment.toFixed(0)}%
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {isMobile ? (
                      // Mobile View for Operator Details
                      <div className="space-y-4">
                        {timeSlots.map(slot => {
                          const task = getOperatorTasksForDay(selectedOperator.id, selectedDate).find(t => t.timeSlot === slot);
                          if (!task) {
                            const isRegularSlot = regularTimeSlots.includes(slot);
                            return (
                              <Card key={slot}>
                                <CardHeader className="p-4 flex flex-row justify-between items-center">
                                  <p className="font-semibold">{slot}</p>
                                  {isRegularSlot && <p className="text-sm text-muted-foreground text-center">No task</p>}
                                </CardHeader>
                              </Card>
                            );
                          }
                          const objective = getTaskObjective(task);
                          const actual = task.quantityProduced || 0;
                          const attainment = objective > 0 ? (actual / objective) * 100 : (actual > 0 ? 100 : 0);
                          return (
                            <Card key={slot}>
                              <CardHeader className="p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold">{slot}</p>
                                    <p className="text-sm">{getProductName(task.lagamId)}</p>
                                    <p className="text-xs text-muted-foreground">{task.sectionName}</p>
                                  </div>
                                  <Badge className={cn(getEfficiencyColor(attainment))}>
                                    {attainment.toFixed(0)}%
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Objective</p>
                                    <p className="font-bold">{objective}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Actual</p>
                                    <p className="font-bold">{actual}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    ) : (
                      // Desktop View for Operator Details
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead className="w-[150px]">Time Slot</TableHead>
                                  <TableHead>Product</TableHead>
                                  <TableHead>Section</TableHead>
                                  <TableHead>Objective</TableHead>
                                  <TableHead>Actual</TableHead>
                                  <TableHead className="text-right">Attainment</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {timeSlots.map(slot => {
                                  const task = getOperatorTasksForDay(selectedOperator.id, selectedDate).find(t => t.timeSlot === slot);
                                  if (!task) {
                                      const isRegularSlot = regularTimeSlots.includes(slot);
                                      if (!isRegularSlot) return null;
                                      return (
                                          <TableRow key={slot}>
                                              <TableCell className="font-medium">{slot}</TableCell>
                                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                No task assigned
                                              </TableCell>
                                          </TableRow>
                                      );
                                  }
                                  const objective = getTaskObjective(task);
                                  const actual = task.quantityProduced || 0;
                                  const attainment = objective > 0 ? (actual / objective) * 100 : (actual > 0 ? 100 : 0);
                                  return (
                                      <TableRow key={slot}>
                                          <TableCell className="font-medium">{slot}</TableCell>
                                          <TableCell>{getProductName(task.lagamId)}</TableCell>
                                          <TableCell>{task.sectionName}</TableCell>
                                          <TableCell>{objective}</TableCell>
                                          <TableCell>{actual}</TableCell>
                                          <TableCell className="text-right">
                                              <Badge className={cn(getEfficiencyColor(attainment))}>
                                                  {attainment.toFixed(0)}%
                                              </Badge>
                                          </TableCell>
                                      </TableRow>
                                  )
                              })}
                          </TableBody>
                      </Table>
                    )}
                </div>
                 <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setIsOperatorModalOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

    