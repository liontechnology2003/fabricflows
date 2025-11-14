
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, MoreHorizontal, Trash2, Eye, Clock, ListChecks, Package, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import type { Lagam, ProductionTask } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


export default function LagamHubPage() {
  const [lagams, setLagams] = useState<Lagam[]>([]);
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [lagamToDelete, setLagamToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lagamsRes, tasksRes] = await Promise.all([
            fetch('/api/lagam'),
            fetch('/api/production-tasks')
        ]);
        
        if (!lagamsRes.ok || !tasksRes.ok) {
          throw new Error('Failed to fetch data');
        }
        const lagamsData = await lagamsRes.json();
        const tasksData = await tasksRes.json();
        setLagams(lagamsData);
        setTasks(tasksData);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch data from the server.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const openDeleteConfirm = (lagamId: string) => {
    setLagamToDelete(lagamId);
    setIsConfirmOpen(true);
  };

  const handleDeleteLagam = async () => {
    if (!lagamToDelete) return;

    try {
      const response = await fetch(`/api/lagam/${lagamToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete Lagam');
      }

      setLagams(lagams.filter((lagam) => lagam.lagamId !== lagamToDelete));
      toast({ title: 'Lagam deleted successfully.' });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete the Lagam. Please try again.",
      });
    } finally {
      setIsConfirmOpen(false);
      setLagamToDelete(null);
    }
  };
  
  const getLagamStatus = (lagam: Lagam): Lagam['status'] => {
    const relevantTasks = tasks.filter(t => t.lagamId === lagam.lagamId);
    if (relevantTasks.length === 0) {
      return 'Draft';
    }

    const totalProduced = relevantTasks.reduce((acc, task) => acc + (task.quantityProduced || 0), 0);

    if (totalProduced >= lagam.productInfo.totalQuantity) {
      return 'Completed';
    }

    return 'Active';
  };
  
  const statusColors: Record<Lagam['status'], string> = {
    'Draft': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300',
    'Active': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300',
    'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300'
  };

  const lagamsWithStatus = useMemo(() => {
    return lagams.map(lagam => ({
      ...lagam,
      status: getLagamStatus(lagam)
    }));
  }, [lagams, tasks]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Lagam Hub"
          description="Create, view, and manage your production plans."
        />
        <Button asChild>
          <Link href="/lagam/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Lagam
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p>Loading Lagams...</p>
        ) : lagamsWithStatus.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No Lagams found.</p>
            <p className="text-muted-foreground">Click "Create New Lagam" to get started.</p>
          </div>
        ) : (
          lagamsWithStatus.map((lagam) => (
            <Card key={lagam.lagamId} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{lagam.productInfo.productName}</CardTitle>
                    <CardDescription>{lagam.productInfo.productCode} - {lagam.lagamId}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/lagam/view/${lagam.lagamId}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/lagam/${lagam.lagamId}`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDeleteConfirm(lagam.lagamId)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                 <Badge className={cn("text-xs font-semibold", statusColors[lagam.status])}>
                    {lagam.status}
                </Badge>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Est. Time</p>
                      <p className="font-medium">{lagam.productInfo.totalStandardTime}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ListChecks className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Sections</p>
                      <p className="font-medium">{lagam.productionBlueprint.length}</p>
                    </div>
                  </div>
                   <div className="flex items-start gap-2">
                    <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Quantity Breakdown</p>
                      <div className="font-medium flex flex-wrap gap-x-2 gap-y-1">
                        {lagam.productInfo.sizes.map((s, i) => (
                          <span key={i}>{s.size ? `${s.size}:` : ''} {s.quantity}</span>
                        ))}
                      </div>
                      <p className="font-bold">Total: {lagam.productInfo.totalQuantity}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Team</p>
                      <p className="font-medium">{lagam.teamInfo.assignedTeamName}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                 <Button asChild className="w-full">
                  <Link href={`/lagam/view/${lagam.lagamId}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the Lagam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLagamToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLagam} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
