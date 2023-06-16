export type AnnulusComponentData = {
  annulus_element_id?: string;
  barrier_diagram_id?: string;
  density?: number;
  name?: string;
  pressure?: number;
  scenario_id?: string;
  well_id?: string;
  wellbore_id?: string;
  mawop_value?: number;
  maasp_value?: number;
  mop_value?: number;
  maasp_location?: string;
  mawop_location?: string;
};

export type AnnulusLatestTestData = {
  mawop_value?: number;
  maasp_value?: number;
  mop_value?: number;
  maasp_location?: string;
  mawop_location?: string;
};

export type AnnulusData = {
  Annulus?: AnnulusComponentData[];
};

export type AnnulustestComponentData = {
  actions?: string;
  annulus_element_id?: string;
  barrier_diagram_id?: string;
  last_test_date?: string;
  pressure?: number;
  scenario_id?: string;
  test_type?: string;
  well_id?: string;
  wellbore_id?: string;
  location?: string;
};

export type AnnulustestData = {
  Annulustest?: AnnulustestComponentData[];
};

export type Assemblies = {
  Assembly?: Assembly[];
};

export type Assembly = {
  AssemblyID?: string;
  Component?: AssemblyComponent[];
  Jewellery?: string[];
  LocatedInsideID?: string;
  MinimumID?: string[];
  Retrievable?: string[];
  TvdAssemblyBase?: number;
  TvdAssemblyTop?: number;
  Umbilical?: string[];
  assemblySize?: number;
  isCasing?: boolean;
  mdAssemblyBase?: number;
  mdAssemblyTop?: number;
  name?: string;
  ref_id?: string;
  reference?: string;
};

export type AssemblyComponent = {
  ApproximateWeight?: number;
  BottomMD?: number;
  BurstPressure?: number;
  CollapsePressure?: number;
  CompType?: string;
  ComponentID?: string;
  FunctionTestPass?: string;
  GradeId?: string;
  ID?: number;
  ItemDescription?: string;
  Joints?: number;
  Length?: number;
  ActualLength?: number;
  Manufacturer?: string;
  MaximunHydraulics?: number;
  Model?: string;
  NominalPress?: number;
  OD?: number;
  PressRatingTop?: number;
  PressureTestAbove?: number;
  PressureTestBelow?: number;
  RecordClosePress?: number;
  RecordOpenPress?: number;
  SectType?: string;
  SectionDescription?: string;
  SectionName?: string;
  StartMD?: number;
  assemblyName?: string;
  barrier_from?: number;
  barrier_id?: string;
  barrier_to?: number;
  description?: string;
  include_seals?: boolean;
  is_barrier_closed_at_bottom?: boolean;
  is_barrier_closed_at_top?: boolean;
  ref_id?: string;
  reference?: string;
};

export type Attachment = {
  assembly_name?: string;
  attachment_date?: Date;
  attachment_id?: string;
  attachment_name?: string;
  date_report?: Date;
  entity_type?: string;
  event_id?: string;
  md_base?: number;
  md_top?: number;
  reason?: string;
  report_journal_id?: string;
  service?: string;
  well_id?: string;
  wellbore_id?: string;
};

export type BarrierData = {
  barrier_diagram_id?: string;
  barrier_element_id?: string;
  barrier_envelope_id?: string;
  barrier_id?: string;
  component_ovality?: number;
  component_wearing?: number;
  create_user?: string;
  details?: string;
  elementHistory?: HistoryEvaluation[];
  last_test_date?: Date;
  name?: string;
  ref_id?: string;
  scenario_id?: string;
  status?: string;
  type?: string;
};

export type BarrierDiagramData = {
  barrier_diagram_id?: string;
  diagram_date?: Date;
  scenario_id?: string;
  well_id?: string;
  wellbore_id?: string;
};

export type Bop = {
  bop_pressure_annular?: number;
  bop_pressure_rams_lower?: number;
  bop_pressure_rams_upper?: number;
  date_bop_test?: string;
};

export type Bops = {
  Bop?: Bop[];
};

export type Casing = {
  AssemblyID?: string;
  AssemblyName?: string;
  Barrier?: DepthBarrier[];
  Component?: CasingComponent[];
  Jewellery?: string[];
  Liner?: string;
  StringType?: string;
  TestCamp?: string;
  TvdAssemblyBase?: number;
  TvdAssemblyTop?: number;
  Umbilical?: string[];
  assemblySize?: number;
  barrier_id?: string;
  description?: string;
  index?: number;
  isCasing?: boolean;
  mdAssemblyBase?: number;
  mdAssemblyTop?: number;
  name?: string;
  ref_id?: string;
  reference?: string;
};

