
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/date-picker";
import PageHeader from "@/components/page-header";
import type { ProductionTask, User, Team, Lagam, PlannedOperation, SizeQuantity } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Info, UserCheck, Focus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


const timeSlots = [
  "7:30 to 9:30",
  "9:30 to 11:30",
  "11:30 to 1:30",
  "2:00 to 4:00",
  "4:00 to 5:00",
  "Overtime 1",
  "Overtime 2",
];

const statusColors: Record<ProductionTask['status'], string> = {
  Pending: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  "In Progress": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

type SectionStatus = {
  sectionName: string;
  produced: number;
  planned: number;
  isCompleted: boolean;
  producedBySze: SizeQuantity[];
};

export default function ControlTowerPage() {
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [lagams, setLagams] = useState<Lagam[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(null);
  const [currentTaskDetails, setCurrentTaskDetails] = useState<Partial<ProductionTask>>({});

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskInfo, setNewTaskInfo] = useState<{ operatorId: string; timeSlot: string; date: Date } | null>(null);
  const [selectedLagamForNewTask, setSelectedLagamForNewTask] = useState<string>('');
  const [selectedSectionForNewTask, setSelectedSectionForNewTask] = useState<string>('');
  const [newSizeQuantities, setNewSizeQuantities] = useState<SizeQuantity[]>([]);
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<ProductionTask | null>(null);

  const [lagamSectionStatus, setLagamSectionStatus] = useState<SectionStatus[]>([]);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  const fetchData = useCallback(async () => {
      setLoading(true);
      try {
        const [tasksRes, usersRes, teamsRes, lagamsRes] = await Promise.all([
          fetch('/api/production-tasks'),
          fetch('/api/users'),
          fetch('/api/teams'),
          fetch('/api/lagam')
        ]);
        if (!tasksRes.ok || !usersRes.ok || !teamsRes.ok || !lagamsRes.ok) {
          throw new Error('Failed to fetch initial data');
        }
        const tasksData = await tasksRes.json();
        const usersData = await usersRes.json();
        const teamsData = await teamsRes.json();
        const lagamsData = await lagamsRes.json();
        
        setTasks(tasksData);
        setUsers(usersData);
        setTeams(teamsData);
        setLagams(lagamsData);

      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch data for the Control Tower.",
        });
      } finally {
        setLoading(false);
      }
    }, [toast]);
    
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isLagamCompleted = useCallback((lagam: Lagam) => {
    if (!lagamSectionStatus.length || lagamSectionStatus.length < lagam.productionBlueprint.length) return false;
    
    return lagam.productionBlueprint.every(bpSection => {
        const status = lagamSectionStatus.find(s => s.sectionName === bpSection.sectionName);
        return status?.isCompleted ?? false;
    });
  }, [lagamSectionStatus]);

  useEffect(() => {
    if (!selectedLagamForNewTask) {
        setLagamSectionStatus([]);
        return;
    };
    const fetchLagamStatus = async () => {
        setIsStatusLoading(true);
        try {
            const res = await fetch(`/api/lagam-status?lagamId=${selectedLagamForNewTask}`);
            if (!res.ok) throw new Error("Failed to fetch lagam status");
            const data = await res.json();
            setLagamSectionStatus(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
            setLagamSectionStatus([]);
        } finally {
            setIsStatusLoading(false);
        }
    }
    fetchLagamStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLagamForNewTask]);

  const completedLagams = useMemo(() => {
    // This is a simplified check. A full check would need to be async or have all statuses pre-loaded.
    // For now, we filter based on the currently loaded lagamSectionStatus, which may not be fully accurate
    // if not all lagams have been checked. A better approach would be server-side status calculation.
    return lagams.filter(lagam => isLagamCompleted(lagam));
  }, [lagams, isLagamCompleted]);
  
  const getTaskForSlot = (operatorId: string, timeSlot: string, date: Date | undefined) => {
    if (!date) return undefined;
    const formattedDate = date.toISOString().split("T")[0];
    return tasks.find(
      (task) =>
        task.teamMemberId === operatorId &&
        task.date === formattedDate &&
        task.timeSlot === timeSlot
    );
  };
  
  const getProductName = (lagamId: string) => {
    return lagams.find(l => l.lagamId === lagamId)?.productInfo.productName || "Unknown Product";
  }

  const getOperationsForTask = (task: ProductionTask): PlannedOperation[] => {
    const lagam = lagams.find(l => l.lagamId === task.lagamId);
    if (!lagam) return [];
    const section = lagam.productionBlueprint.find(s => s.sectionName === task.sectionName);
    return section ? section.plannedOperations : [];
  };

  const getScheduledQuantityForSection = useCallback((lagamId: string, sectionName: string, excludingTaskId?: string): { total: number, bySize: SizeQuantity[] } => {
    const lagam = lagams.find(l => l.lagamId === lagamId);
    if (!lagam) return { total: 0, bySize: [] };

    const bySize = lagam.productInfo.sizes.map(sizeInfo => {
        const scheduled = tasks
            .filter(t => t.lagamId === lagamId && t.sectionName === sectionName && t.id !== excludingTaskId)
            .reduce((acc, t) => {
                const sizeQuantities = t.sizeQuantities || [];
                const sizeQty = sizeQuantities.find(s => s.size === sizeInfo.size);
                return acc + (sizeQty?.quantity || 0);
            }, 0);
        return { size: sizeInfo.size, quantity: scheduled };
    });

    const total = bySize.reduce((acc, curr) => acc + curr.quantity, 0);
    return { total, bySize };
  }, [tasks, lagams]);
  
  const getProducedForLagam = (lagamId: string) => {
      const lagam = lagams.find(l => l.lagamId === lagamId);
      if (!lagam) return 0;
      const relevantStatuses = lagamSectionStatus.filter(status => lagam.productionBlueprint.some(bp => bp.sectionName === status.sectionName));
      if (relevantStatuses.length === 0) return 0;
      const lastSectionName = lagam.productionBlueprint[lagam.productionBlueprint.length - 1].sectionName;
      const lastSectionStatus = relevantStatuses.find(s => s.sectionName === lastSectionName);
      return lastSectionStatus?.produced || 0;
  };

    
  const operators = users.filter((user) => user.role === "Operator");
  
  const filteredOperators =
    selectedTeam === "all"
      ? operators
      : operators.filter((op) =>
          teams.find((team) => team.id === selectedTeam)?.memberIds.includes(op.id)
        );

  const openTaskModal = (task: ProductionTask) => {
    setSelectedTask(task);
    const operations = getOperationsForTask(task);
    const initialOperationStatus = task.operationStatus || Array(operations.length).fill(false);
    setCurrentTaskDetails({ 
      ...task, 
      operationStatus: [...initialOperationStatus] 
    });
    setIsTaskModalOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !currentTaskDetails) return;
    
    const newTotalQuantity = (currentTaskDetails.sizeQuantities || []).reduce((acc, s) => acc + (s.quantity || 0), 0);

    const lagamToUpdate = lagams.find(l => l.lagamId === selectedTask.lagamId);
    if (lagamToUpdate) {
        const { bySize: scheduledBySize } = getScheduledQuantityForSection(lagamToUpdate.lagamId, selectedTask.sectionName, selectedTask.id);
        
        for(const sizeQty of currentTaskDetails.sizeQuantities || []) {
            const totalPlannedForSize = lagamToUpdate.productInfo.sizes.find(s => s.size === sizeQty.size)?.quantity || 0;
            const alreadyScheduledForSize = scheduledBySize.find(s => s.size === sizeQty.size)?.quantity || 0;
            if (sizeQty.quantity + alreadyScheduledForSize > totalPlannedForSize) {
                toast({ variant: "destructive", title: 'Error', description: `Quantity for size ${sizeQty.size} cannot exceed the total planned for this Lagam. Max available: ${totalPlannedForSize - alreadyScheduledForSize}` });
                return;
            }
        }
    }
    
    const updatedTaskDetails = {
      ...currentTaskDetails,
      quantity: newTotalQuantity
    }

    try {
      const response = await fetch(`/api/production-tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTaskDetails),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      await fetchData();
      toast({ title: "Task updated successfully." });
      setIsTaskModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      toast({ variant: "destructive", title: 'Error', description: (error as Error).message });
    }
  };
  
  const handleOperationStatusChange = (opIndex: number, isChecked: boolean) => {
    if (!currentTaskDetails.operationStatus) return;
    const newStatus = [...currentTaskDetails.operationStatus];
    newStatus[opIndex] = isChecked;
    
    const allCompleted = newStatus.every(s => s);
    const anyInProgress = newStatus.some(s => s);

    let status: ProductionTask['status'] = 'Pending';
    if(allCompleted) {
        status = 'Completed';
    } else if (anyInProgress) {
        status = 'In Progress';
    }

    setCurrentTaskDetails({ ...currentTaskDetails, operationStatus: newStatus, status: status });
  }

  const handleSelectAllOperations = (isChecked: boolean) => {
     if (!currentTaskDetails.operationStatus) return;
     const newStatus = Array(currentTaskDetails.operationStatus.length).fill(isChecked);
     setCurrentTaskDetails({ ...currentTaskDetails, operationStatus: newStatus, status: isChecked ? 'Completed' : 'Pending' });
  }

  const calculateProgress = (task: ProductionTask) => {
    if (!task.operationStatus || task.operationStatus.length === 0) return 0;
    const completedCount = task.operationStatus.filter(s => s).length;
    return (completedCount / task.operationStatus.length) * 100;
  };
  
  const openNewTaskModal = (operatorId: string, timeSlot: string, date: Date | undefined) => {
    if (!date) {
        toast({ variant: "destructive", title: "Date not selected", description: "Please select a date first." });
        return;
    }
    setNewTaskInfo({ operatorId, timeSlot, date });
    setIsNewTaskModalOpen(true);
  };

  const closeNewTaskModal = () => {
    setIsNewTaskModalOpen(false);
    setNewTaskInfo(null);
    setSelectedLagamForNewTask('');
    setSelectedSectionForNewTask('');
    setNewSizeQuantities([]);
    setLagamSectionStatus([]);
  };

  const handleCreateNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInfo || !selectedLagamForNewTask || !selectedSectionForNewTask || newSizeQuantities.reduce((a,b) => a+b.quantity, 0) <= 0) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please fill out all fields and specify at least one quantity." });
      return;
    }

    const lagam = lagams.find(l => l.lagamId === selectedLagamForNewTask);
    if (!lagam) {
      toast({ variant: "destructive", title: "Invalid Lagam", description: "Selected Lagam could not be found." });
      return;
    }
    
    const { bySize: scheduledBySize } = getScheduledQuantityForSection(lagam.lagamId, selectedSectionForNewTask);

    for (const sizeQty of newSizeQuantities) {
        if (sizeQty.quantity > 0) {
            const plannedForSize = lagam.productInfo.sizes.find(s => s.size === sizeQty.size)?.quantity || 0;
            const scheduledForSize = scheduledBySize.find(s => s.size === sizeQty.size)?.quantity || 0;
            const maxAvailable = plannedForSize - scheduledForSize;
            if(sizeQty.quantity > maxAvailable) {
                toast({ variant: "destructive", title: "Quantity Exceeded", description: `For size ${sizeQty.size}, you can only schedule up to ${maxAvailable} more units.` });
                return;
            }
        }
    }
    
    const section = lagam.productionBlueprint.find(s => s.sectionName === selectedSectionForNewTask);
    if (!section) {
       toast({ variant: "destructive", title: "Invalid Selection", description: "Could not find the selected section." });
      return;
    }
    
    const newTotalQuantity = newSizeQuantities.reduce((acc, s) => acc + s.quantity, 0);
    const timePerUnit = section.plannedOperations.reduce((acc, op) => acc + op.tiempo, 0);
    const estimatedTime = timePerUnit * newTotalQuantity;
    const finalSizeQuantities = newSizeQuantities.filter(s => s.quantity > 0);

    const newTask: Omit<ProductionTask, 'id'> = {
      lagamId: selectedLagamForNewTask,
      sectionName: selectedSectionForNewTask,
      teamMemberId: newTaskInfo.operatorId,
      sizeQuantities: finalSizeQuantities,
      quantity: newTotalQuantity,
      quantityProduced: newTotalQuantity,
      sizeQuantitiesProduced: finalSizeQuantities,
      status: 'Completed',
      estimatedTime: estimatedTime,
      actualTime: null,
      date: newTaskInfo.date.toISOString().split('T')[0],
      timeSlot: newTaskInfo.timeSlot,
      operationStatus: Array(section.plannedOperations.length).fill(true),
    };

    try {
      const response = await fetch('/api/production-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });

      if (!response.ok) {
        throw new Error('Failed to create new task');
      }

      await fetchData();
      toast({ title: "Task created successfully." });
      closeNewTaskModal();
    } catch (error) {
      toast({ variant: "destructive", title: 'Error', description: (error as Error).message });
    }
  };

  const availableSectionsForNewTask = useMemo(() => {
    if (isStatusLoading || !selectedLagamForNewTask || !newTaskInfo) return [];

    const lagam = lagams.find(l => l.lagamId === selectedLagamForNewTask);
    if (!lagam) return [];
    
    const operatorId = newTaskInfo.operatorId;

    return lagam.productionBlueprint
        .map(bpSection => {
            const status = lagamSectionStatus.find(s => s.sectionName === bpSection.sectionName);
            if (status?.isCompleted) {
                return null; 
            }

            const assignedToThisOperator = bpSection.assignedOperators.some(op => op.operatorId === operatorId);
            const isOpenToTeam = bpSection.assignedOperators.length === 0;
            
            let assignmentType: 'correct' | 'open' | 'reassign' = 'reassign';
            if (assignedToThisOperator) {
                assignmentType = 'correct';
            } else if (isOpenToTeam) {
                assignmentType = 'open';
            }

            const assignedOperatorNames = bpSection.assignedOperators.map(o => o.operatorName).join(', ') || 'another operator';

            return {
                ...bpSection,
                assignmentType,
                reassignWarning: !assignedToThisOperator && !isOpenToTeam ? `Assigned to ${assignedOperatorNames}. Selecting will reassign.` : null,
            };
        })
        .filter(Boolean);

  }, [selectedLagamForNewTask, lagamSectionStatus, isStatusLoading, lagams, newTaskInfo]);


  const selectedLagamForValidation = useMemo(() => {
    return lagams.find(l => l.lagamId === selectedLagamForNewTask);
  }, [selectedLagamForNewTask, lagams]);
  
  const maxQuantitiesForNewTask = useMemo(() => {
    if (!selectedLagamForValidation || !selectedSectionForNewTask) return [];
    const { bySize: scheduledBySize } = getScheduledQuantityForSection(selectedLagamForValidation.lagamId, selectedSectionForNewTask);
    
    return selectedLagamForValidation.productInfo.sizes.map(sizeInfo => {
        const scheduled = scheduledBySize.find(s => s.size === sizeInfo.size)?.quantity || 0;
        return {
            size: sizeInfo.size,
            max: sizeInfo.quantity - scheduled,
        };
    });
  }, [selectedLagamForValidation, selectedSectionForNewTask, getScheduledQuantityForSection]);


  const maxQuantitiesForUpdateTask = useMemo(() => {
      if (!selectedTask) return [];
      const lagam = lagams.find(l => l.lagamId === selectedTask.lagamId);
      if (!lagam) return [];
      const { bySize: scheduledBySize } = getScheduledQuantityForSection(lagam.lagamId, selectedTask.sectionName, selectedTask.id);
      
      return lagam.productInfo.sizes.map(sizeInfo => {
        const scheduled = scheduledBySize.find(s => s.size === sizeInfo.size)?.quantity || 0;
        return {
            size: sizeInfo.size,
            max: sizeInfo.quantity - scheduled,
        };
    });
  }, [selectedTask, lagams, getScheduledQuantityForSection]);

  const handleNewSizeQuantityChange = (size: string, quantity: number) => {
    setNewSizeQuantities(prev => {
        const existing = prev.find(s => s.size === size);
        if (existing) {
            return prev.map(s => s.size === size ? { ...s, quantity } : s);
        }
        return [...prev, { size, quantity }];
    });
  };

  const handleUpdateSizeQuantityChange = (size: string, quantity: number) => {
    setCurrentTaskDetails(prev => {
        const existingSqs = prev.sizeQuantities || [];
        const existing = existingSqs.find(s => s.size === size);
        let newSqs;
        if (existing) {
            newSqs = existingSqs.map(s => s.size === size ? { ...s, quantity } : s);
        } else {
            newSqs = [...existingSqs, { size, quantity }];
        }
        const newTotal = newSqs.reduce((acc, s) => acc + (s.quantity || 0), 0);
        return { ...prev, sizeQuantities: newSqs, quantity: newTotal };
    });
  };

  const handleUpdateSizeProducedChange = (size: string, quantity: number) => {
     setCurrentTaskDetails(prev => {
        const existingSqs = prev.sizeQuantitiesProduced || [];
        const existing = existingSqs.find(s => s.size === size);
        let newSqs;
        if (existing) {
            newSqs = existingSqs.map(s => s.size === size ? { ...s, quantity } : s);
        } else {
            newSqs = [...existingSqs, { size, quantity }];
        }
        const newTotal = newSqs.reduce((acc, s) => acc + (s.quantity || 0), 0);
        return { ...prev, sizeQuantitiesProduced: newSqs, quantityProduced: newTotal };
    });
  }


  const openDeleteConfirm = (task: ProductionTask) => {
    setTaskToDelete(task);
    setIsDeleteConfirmOpen(true);
  };
  
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
  
    try {
      const response = await fetch(`/api/production-tasks/${taskToDelete.id}`, {
        method: 'DELETE',
      });
  
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
  
      await fetchData();
      toast({ title: 'Task deleted successfully.' });
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
    } finally {
      setIsDeleteConfirmOpen(false);
      setTaskToDelete(null);
      setIsTaskModalOpen(false);
    }
  };

  const renderSizeQuantities = (sqs: SizeQuantity[] | undefined) => {
      if (!sqs || sqs.length === 0) return '0';
      const total = sqs.reduce((acc, s) => acc + (s.quantity || 0), 0);
      if (sqs.length === 1) return total;
      return `${total} (${sqs.map(s => `${s.size || 'N/A'}: ${s.quantity}`).join(', ')})`;
  }


  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Control Tower"
        description="Monitor daily assignments and analyze performance."
      />
      
      <div className="flex justify-between items-center">
        <div />
        <div className="flex items-center gap-2">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <DatePicker date={selectedDate} setDate={setSelectedDate} />
        </div>
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle>Daily Time Control</CardTitle>
                <CardDescription>
                  Assignments for {selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'the selected date'}.
                </CardDescription>
              </div>
            </div>
        </CardHeader>
        <CardContent>
          {/* Desktop View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Operator</TableHead>
                  {timeSlots.map((slot) => (
                    <TableHead key={slot}>{slot}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={timeSlots.length + 1} className="text-center">Loading tasks...</TableCell>
                  </TableRow>
                ): filteredOperators.length > 0 ? (
                  filteredOperators.map((operator) => {
                    return (
                      <TableRow key={operator.id}>
                        <TableCell className="font-medium">{operator.name}</TableCell>
                        {timeSlots.map((slot) => {
                          const task = getTaskForSlot(operator.id, slot, selectedDate);
                          return (
                            <TableCell key={slot} className="p-1">
                              {task ? (
                                <button onClick={() => openTaskModal(task)} className={cn("p-2 rounded-lg text-xs w-full text-left space-y-1", statusColors[task.status])}>
                                    <Link href={`/lagam/view/${task.lagamId}`} onClick={(e) => e.stopPropagation()} className="font-semibold hover:underline">
                                      {getProductName(task.lagamId)}
                                    </Link>
                                  <p className="text-xs truncate">{task.sectionName}</p>
                                  <p className="text-xs">
                                    Qty: {renderSizeQuantities(task.sizeQuantities)}
                                  </p>
                                  <Progress value={calculateProgress(task)} className="h-1 mt-1" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => openNewTaskModal(operator.id, slot, selectedDate)}
                                  className="flex items-center justify-center w-full h-full min-h-[60px] text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                ) : (
                    <TableRow>
                    <TableCell colSpan={timeSlots.length + 1} className="text-center">No operators found for the selected team.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
            <div className="md:hidden">
            <Accordion type="multiple" className="w-full">
              {loading ? (
                <div className="text-center py-4">Loading tasks...</div>
              ) : filteredOperators.length > 0 ? (
                filteredOperators.map((operator) => {
                  const tasksForOperator = selectedDate ? tasks.filter(t => t.teamMemberId === operator.id && t.date === selectedDate.toISOString().split('T')[0]) : [];
                  const assignedSlots = tasksForOperator.length;
                  return (
                    <AccordionItem value={operator.id} key={operator.id}>
                      <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4">
                          <span>{operator.name}</span>
                          <span className="text-muted-foreground">{assignedSlots} / {timeSlots.length} slots</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2 p-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {timeSlots.map(slot => {
                            const task = getTaskForSlot(operator.id, slot, selectedDate);
                            if (task) {
                                return (
                                <Card key={task.id} className="overflow-hidden">
                                    <button onClick={() => openTaskModal(task)} className={cn("p-3 w-full text-left space-y-1", statusColors[task.status])}>
                                    <div className="font-bold">{task.timeSlot}</div>
                                    <Link href={`/lagam/view/${task.lagamId}`} onClick={(e) => e.stopPropagation()} className="font-semibold hover:underline">
                                        {getProductName(task.lagamId)}
                                    </Link>
                                    <p className="text-sm">{task.sectionName}</p>
                                    <p className="text-sm">
                                        Qty: {renderSizeQuantities(task.sizeQuantities)}
                                    </p>
                                    <Progress value={calculateProgress(task)} className="h-2 mt-2" />
                                    </button>
                                </Card>
                                );
                            }
                            return (
                                <Card key={`${operator.id}-${slot}`} className="min-h-[100px]">
                                <button
                                    onClick={() => openNewTaskModal(operator.id, slot, selectedDate)}
                                    className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:bg-muted rounded-lg transition-colors p-3 gap-1"
                                >
                                    <div className="font-semibold">{slot}</div>
                                    <Plus className="h-4 w-4" />
                                    <span className="text-xs">Add Task</span>
                                </button>
                                </Card>
                            );
                            })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">No operators found for the selected team.</div>
              )}
            </Accordion>
          </div>

        </CardContent>
      </Card>
      
      {/* Update Task Modal */}
      {selectedTask && (
        <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Update Task: {getProductName(selectedTask.lagamId)}</DialogTitle>
                    <DialogDescription>
                        Operator: {users.find(u => u.id === selectedTask.teamMemberId)?.name} | Section: {selectedTask.sectionName}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateTask}>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                        <div className="space-y-2">
                            <Label htmlFor="status">Task Status</Label>
                            <Select
                                value={currentTaskDetails.status}
                                onValueChange={(value) => setCurrentTaskDetails({...currentTaskDetails, status: value as ProductionTask['status']})}
                            >
                                <SelectTrigger id="status">
                                <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                         <div className="space-y-2">
                            <Label>Planned Quantities by Size</Label>
                             <div className="grid grid-cols-2 gap-2">
                                {maxQuantitiesForUpdateTask.map(({ size, max }) => {
                                    const currentPlanned = currentTaskDetails.sizeQuantities?.find(s => s.size === size)?.quantity || 0;
                                    return (
                                        <div key={size} className="space-y-1">
                                            <div className="flex justify-between items-baseline">
                                                <Label htmlFor={`update-qty-${size}`} className="text-sm">{size || 'N/A'}</Label>
                                                <span className="text-xs text-muted-foreground">Max: {max + currentPlanned}</span>
                                            </div>
                                            <Input 
                                                id={`update-qty-${size}`}
                                                type="number"
                                                value={currentPlanned}
                                                onChange={(e) => handleUpdateSizeQuantityChange(size, e.target.value ? Number(e.target.value) : 0)}
                                                max={max + currentPlanned}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                           <Label>Produced Quantities by Size</Label>
                             <div className="grid grid-cols-2 gap-2">
                                {currentTaskDetails.sizeQuantities?.map(({ size, quantity }) => {
                                    const currentProduced = currentTaskDetails.sizeQuantitiesProduced?.find(s => s.size === size)?.quantity || 0;
                                    return (
                                        <div key={size} className="space-y-1">
                                            <Label htmlFor={`produced-qty-${size}`} className="text-sm">{size || 'N/A'}</Label>
                                            <Input 
                                                id={`produced-qty-${size}`}
                                                type="number"
                                                value={currentProduced}
                                                onChange={(e) => handleUpdateSizeProducedChange(size, e.target.value ? Number(e.target.value) : 0)}
                                                placeholder={`Planned: ${quantity}`}
                                                max={quantity}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                           <div className="flex justify-between items-center">
                             <Label>Operations</Label>
                             <div className="flex items-center gap-2">
                                <Checkbox 
                                  id="select-all" 
                                  onCheckedChange={(checked) => handleSelectAllOperations(!!checked)}
                                  checked={currentTaskDetails.operationStatus?.every(s => s)}
                                />
                                <Label htmlFor="select-all" className="text-xs">Mark all as complete</Label>
                             </div>
                           </div>
                           <div className="space-y-2 rounded-md border p-2">
                            {getOperationsForTask(selectedTask).map((op, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`op-${index}`}
                                    checked={currentTaskDetails.operationStatus?.[index] ?? false}
                                    onCheckedChange={(checked) => handleOperationStatusChange(index, !!checked)}
                                />
                                <Label htmlFor={`op-${index}`} className="font-normal">{op.descripcion}</Label>
                                </div>
                            ))}
                           </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="actualTime">Actual Time (minutes)</Label>
                            <Input 
                                id="actualTime" 
                                type="number"
                                value={currentTaskDetails.actualTime || ""}
                                onChange={(e) => setCurrentTaskDetails({...currentTaskDetails, actualTime: e.target.value ? Number(e.target.value) : null})}
                                placeholder="e.g., 150"
                            />
                        </div>
                    </div>
                    <DialogFooter className="justify-between">
                         <Button type="button" variant="destructive" onClick={() => openDeleteConfirm(selectedTask)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Task
                        </Button>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
       )}

      {/* New Task Modal */}
      {newTaskInfo && (
        <Dialog open={isNewTaskModalOpen} onOpenChange={closeNewTaskModal}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add New Task</DialogTitle>
                    <DialogDescription>
                        Schedule a new task for {users.find(u => u.id === newTaskInfo.operatorId)?.name} in the {newTaskInfo.timeSlot} slot.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateNewTask}>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="lagam">Lagam / Product</Label>
                            <Select value={selectedLagamForNewTask} onValueChange={(val) => {setSelectedLagamForNewTask(val); setSelectedSectionForNewTask('')}} required>
                                <SelectTrigger id="lagam">
                                    <SelectValue placeholder="Select a Lagam" />
                                </SelectTrigger>
                                <SelectContent>
                                    {lagams.filter(lagam => !completedLagams.find(cl => cl.lagamId === lagam.lagamId)).map(lagam => {
                                        const produced = getProducedForLagam(lagam.lagamId);
                                        return (
                                            <SelectItem key={lagam.lagamId} value={lagam.lagamId}>
                                                <div className="flex justify-between w-full">
                                                    <span>{lagam.productInfo.productName} ({lagam.lagamId})</span>
                                                    <span className="text-muted-foreground text-xs">
                                                        {Math.round(produced)}/{lagam.productInfo.totalQuantity} produced
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="section">Section</Label>
                            <Select 
                                value={selectedSectionForNewTask} 
                                onValueChange={setSelectedSectionForNewTask} 
                                disabled={!selectedLagamForNewTask || isStatusLoading} 
                                required
                            >
                                <SelectTrigger id="section">
                                    <SelectValue placeholder={isStatusLoading ? "Loading sections..." : "Select a Section"} />
                                </SelectTrigger>
                                <SelectContent>
                                  <TooltipProvider>
                                    {availableSectionsForNewTask.length > 0 ? availableSectionsForNewTask.map(section => {
                                        if (!section) return null;
                                        
                                        const Item = (
                                          <SelectItem key={section.sectionName} value={section.sectionName}>
                                             <div className="flex items-center gap-2">
                                                {section.assignmentType === 'correct' && <UserCheck className="h-4 w-4 text-green-500" />}
                                                {section.assignmentType === 'reassign' && <Info className="h-4 w-4 text-orange-500" />}
                                                <span>{section.sectionName}</span>
                                            </div>
                                          </SelectItem>
                                        );

                                        if (section.reassignWarning) {
                                          return (
                                            <Tooltip key={section.sectionName} delayDuration={0}>
                                              <TooltipTrigger asChild>
                                                <div className="w-full">{Item}</div>
                                              </TooltipTrigger>
                                              <TooltipContent side="right" className="flex items-center gap-2">
                                                <Info className="h-4 w-4 text-orange-500" />
                                                <p>{section.reassignWarning}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          )
                                        }
                                        return Item;
                                    }) : <SelectItem value="none" disabled>No available sections for this Lagam</SelectItem>}
                                  </TooltipProvider>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Quantities by Size</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {maxQuantitiesForNewTask.map(({ size, max }) => (
                                    <div key={size} className="space-y-1">
                                        <div className="flex justify-between items-baseline">
                                            <Label htmlFor={`new-qty-${size}`} className="text-sm">{size || 'N/A'}</Label>
                                            <span className="text-xs text-muted-foreground">Max: {max}</span>
                                        </div>
                                        <Input 
                                            id={`new-qty-${size}`}
                                            type="number"
                                            value={newSizeQuantities.find(s => s.size === size)?.quantity || ''}
                                            onChange={(e) => handleNewSizeQuantityChange(size, e.target.value ? Number(e.target.value) : 0)}
                                            max={max}
                                            disabled={!selectedSectionForNewTask}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={closeNewTaskModal}>Cancel</Button>
                        <Button type="submit">Create Task</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
       )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the task for {users.find(u => u.id === taskToDelete?.teamMemberId)?.name}.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteTask}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
