
export type User = {
  id: string;
  name: string;
  email?: string;
  password?: string;
  employeeId?: string;
  role: "Admin" | "Manager" | "Supervisor" | "Operator";
  avatarUrl?: string;
};

export type SizeQuantity = {
  size: string;
  quantity: number;
};

export type ProductionTask = {
  id:string;
  lagamId: string;
  sectionName: string;
  teamMemberId: string | null;
  quantity: number; // This will be the calculated total
  sizeQuantities: SizeQuantity[];
  quantityProduced?: number; // Calculated total produced
  sizeQuantitiesProduced?: SizeQuantity[];
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  estimatedTime: number; // in minutes
  actualTime: number | null; // in minutes
  date: string | null;
  timeSlot: string | null;
  operationStatus?: boolean[]; // status for each operation in the section
  downtime: number;
  performance: number;
};

export type Operation = {
  descripcion: string;
  maquina: string;
  tiempo: number;
};

export type CatalogSection = {
  seccion: string;
  operaciones: Operation[];
};

export type Team = {
  id: string;
  name: string;
  memberIds: string[];
};

// Lagam Hub Types
export type ProductInfo = {
  productName: string;
  productCode: string;
  sizes: SizeQuantity[];
  totalQuantity: number;
  totalStandardTime?: string;
};

export type LagamTeamInfo = {
  assignedTeamId: string;
  assignedTeamName: string;
  teamMemberCount: number;
  operatorCount?: number;
  managerName?: string;
};

export type AssignedOperator = {
  operatorId: string;
  operatorName: string;
};

export type PlannedOperation = {
  descripcion: string;
  maquina: string;
  tiempo: number;
};

export type ProductionBlueprintSection = {
  sectionName: string;
  assignedOperators: AssignedOperator[];
  plannedOperations: PlannedOperation[];
};

export type Lagam = {
  lagamId: string;
  productInfo: ProductInfo;
  teamInfo: LagamTeamInfo;
  productionBlueprint: ProductionBlueprintSection[];
  status: 'Draft' | 'Active' | 'Completed';
};

export type OperatorPerformance = {
  id: string;
  name: string;
  unitsProduced: number;
  stdTimeEarned: number;
  actualTime: number;
  performance: number;
  ole: number;
  avatarUrl?: string;
};

export type TeamPerformance = {
  id: string;
  name: string;
  unitsProduced: number;
  stdTimeEarned: number;
  actualTime: number;
  performance: number;
  ole: number;
  memberIds: string[];
};

export interface ILagam {
  lagamId: string;
  productInfo: IProductInfo;
  teamInfo: ILagamTeamInfo;
  productionBlueprint: IProductionBlueprintSection[];
  status: 'Draft' | 'Active' | 'Completed';
  
  // Methods
  updateStatus(newStatus: 'Draft' | 'Active' | 'Completed'): void;
  assignOperator(sectionName: string, operator: IAssignedOperator): void;
  getSection(sectionName: string): IProductionBlueprintSection | undefined;
  getTotalStandardTime(): number;
}

export interface IProductInfo {
  productName: string;
  productCode: string;
  sizes: ISizeQuantity[];
  totalQuantity: number;
}

export interface ILagamTeamInfo {
  assignedTeamId: string;
  assignedTeamName: string;
  teamMemberCount: number;
  operatorCount?: number;
  managerName?: string;
}

export interface IProductionBlueprintSection {
  sectionName: string;
  assignedOperators: IAssignedOperator[];
  plannedOperations: IPlannedOperation[];
}

export interface IAssignedOperator {
  operatorId: string;
  operatorName: string;
}

export interface IPlannedOperation {
  descripcion: string;
  maquina: string;
  tiempo: number;
}

export interface ISizeQuantity {
  size: string;
  quantity: number;
}

export type Post = {
  id: string;
  metrics: {
    views: number;
    likes: number;
    shares: number;
  };
  title: string;
  author: string;
};

export type SessionData = {
  isLoggedIn: boolean;
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Supervisor" | "Operator" | "";
};

export const defaultSession: SessionData = {
  isLoggedIn: false,
  id: "",
  name: "",
  email: "",
  role: "",
};