export type CasingComponent = {
  ApproxiWeight?: number;
  BottomMD?: number;
  BurstPressure?: number;
  CasingSectionDescription?: string;
  CasingSectionName?: string;
  CollapsePressure?: number;
  CompType?: string;
  ComponentID?: string;
  Grade?: string;
  GradeID?: string;
  ID?: number;
  JointCount?: number;
  Length?: number;
  Manufacturer?: string;
  Model?: string;
  OD?: number;
  PressRatingBottom?: number;
  PressRatingTop?: number;
  SectType?: string;
  SerialNo?: string;
  StartMD?: number;
  Stretchable?: boolean;
  barrier_from?: number;
  barrier_id?: string;
  barrier_to?: number;
  description?: string;
  ref_id?: string;
  reference?: string;
};

export type Casings = {
  Casing?: Casing[];
};

export type Catalog = {
  collapse_resistance?: number;
  grade?: string;
  internal_yield_press?: number;
  nominal_weight?: number;
  od_body?: number;
};

export type Catalogs = {
  Catalog?: Catalog[];
};

export type CementFluid = {
  datas?: string;
};

export type CementFluids = {
  CementFluid?: CementFluid[];
};

export type CementJobs = {
  CementStage?: CementStage[];
};

export type CementStage = {
  AssemID?: string;
  AssemblyID?: string;
  AssemblyName?: string;
  AssemblyOd?: number;
  Barrier?: DepthBarrier[];
  BottomMD?: number;
  BottomOfAssembly?: number;
  CasingIndex?: number;
  CasingTest?: number;
  CasingTestComment?: string;
  CasingTestDuration?: number;
  Color?: string;
  DateReport?: Date;
  Drilled?: boolean;
  LinerEnwNegTest?: number;
  LinerNegTestTool?: string;
  MinimumDiameter?: number;
  Plug?: boolean;
  PlugType?: string;
  TopMD?: number;
  Tvd_top?: number;
  barrier_id?: string;
  description?: string;
  jobReference?: string;
  ref_id?: string;
  reference?: string;
  stageName?: string;
};

export type Datum = {
  datum_elevation?: number;
  datum_id?: string;
  datum_name?: string;
  is_default?: string;
};

export type DepthBarrier = {
  barrier_id?: string;
  from?: number;
  to?: number;
};

export type Design = {
  name?: string;
  phase?: string;
  scenario_id?: string;
  well_id?: string;
  wellbore_id?: string;
  def_survey_header_id?: string;
};

export type Event = {
  date_ops_end?: Date;
  date_ops_start?: Date;
  event_code?: string;
  event_id?: string;
  event_objective_1?: string;
  well_id?: string;
};

export type Fluid = {
  Barrier?: DepthBarrier[];
  CasingIndex?: number;
  Color?: string;
  EndDepth?: number;
  FluidDensity?: number;
  FluidType?: string;
  InsideCasing?: boolean;
  InsideOpenHole?: boolean;
  InsideTubing?: boolean;
  RealEndDepth?: number;
  StartDepth?: number;
  TubingId?: string;
  description?: string;
  ref_id?: string;
};

export type Fluids = {
  Fluid?: Fluid[];
};

export type Gradient = {
  depthTVD?: number;
  emwValue?: number;
  pressureValue?: number;
};

export type HistoryEvaluation = {
  barrier_diagram_id?: string;
  barrier_element_id?: string;
  barrier_envelope_id?: string;
  create_user?: string;
  last_test_date?: string;
  status?: string;
};

export type HoleSectionComponent = {
  Diameter?: number;
  Length?: number;
  StartMD?: number;
  dateSectEnd?: string;
  name?: string;
  ref_id?: string;
  reference?: string;
  IntegrityTest: IntegrityTest[];
};

export type HoleSections = {
  HoleSection?: HoleSectionComponent[];
};

export type IntegrityTest = {
  date_test?: string;
  lot_md?: number;
  lot_tvd?: number;
  test_type?: string;
  weight_lot_emw?: number;
  weight_lot_amw?: number;
  lot_press?: number;
  total_bh_press?: number;
};

export type Lithology = {
  Formation?: LithologyFormation[];
};

export type LithologyFormation = {
  Base?: number;
  BaseTVD?: number;
  Label?: string;
  Lithology?: string;
  Top?: number;
  TopTVD?: number;
  BarrierDepth?: number;
  barrier_id?: string;
  comments?: string;
  description?: string;
  phase?: string;
  ref_id?: string;
  tests?: IntegrityTest[];
};

export type Log = {
  assembly_name?: string;
  comments?: string;
  log_date?: string;
  md_base?: number;
  md_top?: number;
  reason?: string;
  service?: string;
};

export type Logs = {
  Log?: Log[];
};

export type Obstructions = {
  Fish?: string[];
  HoldUpDepth?: string[];
};

export type Perforation = {
  EndMD?: number;
  Key?: string;
  StartMD?: number;
  Status?: string;
  name?: string;
  ref_id?: string;
};

export type Perforations = {
  Perforation?: Perforation[];
};

export type Query = {
  attachments?: Attachment[];
  barrierDiagrams?: BarrierDiagramData[];
  barriers?: BarrierData[];
  design?: Design;
  events?: Event[];
  well?: Well;
  wellSchematic?: WellSchematic;
  wellbore?: Wellbore;
};

