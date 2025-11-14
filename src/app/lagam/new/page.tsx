
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Team,
  CatalogSection,
  Lagam,
  ProductInfo,
  LagamTeamInfo,
  ProductionBlueprintSection,
  AssignedOperator,
  Operation,
  SizeQuantity,
} from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronRight, PlusCircle, Trash2, Users, FileText, GripVertical, Save, ArrowLeft, X, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';


export default function NewLagamPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);

  // Data state
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [catalog, setCatalog] = useState<CatalogSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Lagam state
  const [productInfo, setProductInfo] = useState<Partial<ProductInfo>>({ sizes: [{ size: '', quantity: 0 }], totalStandardTime: '' });
  const [teamInfo, setTeamInfo] = useState<Partial<LagamTeamInfo>>({});
  const [productionBlueprint, setProductionBlueprint] = useState<ProductionBlueprintSection[]>([]);

  // UI state
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isAssignOpModalOpen, setIsAssignOpModalOpen] = useState(false);
  const [targetSectionIndex, setTargetSectionIndex] = useState<number | null>(null);
  const [isImportSectionsModalOpen, setIsImportSectionsModalOpen] = useState(false);
  const [isCustomSectionModalOpen, setIsCustomSectionModalOpen] = useState(false);
  const [newCustomSection, setNewCustomSection] = useState<Partial<ProductionBlueprintSection>>({ sectionName: '', plannedOperations: [] });


  useEffect(() => {
    setIsMounted(true);
    const fetchData = async () => {
      try {
        const [teamsRes, usersRes, catalogRes] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/users"),
          fetch("/api/catalog"),
        ]);
        if (!teamsRes.ok || !usersRes.ok || !catalogRes.ok) {
          throw new Error("Failed to fetch initial data");
        }
        const teamsData = await teamsRes.json();
        const usersData = await usersRes.json();
        const catalogData = await catalogRes.json();

        setTeams(teamsData);
        setUsers(usersData);
        setCatalog(catalogData);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch necessary data. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(productionBlueprint);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setProductionBlueprint(items);
  };


  const totalQuantity = useMemo(() => {
    return productInfo.sizes?.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0) || 0;
  }, [productInfo.sizes]);

  const handleSizeChange = (index: number, field: keyof SizeQuantity, value: string | number) => {
    const newSizes = [...(productInfo.sizes || [])];
    const size = { ...newSizes[index] };
    if (field === 'quantity') {
      size[field] = Number(value);
    } else {
      size[field] = value as string;
    }
    newSizes[index] = size;
    setProductInfo({ ...productInfo, sizes: newSizes });
  };

  const addSize = () => {
    const newSizes = [...(productInfo.sizes || []), { size: '', quantity: 0 }];
    setProductInfo({ ...productInfo, sizes: newSizes });
  };

  const removeSize = (index: number) => {
    if (productInfo.sizes && productInfo.sizes.length > 1) {
      const newSizes = [...productInfo.sizes];
      newSizes.splice(index, 1);
      setProductInfo({ ...productInfo, sizes: newSizes });
    }
  };


  const selectedTeamMembers = useMemo(() => {
    if (!teamInfo.assignedTeamId) return [];
    const team = teams.find((t) => t.id === teamInfo.assignedTeamId);
    if (!team) return [];
    return users.filter((u) => team.memberIds.includes(u.id));
  }, [teamInfo.assignedTeamId, teams, users]);

  const handleTeamSelect = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (team) {
      setTeamInfo({
        assignedTeamId: team.id,
        assignedTeamName: team.name,
        teamMemberCount: team.memberIds.length,
      });
      // Reset blueprint if team changes, as assignments will be invalid
      setProductionBlueprint([]);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (
        !productInfo.productName ||
        !productInfo.productCode ||
        !productInfo.sizes ||
        productInfo.sizes.some(s => !s.quantity || s.quantity <= 0)
      ) {
        toast({
          variant: "destructive",
          title: "Missing Information",
          description: "Please fill out all product information fields, including at least one quantity.",
        });
        return;
      }
      if (!teamInfo.assignedTeamId) {
        toast({
          variant: "destructive",
          title: "Missing Information",
          description: "Please assign a team.",
        });
        return;
      }
    }
    setStep(step + 1);
  };
  
  const handleRemoveBlueprintSection = (index: number) => {
    setProductionBlueprint(productionBlueprint.filter((_, i) => i !== index));
  }
  
  const handleSectionNameChange = (index: number, name: string) => {
    const updatedBlueprint = [...productionBlueprint];
    updatedBlueprint[index].sectionName = name;
    setProductionBlueprint(updatedBlueprint);
  }

  const openCatalogModal = (sectionIndex: number) => {
    setTargetSectionIndex(sectionIndex);
    setIsCatalogModalOpen(true);
  }

  const handleImportOperations = (selectedOps: Operation[]) => {
    if (targetSectionIndex === null) return;
    
    let updatedBlueprint = [...productionBlueprint];
    const currentSection = updatedBlueprint[targetSectionIndex];
    
    // Logic to avoid duplicates
    const existingOpsDescriptions = new Set(currentSection.plannedOperations.map(op => op.descripcion));
    const uniqueNewOps = selectedOps.filter(op => !existingOpsDescriptions.has(op.descripcion));

    currentSection.plannedOperations.push(...uniqueNewOps);
    
    setProductionBlueprint(updatedBlueprint);
    toast({ title: `Imported ${uniqueNewOps.length} new operations.` });
    
    setIsCatalogModalOpen(false);
    setTargetSectionIndex(null);
  };

  const handleImportSections = (sectionsToImport: ProductionBlueprintSection[]) => {
    let blueprintCopy = [...productionBlueprint];
    const existingSectionNames = new Set(blueprintCopy.map(bp => bp.sectionName));

    const newSections = sectionsToImport.filter(ns => ns.sectionName !== 'Custom Section' && !existingSectionNames.has(ns.sectionName));
    
    const customSectionOps = sectionsToImport.find(s => s.sectionName === 'Custom Section')?.plannedOperations || [];

    if (customSectionOps.length > 0) {
      let customSectionIndex = blueprintCopy.findIndex(s => s.sectionName.startsWith('Custom Section'));
      
      if (customSectionIndex !== -1) {
        const existingOps = new Set(blueprintCopy[customSectionIndex].plannedOperations.map(o => o.descripcion));
        const newOps = customSectionOps.filter(o => !existingOps.has(o.descripcion));
        blueprintCopy[customSectionIndex].plannedOperations.push(...newOps);
      } else {
         blueprintCopy.push({
            sectionName: `Custom Section`,
            assignedOperators: [],
            plannedOperations: customSectionOps
        });
      }
    }

    setProductionBlueprint([...blueprintCopy, ...newSections]);
    toast({ title: `Import successful.` });
    setIsImportSectionsModalOpen(false);
  };
  
  const handleRemoveOperation = (sectionIndex: number, opIndex: number) => {
      const updatedBlueprint = [...productionBlueprint];
      updatedBlueprint[sectionIndex].plannedOperations.splice(opIndex, 1);
      setProductionBlueprint(updatedBlueprint);
  }

  const openAssignOpModal = (sectionIndex: number) => {
    setTargetSectionIndex(sectionIndex);
    setIsAssignOpModalOpen(true);
  }
  
  const handleAssignOperators = (operatorIds: string[]) => {
    if (targetSectionIndex === null) return;
    
    const assignedOperators: AssignedOperator[] = operatorIds.map(id => {
        const user = users.find(u => u.id === id);
        return { operatorId: id, operatorName: user?.name || "Unknown" };
    });

    const updatedBlueprint = [...productionBlueprint];
    updatedBlueprint[targetSectionIndex].assignedOperators = assignedOperators;
    setProductionBlueprint(updatedBlueprint);

    setIsAssignOpModalOpen(false);
    setTargetSectionIndex(null);
  }

  const calculateSectionTime = (ops: Operation[]) => {
    return ops.reduce((total, op) => total + (op.tiempo || 0), 0);
  };
  
  const calculatedTotalStandardTime = useMemo(() => {
    if (!totalQuantity) return "0 minutes";
    const totalMinutesPerUnit = productionBlueprint.reduce((total, section) => {
        return total + calculateSectionTime(section.plannedOperations);
    }, 0);
    const totalTime = totalMinutesPerUnit * totalQuantity;
    return `${totalTime.toFixed(2)} minutes`;
  }, [productionBlueprint, totalQuantity]);


  const handleCreateLagam = async () => {
    const finalStandardTime = productInfo.totalStandardTime ? `${productInfo.totalStandardTime} minutes` : calculatedTotalStandardTime;

    if (!productInfo.sizes || productInfo.sizes.some(s => !s.quantity || s.quantity <= 0)) {
       toast({ variant: "destructive", title: "Error", description: "At least one quantity is required."});
       return;
    }
    
    const finalProductInfo: ProductInfo = {
        productName: productInfo.productName || '',
        productCode: productInfo.productCode || '',
        sizes: productInfo.sizes as SizeQuantity[],
        totalQuantity: totalQuantity,
        totalStandardTime: finalStandardTime,
    }


    const finalLagam: Omit<Lagam, 'lagamId'> = {
        productInfo: finalProductInfo,
        teamInfo: teamInfo as LagamTeamInfo,
        productionBlueprint,
        status: 'Draft'
    };

    try {
        const response = await fetch('/api/lagam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalLagam),
        });

        if (!response.ok) {
            throw new Error('Failed to create Lagam');
        }

        toast({ title: 'Lagam created successfully!', description: 'Redirecting to Lagam Hub...' });
        router.push('/lagam');

    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not create the Lagam. Please try again.",
        });
    }
  };
  
  const openCustomSectionModal = () => {
    setNewCustomSection({
      sectionName: '',
      assignedOperators: [],
      plannedOperations: [{ descripcion: '', maquina: '', tiempo: 0 }]
    });
    setIsCustomSectionModalOpen(true);
  };

  const closeCustomSectionModal = () => {
    setIsCustomSectionModalOpen(false);
  };

  const handleSaveCustomSection = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newCustomSection.sectionName) {
      toast({ variant: "destructive", title: "Error", description: "Section name is required." });
      return;
    }
    if (productionBlueprint.some(s => s.sectionName === newCustomSection.sectionName)) {
      toast({ variant: "destructive", title: "Error", description: "A section with this name already exists." });
      return;
    }

    const finalSection: ProductionBlueprintSection = {
      sectionName: newCustomSection.sectionName,
      assignedOperators: [],
      plannedOperations: newCustomSection.plannedOperations || [],
    };

    setProductionBlueprint([...productionBlueprint, finalSection]);
    closeCustomSectionModal();
    toast({ title: "Custom section added." });
  };

  const handleCustomOperationChange = (index: number, field: keyof Operation, value: string | number) => {
    const newOps = [...(newCustomSection.plannedOperations || [])];
    const op = { ...newOps[index] };
    if (field === 'tiempo') {
      op[field] = Number(value);
    } else {
      op[field] = value as string;
    }
    newOps[index] = op;
    setNewCustomSection({ ...newCustomSection, plannedOperations: newOps });
  };

  const addCustomOperation = () => {
    const newOps = [...(newCustomSection.plannedOperations || []), { descripcion: '', maquina: '', tiempo: 0 }];
    setNewCustomSection({ ...newCustomSection, plannedOperations: newOps });
  };

  const removeCustomOperation = (index: number) => {
    const newOps = [...(newCustomSection.plannedOperations || [])];
    newOps.splice(index, 1);
    setNewCustomSection({ ...newCustomSection, plannedOperations: newOps });
  };


  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Create New Lagam"
        description="Follow the steps to build a complete production plan."
      />

      {/* Step 1: Product and Team Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Product & Team</CardTitle>
            <CardDescription>
              Define what is being made, the quantity, and which team is responsible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Product Information</h3>
                    <div>
                    <Label htmlFor="productName">Product Name</Label>
                    <Input id="productName" value={productInfo.productName || ''} onChange={(e) => setProductInfo({...productInfo, productName: e.target.value })} />
                    </div>
                    <div>
                    <Label htmlFor="productCode">Product Code</Label>
                    <Input id="productCode" value={productInfo.productCode || ''} onChange={(e) => setProductInfo({...productInfo, productCode: e.target.value })} />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Sizes and Quantities</Label>
                        {productInfo.sizes?.map((sizeItem, index) => (
                           <div key={index} className="flex items-center gap-2">
                               <Input 
                                placeholder="Size (optional)"
                                value={sizeItem.size} 
                                onChange={(e) => handleSizeChange(index, 'size', e.target.value)} 
                               />
                               <Input 
                                placeholder="Quantity"
                                type="number" 
                                value={sizeItem.quantity || ''} 
                                onChange={(e) => handleSizeChange(index, 'quantity', e.target.value)}
                                required 
                               />
                               <Button variant="ghost" size="icon" onClick={() => removeSize(index)} disabled={productInfo.sizes && productInfo.sizes.length <= 1}>
                                   <Trash2 className="h-4 w-4 text-destructive" />
                               </Button>
                           </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addSize}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Size
                        </Button>
                    </div>
                     <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertTitle>Total Quantity</AlertTitle>
                        <AlertDescription>
                           {totalQuantity} units
                        </AlertDescription>
                    </Alert>
                     <div>
                        <Label htmlFor="totalStandardTime">Total Standard Time (minutes)</Label>
                        <Input 
                          id="totalStandardTime" 
                          type="number"
                          step="0.01"
                          placeholder="Optional: overrides calculation"
                          value={productInfo.totalStandardTime || ''} 
                          onChange={(e) => setProductInfo({...productInfo, totalStandardTime: e.target.value })} 
                        />
                    </div>
                </div>

                <div className="space-y-4">
                     <h3 className="font-semibold text-lg">Team Assignment</h3>
                     <div>
                        <Label htmlFor="assignTeam">Assign Team</Label>
                        <Select onValueChange={handleTeamSelect} value={teamInfo.assignedTeamId}>
                            <SelectTrigger id="assignTeam">
                                <SelectValue placeholder="Select a team" />
                            </SelectTrigger>
                            <SelectContent>
                                {teams.map(team => (
                                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     </div>
                     {teamInfo.assignedTeamId && (
                         <Alert>
                            <Users className="h-4 w-4" />
                            <AlertTitle>{teamInfo.assignedTeamName}</AlertTitle>
                            <AlertDescription>
                                Team Member Count: {teamInfo.teamMemberCount}
                            </AlertDescription>
                        </Alert>
                     )}
                </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleNextStep}>
                Next: Build Blueprint <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Production Blueprint */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Production Blueprint</CardTitle>
            <CardDescription>
              Build the plan by creating sections, importing operations, and assigning operators. Drag and drop to reorder sections.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Total Standard Time</AlertTitle>
                <AlertDescription>
                    {productInfo.totalStandardTime ? `${productInfo.totalStandardTime} minutes (manual)` : `${calculatedTotalStandardTime} (calculated)`}
                </AlertDescription>
            </Alert>
            <div className="space-y-4">
              {isMounted ? (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="blueprint-sections" isDropDisabled={false}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                      {productionBlueprint.map((section, sectionIndex) => (
                        <Draggable key={section.sectionName + sectionIndex} draggableId={section.sectionName + sectionIndex} index={sectionIndex}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            >
                              <Card className={`overflow-hidden ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary' : 'shadow-sm'}`}>
                                <Accordion type="single" collapsible className="w-full" defaultValue={`item-${sectionIndex}`}>
                                  <AccordionItem value={`item-${sectionIndex}`} className="border-b-0">
                                    <div className="flex items-center bg-muted/50 border-b">
                                      <div {...provided.dragHandleProps} className="p-4 cursor-grab active:cursor-grabbing">
                                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                      <AccordionTrigger className="p-0 hover:no-underline flex-1 text-left cursor-pointer">
                                        <div className="p-4 flex-1">
                                            <Input
                                              value={section.sectionName}
                                              onChange={(e) => handleSectionNameChange(sectionIndex, e.target.value)}
                                              onClick={(e) => e.stopPropagation()}
                                              className="text-lg font-semibold border-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent h-auto p-0"
                                            />
                                            <span className="text-xs text-muted-foreground font-normal">
                                                {section.plannedOperations.length} ops &middot; {calculateSectionTime(section.plannedOperations).toFixed(2)} min/unit
                                            </span>
                                        </div>
                                      </AccordionTrigger>
                                      <div className="p-4">
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRemoveBlueprintSection(sectionIndex); }}>
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                    <AccordionContent className="p-4">
                                      <div className="space-y-4">
                                        <div>
                                          <h4 className="font-semibold mb-2">Assigned Operators</h4>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {section.assignedOperators.length > 0 ? (
                                              section.assignedOperators.map(op => (
                                                <Badge key={op.operatorId} variant="secondary">{op.operatorName}</Badge>
                                              ))
                                            ) : (
                                              <p className="text-sm text-muted-foreground">No operators assigned. (Available to all team members)</p>
                                            )}
                                            <Button variant="outline" size="sm" onClick={() => openAssignOpModal(sectionIndex)}>Assign Operators</Button>
                                          </div>
                                        </div>
                                        <div>
                                          <h4 className="font-semibold mb-2">Planned Operations</h4>
                                          <div className="border rounded-md">
                                            {section.plannedOperations.map((op, opIndex) => (
                                              <div key={opIndex} className="flex justify-between items-center p-2 border-b last:border-b-0">
                                                <div className="flex-1">
                                                  <p className="font-medium">{op.descripcion}</p>
                                                  <p className="text-sm text-muted-foreground">{op.maquina} - {op.tiempo} min</p>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveOperation(sectionIndex, opIndex)}>
                                                  <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                              </div>
                                            ))}
                                            {section.plannedOperations.length === 0 && (
                                              <p className="text-center p-4 text-sm text-muted-foreground">No operations imported.</p>
                                            )}
                                          </div>
                                          <Button variant="outline" size="sm" className="mt-2" onClick={() => openCatalogModal(sectionIndex)}>Import Operations</Button>
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              ) : (<div>Loading drag and drop...</div>)}
              {productionBlueprint.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground font-medium">Your blueprint is empty.</p>
                    <p className="text-muted-foreground text-sm">Add or import sections to begin.</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={openCustomSectionModal}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Section
                </Button>
                <Button variant="outline" onClick={() => setIsImportSectionsModalOpen(true)}>
                  <FileText className="mr-2 h-4 w-4" /> Import Sections from Catalog
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => setStep(1)}>
                 <ArrowLeft className="mr-2 h-4 w-4" /> Back to Product Info
              </Button>
              <Button onClick={handleCreateLagam} disabled={productionBlueprint.length === 0}>
                <Save className="mr-2 h-4 w-4" /> Create Lagam
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Catalog Modal to Import Operations */}
      <CatalogModal 
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        catalog={catalog}
        onImportOperations={handleImportOperations}
        title="Import Operations into Section"
        description="Select catalog sections to import their operations."
      />
      
      {/* Catalog Modal to Import Sections */}
      <CatalogModal
        isOpen={isImportSectionsModalOpen}
        onClose={() => setIsImportSectionsModalOpen(false)}
        catalog={catalog}
        onImportSections={handleImportSections}
        title="Import Blueprint Sections"
        description="Select entire sections to create new blueprint sections, or expand to select individual operations."
       />


      {/* Assign Operator Modal */}
      <AssignOperatorModal
        isOpen={isAssignOpModalOpen}
        onClose={() => setIsAssignOpModalOpen(false)}
        members={selectedTeamMembers}
        onAssign={handleAssignOperators}
        assignedOperatorIds={targetSectionIndex !== null ? productionBlueprint[targetSectionIndex].assignedOperators.map(op => op.operatorId) : []}
      />
      
      {/* Add Custom Section Modal */}
      <Dialog open={isCustomSectionModalOpen} onOpenChange={(isOpen) => { if (!isOpen) closeCustomSectionModal(); else setIsCustomSectionModalOpen(isOpen); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Custom Section</DialogTitle>
            <DialogDescription>
              Define a new section and its operations from scratch.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCustomSection} className="flex-grow overflow-y-auto">
            <div className="grid gap-6 p-1">
              <div className="space-y-2">
                <Label htmlFor="custom-section-name" className="text-base">
                  Section Name
                </Label>
                <Input
                  id="custom-section-name"
                  value={newCustomSection.sectionName || ''}
                  onChange={(e) => setNewCustomSection({ ...newCustomSection, sectionName: e.target.value })}
                  className="text-base"
                  required
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-base font-medium">Operations</h3>
                {newCustomSection.plannedOperations?.map((op, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_100px_auto] items-end gap-2 p-3 border rounded-md relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 text-muted-foreground"
                      onClick={() => removeCustomOperation(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div>
                      <Label htmlFor={`op-desc-${index}`} className="text-xs">Description</Label>
                      <Input id={`op-desc-${index}`} value={op.descripcion} onChange={(e) => handleCustomOperationChange(index, 'descripcion', e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor={`op-machine-${index}`} className="text-xs">Machine</Label>
                      <Input id={`op-machine-${index}`} value={op.maquina} onChange={(e) => handleCustomOperationChange(index, 'maquina', e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor={`op-time-${index}`} className="text-xs">Time (min)</Label>
                      <Input id={`op-time-${index}`} type="number" step="0.01" value={op.tiempo} onChange={(e) => handleCustomOperationChange(index, 'tiempo', e.target.value)} required />
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addCustomOperation}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Operation
                </Button>
              </div>
            </div>
            <DialogFooter className="mt-4 sticky bottom-0 bg-background pt-4">
              <Button type="button" variant="ghost" onClick={closeCustomSectionModal}>Cancel</Button>
              <Button type="submit">Save Section</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// --- Helper Modals ---

type Selection = Record<string, 'all' | 'indeterminate' | 'none' | Record<string, boolean>>;

interface CatalogModalProps {
    isOpen: boolean;
    onClose: () => void;
    catalog: CatalogSection[];
    onImportOperations?: (selected: Operation[]) => void;
    onImportSections?: (selected: ProductionBlueprintSection[]) => void;
    title: string;
    description: string;
}

function CatalogModal({ isOpen, onClose, catalog, onImportOperations, onImportSections, title, description }: CatalogModalProps) {
    const [selections, setSelections] = useState<Selection>({});

    const handleSectionCheck = (sectionName: string, checked: boolean | 'indeterminate') => {
        setSelections(prev => {
            const newSelections = { ...prev };
            if (checked) {
                const allOps: Record<string, boolean> = {};
                catalog.find(s => s.seccion === sectionName)?.operaciones.forEach(op => {
                    allOps[op.descripcion] = true;
                });
                newSelections[sectionName] = allOps;
            } else {
                delete newSelections[sectionName];
            }
            return newSelections;
        });
    };

    const handleOperationCheck = (sectionName: string, opDescription: string, checked: boolean) => {
        setSelections(prev => {
            const newSelections = { ...prev };
            const currentSectionSelection = newSelections[sectionName] && typeof newSelections[sectionName] === 'object' 
                ? { ...newSelections[sectionName] as Record<string, boolean> } 
                : {};
            
            if (checked) {
                currentSectionSelection[opDescription] = true;
            } else {
                delete currentSectionSelection[opDescription];
            }

            if (Object.keys(currentSectionSelection).length === 0) {
                 delete newSelections[sectionName];
            } else {
                newSelections[sectionName] = currentSectionSelection;
            }
            
            return newSelections;
        });
    };

    const getSectionState = (section: CatalogSection): {state: 'all' | 'indeterminate' | 'none', selectedCount: number} => {
        const selection = selections[section.seccion];
        if (!selection || typeof selection !== 'object') {
            return {state: 'none', selectedCount: 0};
        }
        const selectedCount = Object.keys(selection).length;
        if (selectedCount === 0) return {state: 'none', selectedCount: 0};
        if (selectedCount === section.operaciones.length) return {state: 'all', selectedCount};
        return {state: 'indeterminate', selectedCount};
    };

    const calculateSectionTime = (ops: Operation[]) => {
        return ops.reduce((total, op) => total + (Number(op.tiempo) || 0), 0).toFixed(2);
    };

    const handleImportClick = () => {
        const selectedOps: Operation[] = [];
        const blueprintSections: ProductionBlueprintSection[] = [];
        
        let partialOps: Operation[] = [];

        for (const sectionName in selections) {
            const section = catalog.find(s => s.seccion === sectionName);
            if (!section) continue;

            const selectionState = getSectionState(section);
            const selectionContent = selections[sectionName];

            const opsForSection = section.operaciones.filter(op => (selectionContent as Record<string, boolean>)?.[op.descripcion]);

            if (onImportOperations) {
                 selectedOps.push(...opsForSection);
            }

            if (onImportSections) {
                if (selectionState.state === 'all') {
                    blueprintSections.push({
                        sectionName: section.seccion,
                        assignedOperators: [],
                        plannedOperations: section.operaciones
                    });
                } else if (selectionState.state === 'indeterminate') {
                     partialOps.push(...opsForSection);
                }
            }
        }
        
        if (onImportSections) {
            if (partialOps.length > 0) {
                const existingCustomSection = blueprintSections.find(s => s.sectionName === 'Custom Section');
                if (existingCustomSection) {
                    const existingOps = new Set(existingCustomSection.plannedOperations.map(o => o.descripcion));
                    const newOps = partialOps.filter(o => !existingOps.has(o.descripcion));
                    existingCustomSection.plannedOperations.push(...newOps);
                } else {
                    blueprintSections.push({
                        sectionName: `Custom Section`,
                        assignedOperators: [],
                        plannedOperations: partialOps
                    });
                }
            }
            onImportSections(blueprintSections);
        }

        if(onImportOperations) {
            onImportOperations(selectedOps);
        }

        close();
    }

    const close = () => {
      setSelections({});
      onClose();
    }

    const isAnythingSelected = Object.keys(selections).length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] p-1">
                    <Accordion type="multiple" className="w-full">
                       {catalog.map(section => {
                           const { state, selectedCount } = getSectionState(section);
                           const isChecked = state === 'all' || state === 'indeterminate';
                           const isIndeterminate = state === 'indeterminate';

                           return (
                            <AccordionItem value={section.seccion} key={section.seccion}>
                               <div className="flex items-center space-x-3 p-2 border-b">
                                    <Checkbox 
                                        id={`s-select-${section.seccion}`}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => handleSectionCheck(section.seccion, !!checked)}
                                        aria-label={`Select section ${section.seccion}`}
                                        data-state={isIndeterminate ? 'indeterminate' : (isChecked ? 'checked' : 'unchecked')}
                                        className={isIndeterminate ? 'bg-primary/50 border-primary data-[state=checked]:bg-primary' : ''}
                                    />
                                    <AccordionTrigger className="py-0 flex-1 hover:no-underline [&[data-state=open]>svg]:ml-auto">
                                        <div className="flex justify-between items-center w-full">
                                            <Label htmlFor={`s-select-${section.seccion}`} className="font-medium cursor-pointer">{section.seccion}</Label>
                                            <div className="flex items-center gap-2">
                                                {isIndeterminate && <Badge variant="secondary">{selectedCount} selected</Badge>}
                                                <Badge variant="outline">{calculateSectionTime(section.operaciones)} min</Badge>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                               </div>
                               <AccordionContent>
                                   <div className="pl-10 py-2 space-y-2">
                                       {section.operaciones.map(op => (
                                           <div key={op.descripcion} className="flex items-center space-x-3">
                                               <Checkbox 
                                                    id={`op-select-${section.seccion}-${op.descripcion}`}
                                                    checked={!!(selections[section.seccion] as Record<string,boolean>)?.[op.descripcion]}
                                                    onCheckedChange={(checked) => handleOperationCheck(section.seccion, op.descripcion, !!checked)}
                                                />
                                                <Label htmlFor={`op-select-${section.seccion}-${op.descripcion}`} className="font-normal w-full cursor-pointer">
                                                    <div className="flex justify-between items-center">
                                                        <span>{op.descripcion}</span>
                                                        <span className="text-muted-foreground text-xs">{op.maquina} - {op.tiempo} min</span>
                                                    </div>
                                                </Label>
                                           </div>
                                       ))}
                                   </div>
                               </AccordionContent>
                            </AccordionItem>
                           )
                        })}
                    </Accordion>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={close}>Cancel</Button>
                    <Button onClick={handleImportClick} disabled={!isAnythingSelected}>
                        <FileText className="mr-2 h-4 w-4" /> Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface AssignOperatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    members: User[];
    onAssign: (selectedIds: string[]) => void;
    assignedOperatorIds: string[];
}

function AssignOperatorModal({ isOpen, onClose, members, onAssign, assignedOperatorIds }: AssignOperatorModalProps) {
    const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOpen) {
            const initialSelection: Record<string, boolean> = {};
            assignedOperatorIds.forEach(id => {
                initialSelection[id] = true;
            });
            setSelectedIds(initialSelection);
        }
    }, [isOpen, assignedOperatorIds]);
    
    const handleSelectMember = (memberId: string, isSelected: boolean) => {
        setSelectedIds(prev => ({...prev, [memberId]: isSelected}));
    }

    const handleAssignClick = () => {
        const idsToAssign = Object.keys(selectedIds).filter(id => selectedIds[id]);
        onAssign(idsToAssign);
        onClose();
    }
    
    // Filter to show only operators
    const operators = members.filter(m => m.role === 'Operator');

    return (
         <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Operators</DialogTitle>
                    <DialogDescription>Select operators from the team for this section.</DialogDescription>
                </DialogHeader>
                 <ScrollArea className="max-h-[60vh] p-1">
                    <div className="space-y-2">
                        {operators.map(member => (
                            <div key={member.id} className="flex items-center space-x-2 p-2 border rounded-md">
                                <Checkbox 
                                    id={`op-${member.id}`} 
                                    onCheckedChange={(checked) => handleSelectMember(member.id, !!checked)}
                                    checked={selectedIds[member.id] || false}
                                />
                                <Label htmlFor={`op-${member.id}`} className="font-medium">{member.name}</Label>
                            </div>
                        ))}
                         {operators.length === 0 && <p className="text-muted-foreground text-center">No operators in this team.</p>}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleAssignClick}>
                        <Users className="mr-2 h-4 w-4" /> Assign
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

    

    
    
