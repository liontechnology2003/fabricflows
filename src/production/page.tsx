
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
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";


type OperatorPerformance = {
  id: string;
  name: string;
  unitsProduced: number;
  stdTimeEarned: number;
  actualTime: number;
  efficiency: number;
};

type TeamPerformance = {
  id:string;
  name: string;
  unitsProduced: number;
  stdTimeEarned: number;
  actualTime: number;
  efficiency: number;
  members: string[];
}

type AnalysisData = {
  operators: OperatorPerformance[];
  teams: TeamPerformance[];
}

type SortOrder = "asc" | "desc";

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
  const isMobile = useIsMobile();

  // State for the operator details modal
  const [selectedOperator, setSelectedOperator] = useState<OperatorPerformance | null>(null);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);

  // Sorting state
  const [teamSortOrder, setTeamSortOrder] = useState<SortOrder>('desc');
  const [operatorSortOrders, setOperatorSortOrders] = useState<Record<string, SortOrder>>({});


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
      const dateString = format(date, 'yyyy-MM-dd');
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
  }, [toast]);
  
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

  useEffect(() => {
    const fetchAllData = async (date: Date) => {
      setLoading(true);
      await Promise.all([
        fetchLagamsAndTasks(),
        fetchAnalysisData(date),
        fetchUsers()
      ]);
      setLoading(false);
    }

    fetchAllData(selectedDate);

    const interval = setInterval(() => {
      fetchAllData(selectedDate);
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval); // Cleanup on unmount
    
  }, [selectedDate, fetchLagamsAndTasks, fetchAnalysisData, fetchUsers]);

  const toggleTeamSortOrder = () => {
    setTeamSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const getSortedOperators = (team: TeamPerformance) => {
    if (!analysisData?.operators) return [];
    const sortOrder = operatorSortOrders[team.id] || 'desc';
    const teamMembersPerformance = analysisData.operators
      .filter(op => team.members.includes(op.id));
      
    return teamMembersPerformance.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.efficiency - b.efficiency;
      }
      return b.efficiency - a.efficiency;
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
  
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  
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
  
  const openOperatorDetails = (operator: OperatorPerformance) => {
    setSelectedOperator(operator);
    setIsOperatorModalOpen(true);
  };

  const getOperatorTasksForDay = (operatorId: string, date: Date) => {
    const formattedDate = date.toISOString().split("T")[0];
    return tasks.filter(
      (task) => task.teamMemberId === operatorId && task.date === formattedDate
    );
  };

  const getProductName = (lagamId: string | null) => {
    if (!lagamId) return "N/A";
    return lagams.find(l => l.lagamId === lagamId)?.productInfo.productName || "N/A";
  }

 const dailyOperatorSummary = useMemo(() => (operator: OperatorPerformance | null) => {
    if (!operator) return null;

    const operatorTasks = getOperatorTasksForDay(operator.id, selectedDate);
    const totalObjective = operatorTasks.reduce((acc, task) => acc + getTaskObjective(task), 0);
    const totalActual = operator.unitsProduced;
    
    const dailyAttainment = totalObjective > 0 ? (totalActual / totalObjective) * 100 : 0;

    return { totalObjective, totalActual, dailyAttainment };
  }, [selectedDate, tasks, lagams]);


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
      <PageHeader
        title="Production Tracking"
        description="Monitor the real-time progress and performance across all production plans."
      />
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
        <TabsContent value="teams" className="mt-4">
            <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <CardTitle>Team Performance</CardTitle>
                      <CardDescription>Productivity analysis for each team and its members on {format(selectedDate, 'PPP')}.</CardDescription>
                    </div>
                    <DatePicker date={selectedDate} setDate={(d) => d && setSelectedDate(d)} />
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
                            return (
                              <AccordionItem value={team.id} key={team.id}>
                                <AccordionTrigger className="hover:no-underline">
                                  <div className="flex justify-between items-center w-full">
                                    <div className="text-left">
                                      <p className="font-medium">{team.name}</p>
                                      <p className="text-xs text-muted-foreground">{team.unitsProduced} units</p>
                                    </div>
                                    <Badge className={cn("ml-auto", getEfficiencyColor(team.efficiency))}>
                                      {team.efficiency.toFixed(2)}%
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-4 pt-2">
                                    {teamMembersPerformance.length > 0 ? teamMembersPerformance.map(op => {
                                      return (
                                        <Card key={op.id} onClick={() => openOperatorDetails(op)} className="cursor-pointer">
                                          <CardHeader className="p-4">
                                            <div className="flex items-center gap-3">
                                              <Avatar className="h-8 w-8">
                                                <AvatarImage src={op.avatarUrl} alt={op.name} />
                                                <AvatarFallback>{getInitials(op.name)}</AvatarFallback>
                                              </Avatar>
                                              <div>
                                                <p className="font-semibold">{op.name}</p>
                                                <p className="text-xs text-muted-foreground">{op.unitsProduced} units</p>
                                              </div>
                                              <div className="ml-auto text-right">
                                                 <p className="text-xs text-muted-foreground">Efficiency</p>
                                                 <Badge className={cn(getEfficiencyColor(op.efficiency))}>
                                                  {op.efficiency.toFixed(2)}%
                                                 </Badge>
                                              </div>
                                            </div>
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
                          <div className="text-center text-muted-foreground p-4">No team performance data available for this day.</div>
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
                                                    <TableHead className="font-medium w-2/5">Team</TableHead>
                                                    <TableHead className="w-1/5">Units Produced</TableHead>
                                                    <TableHead className="w-1/5">Std. Time (min)</TableHead>
                                                    <TableHead className="w-1/5">Actual Time (min)</TableHead>
                                                    <TableHead className="text-right w-1/5">
                                                      <Button variant="ghost" onClick={(e) => { e.stopPropagation(); toggleTeamSortOrder(); }} size="sm">
                                                          Efficiency
                                                          <ArrowUpDown className="ml-2 h-4 w-4" />
                                                      </Button>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                              <TableBody>
                                                  <TableRow className="border-none hover:bg-transparent">
                                                      <TableCell className="font-medium">{team.name}</TableCell>
                                                      <TableCell>{team.unitsProduced} units</TableCell>
                                                      <TableCell>{team.stdTimeEarned.toFixed(2)} min</TableCell>
                                                      <TableCell>{team.actualTime.toFixed(2)} min</TableCell>
                                                      <TableCell className="text-right">
                                                          <Badge className={cn(getEfficiencyColor(team.efficiency))}>
                                                              {team.efficiency.toFixed(2)}%
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
                                                          <TableHead>Day's Attainment</TableHead>
                                                          <TableHead className="text-right">Efficiency</TableHead>
                                                      </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                      {teamMembersPerformance.length > 0 ? teamMembersPerformance.map(op => {
                                                        const summary = dailyOperatorSummary(op);
                                                        return (
                                                          <TableRow key={op.id} onClick={() => openOperatorDetails(op)} className="cursor-pointer">
                                                              <TableCell className="font-medium flex items-center gap-2">
                                                                  <Avatar className="h-6 w-6">
                                                                      <AvatarImage src={op.avatarUrl} alt={op.name} />
                                                                      <AvatarFallback>{getInitials(op.name)}</AvatarFallback>
                                                                  </Avatar>
                                                                  {op.name}
                                                              </TableCell>
                                                              <TableCell>{op.unitsProduced}</TableCell>
                                                              <TableCell>
                                                                  {summary && (
                                                                      <Badge className={cn(getEfficiencyColor(summary.dailyAttainment))}>
                                                                          {summary.dailyAttainment.toFixed(0)}%
                                                                      </Badge>
                                                                  )}
                                                              </TableCell>
                                                              <TableCell className="text-right">
                                                                  <Badge className={cn(getEfficiencyColor(op.efficiency))}>
                                                                      {op.efficiency.toFixed(2)}%
                                                                  </Badge>
                                                              </TableCell>
                                                          </TableRow>
                                                        )
                                                      }) : (
                                                          <TableRow>
                                                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                                  No performance data for members of this team on this day.
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
                              <div className="text-center text-muted-foreground p-4">No team performance data available for this day.</div>
                          )}
                      </Accordion>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
      {/* Operator Details Modal */}
      {selectedOperator && (
        <Dialog open={isOperatorModalOpen} onOpenChange={setIsOperatorModalOpen}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Daily Analytics: {selectedOperator.name}</DialogTitle>
                    <DialogDescription>
                        Productivity breakdown for {format(selectedDate, 'PPP')}.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
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
                              <p className="text-sm text-muted-foreground">Day's Attainment</p>
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
                            return (
                              <Card key={slot}>
                                <CardHeader className="p-4">
                                  <p className="font-semibold">{slot}</p>
                                  <p className="text-sm text-muted-foreground text-center">No task assigned</p>
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
                                      return (
                                          <TableRow key={slot}>
                                              <TableCell className="font-medium">{slot}</TableCell>
                                              <TableCell colSpan={4} className="text-center text-muted-foreground">No task assigned</TableCell>
                                              <TableCell className="text-right">
                                                {isRegularSlot && (
                                                  <Badge className={cn(getEfficiencyColor(0))}>
                                                      0%
                                                  </Badge>
                                                )}
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
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
