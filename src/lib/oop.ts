
import { 
    ILagam, 
    IProductInfo, 
    ILagamTeamInfo, 
    IProductionBlueprintSection, 
    IAssignedOperator, 
    IPlannedOperation, 
    ISizeQuantity 
} from './types';

export class Lagam implements ILagam {
    lagamId: string;
    productInfo: IProductInfo;
    teamInfo: ILagamTeamInfo;
    productionBlueprint: IProductionBlueprintSection[];
    status: 'Draft' | 'Active' | 'Completed';

    constructor(data: ILagam) {
        this.lagamId = data.lagamId;
        this.productInfo = data.productInfo;
        this.teamInfo = data.teamInfo;
        this.productionBlueprint = data.productionBlueprint;
        this.status = data.status;
    }

    updateStatus(newStatus: 'Draft' | 'Active' | 'Completed'): void {
        this.status = newStatus;
        // Here you would typically also save this change to your database
        console.log(`Lagam ${this.lagamId} status updated to ${this.status}`);
    }

    assignOperator(sectionName: string, operator: IAssignedOperator): void {
        const section = this.getSection(sectionName);
        if (section) {
            section.assignedOperators.push(operator);
            // Logic to save the updated section
            console.log(`Operator ${operator.operatorName} assigned to section ${sectionName}`);
        } else {
            console.error(`Section ${sectionName} not found`);
        }
    }

    getSection(sectionName: string): IProductionBlueprintSection | undefined {
        return this.productionBlueprint.find(s => s.sectionName === sectionName);
    }

    getTotalStandardTime(): number {
        return this.productionBlueprint.reduce((total, section) => {
            return total + section.plannedOperations.reduce((sectionTotal, op) => {
                return sectionTotal + op.tiempo;
            }, 0);
        }, 0);
    }

    // Example of how you might create a new Lagam from raw data
    static fromJson(json: string): Lagam {
        const data: ILagam = JSON.parse(json);
        // You could add validation here to ensure the JSON is in the correct format
        return new Lagam(data);
    }
}
