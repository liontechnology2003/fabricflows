"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import type { Lagam, ProductionTask, SizeQuantity, User, Team } from "@/lib/types";
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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, RefreshCw, Users, Download, Filter, Calendar, UserCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSession } from "@/hooks/useSession";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useReactToPrint } from 'react-to-print';


type OperatorPerformance = {
  id: string;
  name: string;
  unitsProduced: number;
  stdTimeEarned: number;
  actualTime: number;
  performance: number;
  ole: number;
  avatarUrl?: string;
  tasks: ProductionTask[];
  isManager?: boolean;
};

type TeamPerformance = {
  id: string;
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
  allTeams: Team[];
}

type SortOrder = "asc" | "desc";
type ViewMode = "daily" | "monthly" | "range";
type FilterMode = "all" | "team" | "operator" | "my-team";

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

export default function AdvancedReportAnalysisPage() {
  const [lagams, setLagams] = useState<Lagam[]>([]);
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const { toast } = useToast();
  const { session } = useSession();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [selectedLagamId, setSelectedLagamId] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = useIsMobile();
  const componentRef = useRef(null);
  const refreshRef = useRef(false); // Ref to prevent multiple refresh calls
  const filterRefreshRef = useRef(false); // Ref to prevent multiple filter refresh calls

  // State for the operator details modal
  const [selectedOperator, setSelectedOperator] = useState<OperatorPerformance | null>(null);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);

  // Sorting state
  const [teamSortOrder, setTeamSortOrder] = useState<SortOrder>('desc');
  const [operatorSortOrder, setOperatorSortOrder] = useState<SortOrder>('desc');

  // Get user's team
  const userTeam = useMemo(() => {
    if (!session.id || teams.length === 0) return null;
    return teams.find(team => team.memberIds?.includes(session.id));
  }, [session.id, teams]);


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

  const fetchAnalysisData = useCallback(async () => {
    // Prevent multiple simultaneous analysis data fetches
    if (refreshRef.current) {
      return;
    }
    
    refreshRef.current = true;
    setAnalysisLoading(true);
    try {
      let startDateString, endDateString;
      
      if (viewMode === 'monthly') {
        startDateString = format(startOfMonth(startDate), 'yyyy-MM-dd');
        endDateString = format(endOfMonth(startDate), 'yyyy-MM-dd');
      } else if (viewMode === 'range') {
        startDateString = format(startDate, 'yyyy-MM-dd');
        endDateString = format(endDate, 'yyyy-MM-dd');
      } else { // daily
        startDateString = format(startDate, 'yyyy-MM-dd');
        endDateString = format(startDate, 'yyyy-MM-dd');
      }
      
      let url = `/api/production-report?startDate=${startDateString}&endDate=${endDateString}&viewMode=${viewMode}`;
      
      // Apply team filter
      if (filterMode === 'team' && selectedTeamId) {
        url += `&teamId=${selectedTeamId}`;
      } else if (filterMode === 'my-team' && userTeam) {
        url += `&teamId=${userTeam.id}`;
      }
      
      const analysisRes = await fetch(url);
      if (!analysisRes.ok) {
        throw new Error("Failed to fetch analysis data");
      }
      const analysisData = await analysisRes.json();
      setAnalysisData(analysisData);
      // Only update teams if we got new data
      if (analysisData.allTeams && analysisData.allTeams.length > 0) {
        setTeams(analysisData.allTeams || []);
      }

    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch analysis data.",
      });
    } finally {
      setAnalysisLoading(false);
      // Reset the refresh flag after a short delay to allow future refreshes
      setTimeout(() => {
        refreshRef.current = false;
      }, 500);
    }
  }, [startDate, endDate, viewMode, filterMode, selectedTeamId, userTeam, toast]);

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
  
  const refreshData = useCallback(async () => {
    // Prevent multiple simultaneous refresh calls
    if (refreshRef.current) {
      return;
    }
    
    refreshRef.current = true;
    setLoading(true);
    try {
      await Promise.all([
        fetchLagamsAndTasks(),
        fetchAnalysisData(),
        fetchUsers()
      ]);
      toast({ title: "Data refreshed successfully." });
    } catch (error) {
      console.error("Failed to refresh data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not refresh data.",
      });
    } finally {
      setLoading(false);
      // Reset the refresh flag after a short delay to allow future refreshes
      setTimeout(() => {
        refreshRef.current = false;
      }, 500);
    }
  }, [fetchLagamsAndTasks, fetchAnalysisData, fetchUsers, toast]);
  
  const manualRefreshData = useCallback(async () => {
    // Force refresh regardless of ref state
    refreshRef.current = true;
    setLoading(true);
    try {
      await Promise.all([
        fetchLagamsAndTasks(),
        fetchAnalysisData(),
        fetchUsers()
      ]);
      toast({ title: "Data refreshed successfully." });
    } catch (error) {
      console.error("Failed to refresh data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not refresh data.",
      });
    } finally {
      setLoading(false);
      // Reset the refresh flag after a short delay to allow future refreshes
      setTimeout(() => {
        refreshRef.current = false;
      }, 500);
    }
  }, [fetchLagamsAndTasks, fetchAnalysisData, fetchUsers, toast]);

  // Initial data loading effect - only runs once on mount
  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchLagamsAndTasks(),
          fetchAnalysisData(),
          fetchUsers()
        ]);
      } catch (error) {
        console.error("Failed to load initial data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load initial data.",
        });
      } finally {
        setLoading(false);
      }
    };
    
    initialLoad();
  }, []);
  
  // Removed the automatic refresh effect that was causing issues
  // Refresh now only happens when manually triggered by the user

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
    const formattedDate = format(date, 'yyyy-MM-dd'); // Use format instead of toISOString to avoid timezone issues
    return tasks.filter(
      (task) => task.teamMemberId === operatorId && task.date === formattedDate
    );
  };

  const dailyOperatorSummary = useMemo(() => (operator: OperatorPerformance | null) => {
    if (!operator || viewMode === 'monthly') return null;

    const operatorTasks = getOperatorTasksForDay(operator.id, startDate);
    
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
  }, [startDate, tasks, lagams, viewMode]);

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

  const toggleOperatorSortOrder = () => {
    setOperatorSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
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
        setStartDate(date);
        // Refresh with new date immediately
        setTimeout(() => {
          refreshWithFilters();
        }, 100);
      }
  }

  const handleEndDateChange = (date: Date | undefined) => {
      if(date) {
        setEndDate(date);
        // Refresh with new end date
        setTimeout(() => {
          refreshWithFilters();
        }, 100);
      }
  }
  
  const handleViewModeChange = (value: string) => {
    setViewMode(value as ViewMode);
    // Refresh with new view mode
    setTimeout(() => {
      refreshWithFilters();
    }, 100);
  };
  
  const handleFilterModeChange = (value: string) => {
    setFilterMode(value as FilterMode);
    // Reset specific filters when filter mode changes
    if (value !== 'team') setSelectedTeamId('');
    if (value !== 'operator') setSelectedOperatorId('');
    if (value !== 'my-team') setSelectedTeamId('');
    // Refresh with new filter mode
    setTimeout(() => {
      refreshWithFilters();
    }, 100);
  };
  
  const handleTeamChange = (value: string) => {
    setSelectedTeamId(value);
    // Refresh with new team selection
    setTimeout(() => {
      refreshWithFilters();
    }, 100);
  };
  
  const handleOperatorChange = (value: string) => {
    setSelectedOperatorId(value);
    // Refresh with new operator selection
    setTimeout(() => {
      refreshWithFilters();
    }, 100);
  };
  
  const handleLagamChange = (value: string) => {
    setSelectedLagamId(value);
    // Refresh with new lagam selection
    setTimeout(() => {
      refreshWithFilters();
    }, 100);
  };
  
  const handleSectionChange = (value: string) => {
    setSelectedSection(value);
    // Refresh with new section selection
    setTimeout(() => {
      refreshWithFilters();
    }, 100);
  };

  const filteredLagams = useMemo(() => {
    // Apply team filter
    let filteredTeams = teams;
    if (filterMode === 'team' && selectedTeamId) {
      filteredTeams = teams.filter(t => t.id === selectedTeamId);
    } else if (filterMode === 'my-team' && userTeam) {
      filteredTeams = [userTeam];
    }
    
    if (filteredTeams.length === 0) return lagams;
    
    // Get all operators in the filtered teams
    const teamOperators = filteredTeams.flatMap(team => team.memberIds || []);
    
    // Filter tasks by team operators
    const teamTasks = tasks.filter(task => 
      task.teamMemberId && teamOperators.includes(task.teamMemberId)
    );
    
    // Get unique lagam IDs from team tasks
    const teamLagamIds = [...new Set(teamTasks.map(task => task.lagamId))];
    
    // Filter lagams by those used by the team
    return lagams.filter(lagam => teamLagamIds.includes(lagam.lagamId));
  }, [lagams, filterMode, selectedTeamId, userTeam, teams, tasks]);

  const filteredSections = useMemo(() => {
    if (!selectedLagamId) return [];
    
    const lagam = lagams.find(l => l.lagamId === selectedLagamId);
    if (!lagam) return [];
    
    return lagam.productionBlueprint.map(section => section.sectionName);
  }, [selectedLagamId, lagams]);

  const dateRange = useMemo(() => {
    if (viewMode === 'daily') {
      return [startDate]; // For daily view, we only have one date
    } else if (viewMode === 'monthly') {
      return eachDayOfInterval({
        start: startOfMonth(startDate),
        end: endOfMonth(startDate)
      });
    } else { // range
      return eachDayOfInterval({ start: startDate, end: endDate });
    }
  }, [startDate, endDate, viewMode]);

  // Group operators by team for detailed report
  const operatorsGroupedByTeam = useMemo(() => {
    if (!analysisData?.operators || !teams) return [];
    
    // Apply filters
    let filteredOperators = [...analysisData.operators];
    
    if (filterMode === 'team' && selectedTeamId) {
      const team = teams.find(t => t.id === selectedTeamId);
      if (team) {
        filteredOperators = filteredOperators.filter(op => 
          team.memberIds?.includes(op.id)
        );
      }
    } else if (filterMode === 'my-team' && userTeam) {
      filteredOperators = filteredOperators.filter(op => 
        userTeam.memberIds?.includes(op.id)
      );
    } else if (filterMode === 'operator' && selectedOperatorId) {
      filteredOperators = filteredOperators.filter(op => op.id === selectedOperatorId);
    }
    
    // Group by team
    const grouped: { team: Team | null; operators: OperatorPerformance[]; manager: User | null; teamPerformance: TeamPerformance | null }[] = [];
    
    // Get unique team IDs from filtered operators
    const teamIds = [...new Set(
      filteredOperators.flatMap(op => {
        const team = teams.find(t => t.memberIds?.includes(op.id));
        return team ? [team.id] : [];
      })
    )];
    
    // Group operators by team
    teamIds.forEach(teamId => {
      const team = teams.find(t => t.id === teamId);
      if (team) {
        const teamOperators = filteredOperators.filter(op => 
          team.memberIds?.includes(op.id)
        );
        if (teamOperators.length > 0) {
          // Find the manager for this team
          const manager = users.find(user => 
            user.role === 'Manager' && 
            team.memberIds?.includes(user.id)
          ) || null;
          
          // Find team performance data
          const teamPerformance = analysisData.teams.find(t => t.id === teamId) || null;
          
          grouped.push({ team, operators: teamOperators, manager, teamPerformance });
        }
      }
    });
    
    // Handle operators not in any team
    const unassignedOperators = filteredOperators.filter(op => {
      return !teams.some(team => team.memberIds?.includes(op.id));
    });
    
    if (unassignedOperators.length > 0) {
      grouped.push({ team: null, operators: unassignedOperators, manager: null, teamPerformance: null });
    }
    
    return grouped;
  }, [analysisData, teams, users, filterMode, selectedTeamId, selectedOperatorId, userTeam]);

  // PDF Export Function
  const exportToPDF = async () => {
    try {
      toast({
        title: "Export Started",
        description: "Generating PDF report...",
      });

      // Create a new jsPDF instance
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text("Production Report", 14, 20);
      
      // Add report information
      doc.setFontSize(12);
      doc.text(`Report Date: ${format(new Date(), 'PPP')}`, 14, 30);
      doc.text(`View Mode: ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}`, 14, 37);
      
      if (viewMode === 'daily') {
        doc.text(`Date: ${format(startDate, 'PPP')}`, 14, 44);
      } else if (viewMode === 'monthly') {
        doc.text(`Month: ${format(startDate, 'MMMM yyyy')}`, 14, 44);
      } else {
        doc.text(`Date Range: ${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`, 14, 44);
      }
      
      let currentY = 50;
      
      // Add detailed report grouped by teams
      doc.setFontSize(14);
      doc.text("Detailed Production Report", 14, currentY);
      doc.setFontSize(12);
      doc.text("Complete breakdown of all production activities grouped by teams", 14, currentY + 7);
      currentY += 15;
      
      // Add team performance with detailed operator breakdown
      if (operatorsGroupedByTeam.length > 0) {
        operatorsGroupedByTeam.forEach(({ team, operators, manager, teamPerformance }) => {
          // Check if we need a new page
          if (currentY > 250) {
            doc.addPage();
            currentY = 20;
          }
          
          // Team header
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(team ? team.name : 'Unassigned Operators', 14, currentY);
          currentY += 7;
          
          // Manager and team attainment
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          if (manager) {
            doc.text(`Manager: ${manager.name}`, 14, currentY);
            currentY += 5;
          }
          
          if (teamPerformance) {
            doc.text(`Team Attainment: ${teamPerformance.ole.toFixed(2)}%`, 14, currentY);
            currentY += 5;
          }
          
          doc.text(`${operators.reduce((acc, op) => acc + op.tasks.length, 0)} tasks`, 14, currentY);
          currentY += 10;
          
          // Operator details
          operators.forEach((operator) => {
            if (operator.tasks.length === 0) return;
            
            // Check if we need a new page
            if (currentY > 250) {
              doc.addPage();
              currentY = 20;
            }
            
            // Operator header
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${operator.name}`, 14, currentY);
            currentY += 5;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`${operator.tasks.length} tasks`, 14, currentY);
            doc.text(`${operator.ole.toFixed(2)}% OLE`, 100, currentY);
            currentY += 7;
            
            // Task details table header
            const taskHeaders = ['Date', 'Product', 'Section', 'Time Slot', 'Planned', 'Actual', 'Attainment'];
            const taskData = operator.tasks.map(task => {
              const objective = getTaskObjective(task);
              const actual = task.quantityProduced || 0;
              const attainment = objective > 0 ? (actual / objective) * 100 : (actual > 0 ? 100 : 0);
              
              return [
                task.date ? format(new Date(task.date), 'MMM d') : 'N/A',
                getProductName(task.lagamId),
                task.sectionName || 'N/A',
                task.timeSlot || 'N/A',
                objective.toString(),
                actual.toString(),
                `${attainment.toFixed(0)}%`
              ];
            });
            
            // Add task table
            autoTable(doc, {
              head: [taskHeaders],
              body: taskData,
              startY: currentY,
              styles: { fontSize: 8 },
              headStyles: { fillColor: [22, 160, 133] },
              margin: { left: 14 },
            });
            
            // Update currentY based on table height
            const tableHeight = (doc as any).lastAutoTable.finalY || currentY + 30;
            currentY = tableHeight + 10;
          });
          
          currentY += 5; // Space between teams
        });
      }
      
      // Save the PDF
      doc.save(`production-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: "Export Complete",
        description: "PDF report has been generated and downloaded.",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to generate PDF report.",
      });
    }
  };

  // Print Function
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `production-report-${format(new Date(), 'yyyy-MM-dd')}`,
    pageStyle: `
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print {
          display: none !important;
        }
      }
    `
  });


  // Export to CSV Function
  const exportToCSV = async () => {
    try {
      toast({
        title: "Export Started",
        description: "Generating CSV report...",
      });

      // Prepare CSV content with detailed information
      let csvContent = "Team,Manager,Team Attainment,Operator,Units Produced,OLE,Task Count,Date,Product,Section,Time Slot,Planned,Actual,Attainment\n";
      
      operatorsGroupedByTeam.forEach(({ team, operators, manager, teamPerformance }) => {
        const teamName = team ? team.name : 'Unassigned';
        const managerName = manager ? manager.name : 'N/A';
        const teamAttainment = teamPerformance ? `${teamPerformance.ole.toFixed(2)}%` : 'N/A';
        
        operators.forEach(operator => {
          if (operator.tasks.length === 0) {
            // Add operator with no tasks
            csvContent += `"${teamName}","${managerName}","${teamAttainment}","${operator.name}",${operator.unitsProduced},"${operator.ole.toFixed(2)}%",0,,,,,,,\n`;
          } else {
            // Add operator with tasks
            operator.tasks.forEach((task, index) => {
              const objective = getTaskObjective(task);
              const actual = task.quantityProduced || 0;
              const attainment = objective > 0 ? (actual / objective) * 100 : (actual > 0 ? 100 : 0);
              
              csvContent += `"${teamName}","${managerName}","${teamAttainment}","${operator.name}",${operator.unitsProduced},"${operator.ole.toFixed(2)}%",${operator.tasks.length},"${task.date ? format(new Date(task.date), 'MMM d') : 'N/A'}","${getProductName(task.lagamId)}","${task.sectionName || 'N/A'}","${task.timeSlot || 'N/A'}",${objective},${actual},"${attainment.toFixed(0)}%"\n`;
            });
          }
        });
      });

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `production-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Complete",
        description: "CSV report has been generated and downloaded.",
      });
    } catch (error) {
      console.error("CSV export error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to generate CSV report.",
      });
    }
  };

  // Create a separate function for filter-based refresh
  const refreshWithFilters = useCallback(async () => {
    // Prevent multiple simultaneous filter refresh calls
    if (filterRefreshRef.current) {
      return;
    }
    
    filterRefreshRef.current = true;
    setAnalysisLoading(true);
    try {
      let startDateString, endDateString;
      
      if (viewMode === 'monthly') {
        startDateString = format(startOfMonth(startDate), 'yyyy-MM-dd');
        endDateString = format(endOfMonth(startDate), 'yyyy-MM-dd');
      } else if (viewMode === 'range') {
        startDateString = format(startDate, 'yyyy-MM-dd');
        endDateString = format(endDate, 'yyyy-MM-dd');
      } else { // daily
        // For daily view, both start and end should be the same date
        startDateString = format(startDate, 'yyyy-MM-dd');
        endDateString = format(startDate, 'yyyy-MM-dd');
      }
      
      let url = `/api/production-report?startDate=${startDateString}&endDate=${endDateString}&viewMode=${viewMode}`;
      
      // Apply team filter
      if (filterMode === 'team' && selectedTeamId) {
        url += `&teamId=${selectedTeamId}`;
      } else if (filterMode === 'my-team' && userTeam) {
        url += `&teamId=${userTeam.id}`;
      }
      
      const analysisRes = await fetch(url);
      if (!analysisRes.ok) {
        throw new Error("Failed to fetch analysis data");
      }
      const analysisData = await analysisRes.json();
      setAnalysisData(analysisData);
      // Only update teams if we got new data
      if (analysisData.allTeams && analysisData.allTeams.length > 0) {
        setTeams(analysisData.allTeams || []);
      }

    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch analysis data.",
      });
    } finally {
      setAnalysisLoading(false);
      // Reset the refresh flag after a short delay to allow future refreshes
      setTimeout(() => {
        filterRefreshRef.current = false;
      }, 500);
    }
  }, [startDate, endDate, viewMode, filterMode, selectedTeamId, userTeam, toast]);

  if (loading) {
    return (
       <div className="flex flex-col gap-8">
          <PageHeader
            title="Advanced Report Analysis"
            description="Comprehensive production tracking and performance analysis."
          />
          <p>Loading report data...</p>
      </div>
    );
  }

  // Fix for DatePicker setDate prop type mismatch
  const handleStartDateChange = (date: Date | undefined) => {
    if (date) setStartDate(date);
  };

  const handleEndDateChangeCallback = (date: Date | undefined) => {
    if (date) setEndDate(date);
  };

  return (
    <div className="flex flex-col gap-8" ref={componentRef}>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <PageHeader
          title="Advanced Report Analysis"
          description="Comprehensive production tracking and performance analysis."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
          
          <div className="flex flex-col xs:flex-row gap-2">
            <Select value={viewMode} onValueChange={handleViewModeChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="range">Date Range</SelectItem>
              </SelectContent>
            </Select>
            
            {viewMode === 'range' ? (
              <div className="flex flex-col xs:flex-row items-center gap-2">
                <div className="flex items-center gap-2">
                  <DatePicker 
                    date={startDate} 
                    setDate={handleStartDateChange}
                  />
                  <span className="text-muted-foreground hidden xs:inline">to</span>
                  <span className="text-muted-foreground xs:hidden">-</span>
                </div>
                <DatePicker 
                  date={endDate} 
                  setDate={handleEndDateChangeCallback}
                />
              </div>
            ) : (
              <DatePicker 
                  date={startDate} 
                  setDate={handleDateChange}
                  viewMode={viewMode}
              />
            )}
          </div>
          
          <Button 
            onClick={(e) => {
              e.preventDefault();
              manualRefreshData();
            }} 
            variant="outline" 
            size="icon" 
            disabled={loading || analysisLoading}
          >
              <RefreshCw className={cn("h-4 w-4", (loading || analysisLoading) && "animate-spin")} />
              {(loading || analysisLoading) && (
                <span className="sr-only">Refreshing data...</span>
              )}
          </Button>
          
          <div className="flex flex-wrap items-center gap-1">
            <Button onClick={exportToPDF} variant="default" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden xs:inline">PDF</span>
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden xs:inline">CSV</span>
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
              <span className="hidden xs:inline">Print</span>
            </Button>
          </div>
        </div>
      </div>
      
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Filter By</Label>
              <Select value={filterMode} onValueChange={handleFilterModeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Data</SelectItem>
                  <SelectItem value="my-team">My Team</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(filterMode === 'team' || filterMode === 'my-team') && userTeam && (
              <div className="space-y-2">
                <Label>Team</Label>
                <Select 
                  value={filterMode === 'my-team' ? userTeam.id : selectedTeamId} 
                  onValueChange={handleTeamChange}
                  disabled={filterMode === 'my-team'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filterMode === 'my-team' && (
                  <p className="text-sm text-muted-foreground">Showing data for your team: {userTeam.name}</p>
                )}
              </div>
            )}
            
            {filterMode === 'team' && !userTeam && (
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={selectedTeamId} onValueChange={handleTeamChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {filterMode === 'operator' && (
              <div className="space-y-2">
                <Label>Operator</Label>
                <Select value={selectedOperatorId} onValueChange={handleOperatorChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.role === 'Operator').map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={selectedLagamId} onValueChange={handleLagamChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {filteredLagams.map(lagam => (
                    <SelectItem key={lagam.lagamId} value={lagam.lagamId}>
                      {lagam.productInfo.productName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={selectedSection} onValueChange={handleSectionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSections.map(section => (
                    <SelectItem key={section} value={section}>{section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="overview">
        {/* Mobile-friendly tab navigation */}
        <div className="md:hidden">
          <Select onValueChange={(value) => {
            const tabElement = document.getElementById(`tab-${value}`);
            if (tabElement) {
              tabElement.click();
            }
          }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a tab" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="teams">Teams</SelectItem>
              <SelectItem value="operators">Operators</SelectItem>
              <SelectItem value="products">Products</SelectItem>
              <SelectItem value="detailed">Detailed Report</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Desktop tab navigation */}
        <div className="hidden md:block overflow-x-auto pb-2">
          <TabsList className="flex flex-nowrap min-w-max">
              <TabsTrigger id="tab-overview" value="overview">Overview</TabsTrigger>
              <TabsTrigger id="tab-teams" value="teams">Teams</TabsTrigger>
              <TabsTrigger id="tab-operators" value="operators">Operators</TabsTrigger>
              <TabsTrigger id="tab-products" value="products">Products</TabsTrigger>
              <TabsTrigger id="tab-detailed" value="detailed">Detailed Report</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysisData?.teams?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Active production teams</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall OLE</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallTeamProductivity.toFixed(2)}%</div>
                <p className="text-xs text-muted-foreground">
                  Average across all teams
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Units</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analysisData?.teams?.reduce((acc, team) => acc + team.unitsProduced, 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">Produced in selected period</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Date Range</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold">
                  {viewMode === 'daily' 
                    ? format(startDate, 'PPP')
                    : viewMode === 'monthly'
                    ? format(startDate, 'MMMM yyyy')
                    : `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dateRange.length} day{dateRange.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Average team performance over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {dateRange.length > 1 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Chart visualization would appear here in a full implementation
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  Select a date range to view performance trends
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="teams" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle>Team Performance</CardTitle>
                  <CardDescription>OLE analysis for each team</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {analysisLoading ? (
                <p>Loading analysis...</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-medium min-w-[100px]">Team</TableHead>
                        <TableHead className="min-w-[80px]">Units Produced</TableHead>
                        <TableHead className="min-w-[80px]">Performance</TableHead>
                        <TableHead className="text-right min-w-[80px]">
                          <Button variant="ghost" onClick={toggleTeamSortOrder} size="sm">
                            OLE
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTeams && sortedTeams.length > 0 ? (
                        sortedTeams.map((team) => (
                          <TableRow key={team.id}>
                            <TableCell className="font-medium">{team.name}</TableCell>
                            <TableCell>{team.unitsProduced}</TableCell>
                            <TableCell>
                              <Badge className={cn(getEfficiencyColor(team.performance))}>
                                {team.performance.toFixed(0)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge className={cn(getEfficiencyColor(team.ole))}>
                                {team.ole.toFixed(2)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No team performance data available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="operators" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle>Operator Performance</CardTitle>
                  <CardDescription>Detailed performance metrics for all operators</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {analysisLoading ? (
                <p>Loading analysis...</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Operator</TableHead>
                        <TableHead className="min-w-[100px]">Team</TableHead>
                        <TableHead className="min-w-[60px]">Units</TableHead>
                        <TableHead className="min-w-[80px]">Performance</TableHead>
                        <TableHead className="text-right min-w-[80px]">
                          <Button variant="ghost" onClick={toggleOperatorSortOrder} size="sm">
                            OLE
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisData?.operators && analysisData.operators.length > 0 ? (
                        [...analysisData.operators]
                          .sort((a, b) => 
                            operatorSortOrder === 'asc' 
                              ? a.ole - b.ole 
                              : b.ole - a.ole
                          )
                          .map((operator) => {
                            const operatorTeam = teams.find(team => 
                              team.memberIds?.includes(operator.id)
                            );
                            
                            return (
                              <TableRow key={operator.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={getUserAvatar(operator.id)} alt={operator.name} />
                                      <AvatarFallback>{operator.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="truncate">{operator.name}</p>
                                      {operator.isManager && (
                                        <Badge variant="secondary" className="ml-2 text-xs">
                                          Manager
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="min-w-[80px]">
                                    {operatorTeam?.name || 'N/A'}
                                  </div>
                                </TableCell>
                                <TableCell>{operator.unitsProduced}</TableCell>
                                <TableCell>
                                  <Badge className={cn(getEfficiencyColor(operator.performance))}>
                                    {operator.performance.toFixed(0)}%
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge className={cn(getEfficiencyColor(operator.ole))}>
                                    {operator.ole.toFixed(2)}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No operator performance data available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="products" className="mt-4 space-y-4">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {filteredLagams.map((lagam) => {
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
            {filteredLagams.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                    <p>No products found for the selected filters.</p>
                </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="detailed" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Production Report</CardTitle>
              <CardDescription>Complete breakdown of all production activities grouped by teams</CardDescription>
            </CardHeader>
            <CardContent>
              {analysisLoading ? (
                <p>Loading detailed report...</p>
              ) : operatorsGroupedByTeam.length > 0 ? (
                <div className="space-y-6">
                  {operatorsGroupedByTeam.map(({ team, operators, manager, teamPerformance }) => (
                    <div key={team?.id || 'unassigned'} className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {team ? team.name : 'Unassigned Operators'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2">
                            {manager && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <UserCircle className="h-4 w-4" />
                                <span>Manager: {manager.name}</span>
                              </div>
                            )}
                            {teamPerformance && (
                              <div className="flex items-center gap-1 text-sm">
                                <span className="font-medium">Team Attainment:</span>
                                <Badge className={cn(getEfficiencyColor(teamPerformance.ole))}>
                                  {teamPerformance.ole.toFixed(2)}%
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {operators.reduce((acc, op) => acc + op.tasks.length, 0)} tasks
                        </Badge>
                      </div>
                      
                      {operators.map((operator) => {
                        if (operator.tasks.length === 0) return null;
                        
                        return (
                          <Card key={operator.id} className="ml-0 sm:ml-4">
                            <CardHeader>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={getUserAvatar(operator.id)} alt={operator.name} />
                                    <AvatarFallback>{operator.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <CardTitle className="text-lg">{operator.name}</CardTitle>
                                    <CardDescription>
                                      {operator.tasks.length} tasks
                                    </CardDescription>
                                  </div>
                                </div>
                                <Badge className={cn(getEfficiencyColor(operator.ole))}>
                                  {operator.ole.toFixed(2)}% OLE
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="whitespace-nowrap min-w-[80px]">Date</TableHead>
                                      <TableHead className="whitespace-nowrap min-w-[120px]">Product</TableHead>
                                      <TableHead className="whitespace-nowrap min-w-[120px]">Section</TableHead>
                                      <TableHead className="whitespace-nowrap min-w-[100px]">Time Slot</TableHead>
                                      <TableHead className="whitespace-nowrap min-w-[70px]">Planned</TableHead>
                                      <TableHead className="whitespace-nowrap min-w-[70px]">Actual</TableHead>
                                      <TableHead className="text-right whitespace-nowrap min-w-[90px]">Attainment</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {operator.tasks.map((task) => {
                                      const objective = getTaskObjective(task);
                                      const actual = task.quantityProduced || 0;
                                      const attainment = objective > 0 ? (actual / objective) * 100 : (actual > 0 ? 100 : 0);
                                      
                                      return (
                                        <TableRow key={task.id}>
                                          <TableCell className="whitespace-nowrap">{task.date ? format(new Date(task.date), 'MMM d') : 'N/A'}</TableCell>
                                          <TableCell className="whitespace-nowrap max-w-[150px] truncate">{getProductName(task.lagamId)}</TableCell>
                                          <TableCell className="whitespace-nowrap max-w-[150px] truncate">{task.sectionName}</TableCell>
                                          <TableCell className="whitespace-nowrap">{task.timeSlot || 'N/A'}</TableCell>
                                          <TableCell>{objective}</TableCell>
                                          <TableCell>{actual}</TableCell>
                                          <TableCell className="text-right">
                                            <Badge className={cn(getEfficiencyColor(attainment))}>
                                              {attainment.toFixed(0)}%
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  No detailed production data available for the selected filters.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Operator Details Modal */}
      {selectedOperator && viewMode === 'daily' && (
        <Dialog open={isOperatorModalOpen} onOpenChange={setIsOperatorModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Daily Analytics: {selectedOperator.name}</DialogTitle>
                    <DialogDescription>
                        Productivity breakdown for {format(startDate, 'PPP')}.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-4">
                    {dailyOperatorSummary(selectedOperator) && (
                      <Card className="mb-4">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Daily Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
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
                          const task = getOperatorTasksForDay(selectedOperator.id, startDate).find(t => t.timeSlot === slot);
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
                      <div className="overflow-x-auto">
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
                                    const task = getOperatorTasksForDay(selectedOperator.id, startDate).find(t => t.timeSlot === slot);
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
                      </div>
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