export type ReferenceDepths = {
  AirGap?: number;
  DatumElevation?: number;
  Mudline?: number;
  Offshore?: boolean;
  SystemDatum?: string;
  WaterDepth?: number;
  WellheadDepth?: number;
};

export type SidetrackCutoffs = {
  Sidetrack?: string[];
};

export type Stimulations = {
  BridgePlug?: string[];
  Stimulation?: string[];
};

export type Survey = {
  Station?: SurveyStation[];
};

export type SurveyStation = {
  Azi?: number;
  Ew?: number;
  Inc?: number;
  Md?: number;
  Ns?: number;
  Tvd?: number;
};

export type Units = {
  DepthDP?: number;
  DepthUnits?: string;
  DiameterDP?: number;
  DiameterUnits?: string;
  LengthDP?: number;
  LengthUnits?: string;
};

export type Well = {
  datums?: Datum[];
  well_common_name?: string;
  well_id?: string;
  well_legal_name?: string;
};

export type WellSchematic = {
  AnnulusData?: AnnulusData;
  AnnulustestData?: AnnulustestData;
  Assemblies?: Assemblies;
  Bops?: Bops;
  Casings?: Casings;
  Catalogs?: Catalogs;
  CementFluids?: CementFluids;
  CementJobs?: CementJobs;
  Fluids?: Fluids;
  FractureGradient?: Gradient[];
  HoleSections?: HoleSections;
  Lithology?: Lithology;
  Logs?: Logs;
  Obstructions?: Obstructions;
  Perforations?: Perforations;
  PorePressureGradient?: Gradient[];
  ReferenceDepths?: ReferenceDepths;
  SidetrackCutoffs?: SidetrackCutoffs;
  Stimulations?: Stimulations;
  Survey?: Survey;
  Units?: Units;
  WellboreFPGradient?: WellboreGradient[];
  WellborePPGradient?: WellboreGradient[];
  WellboreTGradient?: WellboreGradient[];
  Wellhead?: Wellhead;
  DerratingData?: DerratingData[];
};

export type DerratingData = {
  pressure_survey_id: string;
  trapped_volume_id: string;
  final_load_simm_id: string;
  assembly_name: string;
  sequence_no: number;
  casing_od: number;
  top_interval: number;
  base_interval: number;
  wear: number;
  ovality: number;
  nom_burst_pressure: number;
  nom_collapse_pressure: number;
  calc_burst_pressure: number;
  calc_collapse_pressure: number;
  comments: string;
};

export type Wellbore = {
  well_id?: string;
  wellbore_id?: string;
  wellbore_name?: string;
};

export type WellboreGradient = {
  depth_md?: number;
  depth_tvd?: number;
  formationname?: string;
  value?: number;
};

export type Wellhead = {
  AnnularPressure?: WellheadAnnularPressure[];
  Component?: WellheadComponent[];
};

export type WellheadAnnularPressure = {
  PressureRelief?: WellheadPressureRelief[];
  annulus?: string;
  comments?: string;
  pressure?: number;
  sequence_no?: string;
  test_date?: Date;
};

export type WellheadComponent = {
  Color?: string;
  CompType?: string;
  Hanger?: WellheadHanger[];
  Manufacturer?: string;
  Model?: string;
  Outlet?: WellheadOutlet[];
  SectType?: string;
  TopPresRating?: number;
  barrier_id?: string;
  comments?: string;
  description?: string;
  installDate?: string;
  ref_id?: string;
  reference?: string;
  removalDate?: string;
  test_duration?: number;
  test_pressure?: number;
  test_result?: string;
  wellheadReference?: string;
  wellhead_section?: string;
  is_barrier_closed?: boolean;
  include_seals?: boolean;
};

export type WellheadHanger = {
  CompType?: string;
  Model?: string;
  SectType?: string;
  Size?: number;
  barrier_id?: string;
  description?: string;
  include_seals?: boolean;
  is_barrier_closed?: boolean;
  ref_id?: string;
  reference?: string;
};

export type WellheadOutlet = {
  CompType?: string;
  Location?: string;
  Manufacturer?: string;
  Model?: string;
  OutletWorkingPress?: string;
  SectType?: string;
  barrier_id?: string;
  description?: string;
  include_seals?: boolean;
  is_barrier_closed?: boolean;
  ref_id?: string;
  reference?: string;
  test_duration?: number;
  test_pressure?: number;
  test_result?: string;
  wellhead_section?: string;
};

export type WellheadPressureRelief = {
  annulus?: string;
  comments?: string;
  drain_date?: Date;
  drained_fluid_type?: string;
  drained_press_from?: number;
  drained_press_to?: number;
  drained_volume?: number;
  estimated_fluid_level?: string;
  fluid_density?: number;
  fluid_level?: number;
  max_press?: number;
  sequence_no?: string;
};
