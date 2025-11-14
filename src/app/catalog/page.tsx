
"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, MoreHorizontal, Edit, Trash2, X } from "lucide-react";
import type { CatalogSection, Operation } from "@/lib/types";
import PageHeader from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";


export default function CatalogPage() {
  const [sections, setSections] = useState<CatalogSection[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [isSectionFormOpen, setIsSectionFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const [currentSection, setCurrentSection] = useState<Partial<CatalogSection>>({ seccion: '', operaciones: [] });
  const [editingSection, setEditingSection] = useState<CatalogSection | null>(null);
  
  const [itemToDelete, setItemToDelete] = useState<{type: 'section' | 'operation', sectionName: string, opDescription?: string} | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/catalog');
        if (!response.ok) throw new Error('Failed to fetch catalog');
        const data = await response.json();
        setSections(data);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast({
          variant: "destructive",
          title: "Failed to load catalog",
          description: (error as Error).message || "There was a problem fetching the product catalog.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const saveSections = async (updatedSections: CatalogSection[]) => {
     try {
      const response = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSections),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save catalog');
      }
      setSections(updatedSections);
      return true;
    } catch (error) {
      toast({ variant: "destructive", title: 'Error saving catalog', description: (error as Error).message });
      return false;
    }
  }


  const getTotalTime = (operaciones: Operation[]) => {
    return operaciones.reduce((total, op) => total + (Number(op.tiempo) || 0), 0).toFixed(2);
  };
  
  const handleSaveSection = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentSection.seccion) return;

    let updatedSections;
    if (editingSection) {
      updatedSections = sections.map(sec => 
        sec.seccion === editingSection.seccion 
        ? { ...currentSection, seccion: currentSection.seccion, operaciones: currentSection.operaciones || [] } as CatalogSection 
        : sec
      );
    } else {
       if (sections.some(sec => sec.seccion === currentSection.seccion)) {
        toast({ variant: "destructive", title: 'Error', description: 'A section with this name already exists.' });
        return;
      }
      const newSection: CatalogSection = {
        seccion: currentSection.seccion,
        operaciones: currentSection.operaciones || [],
      };
      updatedSections = [...sections, newSection];
    }
    
    const success = await saveSections(updatedSections);
    if (success) {
        toast({ title: `Section ${editingSection ? 'updated' : 'created'} successfully.` });
        closeSectionForm();
    }
  };

  const closeSectionForm = () => {
    setIsSectionFormOpen(false);
    setEditingSection(null);
    setCurrentSection({ seccion: '', operaciones: [] });
  }

  const handleOperationChange = (index: number, field: keyof Operation, value: string | number) => {
    const newOps = [...(currentSection.operaciones || [])];
    const op = { ...newOps[index] };
    if (field === 'tiempo') {
        op[field] = Number(value);
    } else {
        op[field] = value as string;
    }
    newOps[index] = op;
    setCurrentSection({ ...currentSection, operaciones: newOps });
  };
  
  const addOperationToSection = () => {
    const newOps = [...(currentSection.operaciones || []), { descripcion: '', maquina: '', tiempo: 0 }];
    setCurrentSection({ ...currentSection, operaciones: newOps });
  };

  const removeOperationFromSection = (index: number) => {
    const newOps = [...(currentSection.operaciones || [])];
    newOps.splice(index, 1);
    setCurrentSection({ ...currentSection, operaciones: newOps });
  };
  
  const openEditSectionDialog = (section: CatalogSection) => {
    setEditingSection(section);
    setCurrentSection(JSON.parse(JSON.stringify(section))); // Deep copy
    setIsSectionFormOpen(true);
  };

  const openNewSectionDialog = () => {
    setEditingSection(null);
    setCurrentSection({ seccion: '', operaciones: [{ descripcion: '', maquina: '', tiempo: 0 }] });
    setIsSectionFormOpen(true);
  }

  const openDeleteConfirm = (type: 'section' | 'operation', sectionName: string, opDescription?: string) => {
    setItemToDelete({ type, sectionName, opDescription });
    setIsConfirmOpen(true);
  };
  
  const handleDelete = async () => {
    if (!itemToDelete) return;

    let updatedSections;
    if(itemToDelete.type === 'section') {
        updatedSections = sections.filter(sec => sec.seccion !== itemToDelete.sectionName);
    } else if (itemToDelete.type === 'operation' && itemToDelete.opDescription) {
        const { sectionName, opDescription } = itemToDelete;
        updatedSections = sections.map(s => {
          if (s.seccion === sectionName) {
            const updatedOps = s.operaciones.filter(op => op.descripcion !== opDescription);
            return { ...s, operaciones: updatedOps };
          }
          return s;
        });
    }
    
    if (updatedSections) {
        const success = await saveSections(updatedSections);
        if(success) {
            toast({ title: `${itemToDelete.type === 'section' ? 'Section' : 'Operation'} deleted successfully.` });
        }
    }

    setIsConfirmOpen(false);
    setItemToDelete(null);
  };
  
  const handleEditOperation = (section: CatalogSection, operation: Operation) => {
     setEditingSection(section);
     setCurrentSection(JSON.parse(JSON.stringify(section))); // Deep copy
     setIsSectionFormOpen(true);
  }

  const handleDeleteOperation = (sectionName: string, opDescription: string) => {
    openDeleteConfirm('operation', sectionName, opDescription);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading catalog...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Product Catalog"
          description="Manage your products and their standard production times."
        />
        <Button onClick={openNewSectionDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Section
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Accordion type="single" collapsible className="w-full">
            {sections.map((section) => (
              <AccordionItem value={section.seccion} key={section.seccion}>
                <div className="flex w-full items-center justify-between pr-4 border-b">
                    <AccordionTrigger className="flex-1 text-left py-4 font-medium hover:no-underline">
                        <span className="font-medium text-left">{section.seccion}</span>
                    </AccordionTrigger>
                    <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm text-muted-foreground">
                            Total Time: {getTotalTime(section.operaciones)} min
                        </span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditSectionDialog(section)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Section
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openDeleteConfirm('section', section.seccion)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Section
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </div>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Operation Description</TableHead>
                        <TableHead>Machine</TableHead>
                        <TableHead className="text-right">Time (min)</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.operaciones.map((op, index) => (
                        <TableRow key={`${op.descripcion}-${index}`}>
                          <TableCell>{op.descripcion}</TableCell>
                          <TableCell>{op.maquina}</TableCell>
                          <TableCell className="text-right">{op.tiempo.toFixed(2)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditOperation(section, op)}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteOperation(section.seccion, op.descripcion)} className="text-destructive">
                                   <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                       {section.operaciones.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No operations in this section.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
             {sections.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No sections found. Add a new section to get started.
                </div>
              )}
          </Accordion>
        </CardContent>
      </Card>
      
      <Dialog open={isSectionFormOpen} onOpenChange={(isOpen) => { if (!isOpen) closeSectionForm(); else setIsSectionFormOpen(isOpen); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingSection ? 'Edit' : 'Add New'} Section</DialogTitle>
            <DialogDescription>
              {editingSection ? 'Update the section name and its operations.' : 'Enter the name for the new section and add its operations.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSection} className="flex-grow overflow-y-auto">
            <div className="grid gap-6 p-1">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base">
                  Section Name
                </Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={currentSection.seccion || ''}
                  onChange={(e) => setCurrentSection({ ...currentSection, seccion: e.target.value })}
                  className="text-base"
                  required 
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-medium">Operations</h3>
                {currentSection.operaciones?.map((op, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_100px_auto] items-end gap-2 p-3 border rounded-md relative">
                     <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-1 right-1 h-6 w-6 text-muted-foreground"
                        onClick={() => removeOperationFromSection(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    <div>
                      <Label htmlFor={`op-desc-${index}`} className="text-xs">Description</Label>
                      <Input id={`op-desc-${index}`} value={op.descripcion} onChange={(e) => handleOperationChange(index, 'descripcion', e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor={`op-machine-${index}`} className="text-xs">Machine</Label>
                      <Input id={`op-machine-${index}`} value={op.maquina} onChange={(e) => handleOperationChange(index, 'maquina', e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor={`op-time-${index}`} className="text-xs">Time (min)</Label>
                      <Input id={`op-time-${index}`} type="number" step="0.01" value={op.tiempo} onChange={(e) => handleOperationChange(index, 'tiempo', e.target.value)} required />
                    </div>
                  </div>
                ))}
                 <Button type="button" variant="outline" onClick={addOperationToSection}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Operation
                </Button>
              </div>
            </div>
             <DialogFooter className="mt-4 sticky bottom-0 bg-background pt-4">
              <Button type="button" variant="ghost" onClick={closeSectionForm}>Cancel</Button>
              <Button type="submit">Save Section</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
        
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the {itemToDelete?.type}.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    