
import { CircuitComponent, Wire } from '../types';

export type CircuitTopology = 'OPEN' | 'SERIES' | 'PARALLEL' | 'SHORT' | 'COMPLEX' | 'EMPTY';

export interface TopologyResult {
  type: CircuitTopology;
  loops: number;
  branches: number;
  feedback: string;
  isValid: boolean;
}

export function analyzeTopology(components: CircuitComponent[], wires: Wire[]): TopologyResult {
  if (components.length === 0) {
    return { type: 'EMPTY', loops: 0, branches: 0, feedback: "画布为空，请添加元件。", isValid: false };
  }

  // 1. Build Graph
  const adj = new Map<string, string[]>(); // ComponentID -> Connected ComponentIDs
  
  const addEdge = (id1: string, id2: string) => {
    if (!adj.has(id1)) adj.set(id1, []);
    if (!adj.has(id2)) adj.set(id2, []);
    if (!adj.get(id1)!.includes(id2)) adj.get(id1)!.push(id2);
    if (!adj.get(id2)!.includes(id1)) adj.get(id2)!.push(id1);
  };

  wires.forEach(w => addEdge(w.sourceComponentId, w.targetComponentId));

  // 2. Check for Short Circuit (Power directly connected to Power)
  const batteries = components.filter(c => c.type === 'BATTERY');
  let isShort = false;
  
  // Simple check: is there a path between battery terminals with 0 resistance? 
  // This is complex, simplified here to check if loops exist without loads.
  // We rely on the solver.ts for the actual short circuit 'Error' state usually,
  // here we look for structural topology.

  // 3. Count Loops (Fundamental Cycles)
  // A simplified approach: Euler characteristic for planar graphs? 
  // V - E + F = 2 (or 1 + C).  Loops = E - V + 1 (for 1 component).
  // This is tricky with multi-pin components.
  
  // Let's use a Path Finding approach to detect branching.
  
  // Filter out wires, just look at components as nodes.
  const validComps = components.filter(c => c.type !== 'WIRE'); // Treat wires as edges merge
  // Actually our model has explicit wires.
  
  // Let's count junction nodes (nodes with degree > 2).
  const nodeDegree = new Map<string, number>();
  
  // We need to map Component Pins to structural nodes.
  // Pin ID = "CompID_PinIndex"
  const pinGroups = new Map<string, number>();
  let groupCounter = 0;
  
  const getPinKey = (cId: string, pinIdx: number) => `${cId}_${pinIdx}`;
  
  // Initialize disjoint set for pins connected by wires
  const parent = new Map<string, string>();
  const find = (i: string): string => {
      if (!parent.has(i)) parent.set(i, i);
      if (parent.get(i) === i) return i;
      const root = find(parent.get(i)!);
      parent.set(i, root);
      return root;
  };
  const union = (i: string, j: string) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) parent.set(rootI, rootJ);
  };

  wires.forEach(w => {
      union(getPinKey(w.sourceComponentId, w.sourcePinIndex), getPinKey(w.targetComponentId, w.targetPinIndex));
  });

  // Count degrees of electrical nodes (groups of pins)
  const electricalNodes = new Map<string, number>(); // RootPin -> Degree (number of components connected)
  
  components.forEach(c => {
      const root0 = find(getPinKey(c.id, 0));
      const root1 = find(getPinKey(c.id, 1));
      
      electricalNodes.set(root0, (electricalNodes.get(root0) || 0) + 1);
      electricalNodes.set(root1, (electricalNodes.get(root1) || 0) + 1);
  });

  let junctions = 0;
  electricalNodes.forEach(degree => {
      if (degree > 2) junctions++;
  });

  // Determine Type
  const hasPower = batteries.length > 0;
  const hasLoad = components.some(c => ['BULB', 'RESISTOR', 'RHEOSTAT'].includes(c.type));
  
  // This logic is heuristic
  if (!hasPower) return { type: 'OPEN', loops: 0, branches: 0, feedback: "缺少电源。", isValid: false };
  if (!hasLoad) return { type: 'SHORT', loops: 1, branches: 0, feedback: "缺少用电器，构成短路！", isValid: false };

  if (junctions === 0) {
      // Single loop or open line
      // Check if closed
      // If simplified degrees are all 2, it's a loop.
      const degrees = Array.from(electricalNodes.values());
      const isClosed = degrees.every(d => d >= 2) && degrees.length > 0;
      
      if (isClosed) {
          return { type: 'SERIES', loops: 1, branches: 0, feedback: "这是一个串联电路。", isValid: true };
      } else {
          return { type: 'OPEN', loops: 0, branches: 0, feedback: "电路未闭合。", isValid: false };
      }
  } else {
      // Has junctions -> Parallel or Complex
      return { type: 'PARALLEL', loops: junctions, branches: junctions, feedback: "这是一个并联或混联电路。", isValid: true };
  }
}
