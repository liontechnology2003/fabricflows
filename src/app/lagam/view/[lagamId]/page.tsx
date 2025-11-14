

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Lagam, PlannedOperation, ProductionTask, ProductInfo } from "@/lib/types";
import { ArrowLeft, Edit, FileText, Clock, Package, Target, Cpu, Users, Gauge, Briefcase } from "lucide-react";

export default function ViewLagamPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const lagamId = params.lagamId as string;

  const [lagam, setLagam] = useState<Lagam | null>(null);
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lagamId) return;

    const fetchLagamData = async () => {
      setLoading(true);
      try {
        const [lagamRes, tasksRes] = await Promise.all([
            fetch(`/api/lagam/${lagamId}`, { cache: 'no-store' }),
            fetch('/api/production-tasks')
        ]);
        
        if (!lagamRes.ok) {
          throw new Error("Failed to fetch Lagam details");
        }
         if (!tasksRes.ok) {
          throw new Error('Failed to fetch tasks');
        }

        const lagamData = await lagamRes.json();
        const tasksData = await tasksRes.json();
        setLagam(lagamData);
        setTasks(tasksData);

      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load the Lagam. You will be redirected.",
        });
        router.push('/lagam');
      } finally {
        setLoading(false);
      }
    };

    fetchLagamData();
  }, [lagamId, router, toast]);

  const calculateSectionTime = (ops: PlannedOperation[]): number => {
    return ops.reduce((total, op) => total + (Number(op.tiempo) || 0), 0);
  };
  
  const lagamStatus = useMemo((): Lagam['status'] => {
    if (!lagam) return 'Draft';

    const relevantTasks = tasks.filter(t => t.lagamId === lagam.lagamId);
    if (relevantTasks.length === 0) {
      return 'Draft';
    }

    const totalProduced = relevantTasks.reduce((acc, task) => acc + (task.quantityProduced || 0), 0);

    if (totalProduced >= lagam.productInfo.totalQuantity) {
      return 'Completed';
    }

    return 'Active';
  }, [lagam, tasks]);

  const totalTimeForUnit = useMemo(() => {
    if (!lagam) return 0;
    const { productionBlueprint } = lagam;
    return productionBlueprint.reduce((total, section) => {
      return total + calculateSectionTime(section.plannedOperations);
    }, 0);
  }, [lagam]);
  
  const calculatedTotalStandardTime = useMemo(() => {
    return `${totalTimeForUnit.toFixed(2)} minutes`;
  }, [totalTimeForUnit]);

  const allOperators = useMemo(() => {
    if (!lagam) return [];
    const operatorSet = new Map();
    lagam.productionBlueprint.forEach(section => {
        section.assignedOperators.forEach(op => {
            if (!operatorSet.has(op.operatorId)) {
                operatorSet.set(op.operatorId, op.operatorName);
            }
        });
    });
    return Array.from(operatorSet.values());
}, [lagam]);

  const averageTimePerOperator = useMemo(() => {
    if (allOperators.length === 0) return 0;
    return totalTimeForUnit / allOperators.length;
  }, [totalTimeForUnit, allOperators]);

  const hasManualTime = (productInfo: ProductInfo) => {
    return productInfo.totalStandardTime && productInfo.totalStandardTime !== calculatedTotalStandardTime;
  }


  if (loading) {
    return <div className="p-8">Loading Lagam details...</div>;
  }

  if (!lagam) {
    return (
      <div className="p-8 text-center">
        <p>Lagam not found.</p>
        <Button asChild variant="link">
          <Link href="/lagam">Return to Lagam Hub</Link>
        </Button>
      </div>
    );
  }

  const { productInfo, productionBlueprint, teamInfo } = lagam;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-start">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-4 mb-2">
            <Link href="/lagam">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lagam Hub
            </Link>
          </Button>
          <PageHeader
            title={productInfo.productName}
            description={`Lagam ID: ${lagam.lagamId} - Status: ${lagamStatus}`}
          />
        </div>
        <Button asChild>
          <Link href={`/lagam/${lagamId}`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Lagam
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lagam Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <Package className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Product Code</p>
                <p className="font-semibold">{productInfo.productCode}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Quantity</p>
                <p className="font-semibold">{productInfo.totalQuantity} units</p>
              </div>
            </div>
             <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Standard Time {hasManualTime(productInfo) && '(Manual)'}</p>
                <p className="font-semibold">{productInfo.totalStandardTime}</p>
              </div>
            </div>
            {hasManualTime(productInfo) && (
              <div className="flex items-center gap-4">
                <Cpu className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total time for unit</p>
                  <p className="font-semibold">{calculatedTotalStandardTime}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-4">
                <Gauge className="h-8 w-8 text-muted-foreground" />
                <div>
                    <p className="text-sm text-muted-foreground">Avg. Time per Operator</p>
                    <p className="font-semibold">{averageTimePerOperator.toFixed(2)} min</p>
                </div>
            </div>
            {teamInfo.managerName && (
                <div className="flex items-center gap-4">
                    <Briefcase className="h-8 w-8 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">Manager</p>
                        <p className="font-semibold">{teamInfo.managerName}</p>
                    </div>
                </div>
            )}
          </div>
           {allOperators.length > 0 && (
                <div className="mt-6">
                     <h4 className="font-semibold mb-2 flex items-center">
                        <Users className="mr-2 h-5 w-5" />
                        Assigned Operators ({allOperators.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {allOperators.map((name, i) => (
                            <Badge key={i} variant="secondary" className="text-base py-1 px-3">
                                {name}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
          {productInfo.sizes && productInfo.sizes.length > 0 && (
             <div className="mt-6">
                <h4 className="font-semibold mb-2">Size Breakdown</h4>
                <div className="flex flex-wrap gap-2">
                    {productInfo.sizes.map((s, i) => s.quantity > 0 && (
                        <Badge key={i} variant="secondary" className="text-base py-1 px-3">
                            {s.size ? `${s.size}: ` : ''}{s.quantity} units
                        </Badge>
                    ))}
                </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Production Blueprint</CardTitle>
          <CardDescription>
            Detailed plan with assigned operators and operations for each section.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-6">
                {productionBlueprint.map((section, index) => {
                    const sectionTime = calculateSectionTime(section.plannedOperations);
                    const objective = sectionTime > 0 ? (60 / sectionTime).toFixed(2) : '0.00';
                    
                    return (
                        <div key={index} className="border rounded-lg overflow-hidden">
                           <div className="bg-muted/50 p-4">
                               <div className="flex justify-between items-center flex-wrap gap-2">
                                    <h3 className="font-semibold text-lg">{section.sectionName}</h3>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="flex items-center gap-1.5">
                                            <Target className="h-3 w-3" />
                                            Objective: {objective} u/h
                                        </Badge>
                                        <Badge variant="outline" className="flex items-center gap-1.5">
                                            <Clock className="h-3 w-3" />
                                            Total Time: {sectionTime.toFixed(2)} min
                                        </Badge>
                                    </div>
                               </div>
                                 <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <h4 className="font-medium text-sm shrink-0">Assigned Operators:</h4>
                                    {section.assignedOperators.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {section.assignedOperators.map(op => (
                                            <Badge key={op.operatorId} variant="secondary">{op.operatorName}</Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">None</span>
                                    )}
                                </div>
                           </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Operation</TableHead>
                                        <TableHead>Machine</TableHead>
                                        <TableHead className="text-right">Time (min)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {section.plannedOperations.map((op, opIndex) => (
                                        <TableRow key={opIndex}>
                                            <TableCell>{op.descripcion}</TableCell>
                                            <TableCell>{op.maquina}</TableCell>
                                            <TableCell className="text-right">{op.tiempo.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {section.plannedOperations.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                                No operations in this section.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )
                })}
                {productionBlueprint.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">This Lagam has no blueprint sections defined.</p>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
