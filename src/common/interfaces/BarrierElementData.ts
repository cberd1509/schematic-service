export interface BarrierElementData{
    well_id:string;
    wellbore_id:string;
    barrier_envelope_id:string;
    barrier_element_id:string;
    wellhead_id?:string;
    wellhead_comp_id?:string;
    wellhead_outlet_id?:string;
    assembly_id?:string;
    assembly_comp_id?:string;
    is_closed?:boolean;
    is_closed_top?:boolean;
    is_closed_bottom?:boolean;
    include_seals?:boolean;
    cement_job_id?:string;
    cement_stage_id?:string;
    top_depth?:number;
    base_depth?:number;
    wellbore_formation_id?:string;
    completion_id?:string;
    completion_fluid_id?:string;
    name?:string;
    wellhead_hanger_id?:string;
    barrier_diagram_id?:string;
    component_ovality?:number;
    component_wearing?:number;
    element_type?:string;
    evaluation?:string;
    evaluation_comments?:string;
    ref_id:string;
    scenario_id:string;
}