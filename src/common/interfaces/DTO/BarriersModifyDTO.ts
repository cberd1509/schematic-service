export interface BarriersModifyDTO {
  barrier_modify_data: BarrierModifyData[];
  scenario_id: string;
  wellbore_id: string;
  well_id: string;
  schematic_date: Date;
}

export interface BarrierModifyData {
  barrier: string;
  elementType: string;
  eventRefId: string;
  top?: number;
  base?: number;
}
