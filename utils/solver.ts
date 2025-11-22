import { CircuitComponent, Wire } from '../types';

// Gaussian elimination solver
function solveLinearSystem(matrix: number[][], rhs: number[]): number[] | null {
  const n = matrix.length;
  if (n === 0) return [];

  // Forward elimination
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(matrix[j][i]) > Math.abs(matrix[pivot][i])) {
        pivot = j;
      }
    }

    // Singular matrix check
    if (Math.abs(matrix[pivot][i]) < 1e-9) return null; 

    // Swap rows
    [matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]];
    [rhs[i], rhs[pivot]] = [rhs[pivot], rhs[i]];

    for (let j = i + 1; j < n; j++) {
      const factor = matrix[j][i] / matrix[i][i];
      for (let k = i; k < n; k++) {
        matrix[j][k] -= factor * matrix[i][k];
      }
      rhs[j] -= factor * rhs[i];
    }
  }

  // Back substitution
  const result = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += matrix[i][j] * result[j];
    }
    result[i] = (rhs[i] - sum) / matrix[i][i];
  }
  return result;
}

export function solveCircuit(components: CircuitComponent[], wires: Wire[]): { 
  components: CircuitComponent[], 
  error?: string 
} {
  // 1. Node Identification
  const pinToNodeMap = new Map<string, number>();
  const adj = new Map<string, string[]>();
  
  components.forEach(c => {
    adj.set(`${c.id}_0`, []);
    adj.set(`${c.id}_1`, []);
  });

  wires.forEach(w => {
    const p1 = `${w.sourceComponentId}_${w.sourcePinIndex}`;
    const p2 = `${w.targetComponentId}_${w.targetPinIndex}`;
    if(adj.has(p1)) adj.get(p1)?.push(p2);
    if(adj.has(p2)) adj.get(p2)?.push(p1);
  });

  const visited = new Set<string>();
  const groups: string[][] = [];

  for (const startPin of adj.keys()) {
    if (!visited.has(startPin)) {
      const group: string[] = [];
      const queue = [startPin];
      visited.add(startPin);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        group.push(curr);
        for (const neighbor of adj.get(curr) || []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      groups.push(group);
    }
  }

  // Assign ground (Node 0) - Try negative terminal of first battery
  let groundNodeIndex = -1;
  const batteries = components.filter(c => c.type === 'BATTERY');
  if (batteries.length > 0) {
    const gPin = `${batteries[0].id}_1`;
    groundNodeIndex = groups.findIndex(g => g.includes(gPin));
  }
  if (groundNodeIndex === -1) groundNodeIndex = 0;

  groups.forEach((group, idx) => {
    const nodeId = (idx === groundNodeIndex) ? 0 : (idx < groundNodeIndex ? idx + 1 : idx);
    group.forEach(pin => pinToNodeMap.set(pin, nodeId));
  });

  const numVoltageNodes = groups.length - 1;
  if (numVoltageNodes < 0) return { components, error: undefined }; 

  // 2. MNA Setup
  const voltageSources = components.filter(c => c.type === 'BATTERY');
  const m = voltageSources.length;
  const size = numVoltageNodes + m;
  
  const G = Array(size).fill(0).map(() => Array(size).fill(0));
  const B = Array(size).fill(0);

  const addConductance = (n1: number, n2: number, g: number) => {
    if (n1 > 0) G[n1-1][n1-1] += g;
    if (n2 > 0) G[n2-1][n2-1] += g;
    if (n1 > 0 && n2 > 0) {
      G[n1-1][n2-1] -= g;
      G[n2-1][n1-1] -= g;
    }
  };

  // Process Components
  components.forEach(c => {
    if (c.type === 'VOLTMETER') return; // Ideal voltmeter (Infinite resistance)
    if (c.type === 'BATTERY') return; // Handled as source

    const n1 = pinToNodeMap.get(`${c.id}_0`);
    const n2 = pinToNodeMap.get(`${c.id}_1`);

    if (n1 !== undefined && n2 !== undefined) {
      let r = Infinity;

      if (c.type === 'RESISTOR') r = Math.max(0.001, c.value);
      else if (c.type === 'RHEOSTAT') r = Math.max(0.1, c.value); // Avoid 0
      else if (c.type === 'BULB') r = 10; // Simplified constant resistance
      else if (c.type === 'AMMETER') r = 0.01; // Low resistance
      else if (c.type === 'SWITCH') r = c.isOpen ? Infinity : 0.001; // Contact resistance

      if (r !== Infinity) {
        addConductance(n1, n2, 1/r);
      }
    }
  });

  // Process Voltage Sources
  voltageSources.forEach((c, idx) => {
    const n1 = pinToNodeMap.get(`${c.id}_0`); // Positive
    const n2 = pinToNodeMap.get(`${c.id}_1`); // Negative
    const row = numVoltageNodes + idx;
    
    // V_n1 - V_n2 = Voltage
    if (n1 !== undefined && n1 > 0) G[row][n1-1] = 1;
    if (n2 !== undefined && n2 > 0) G[row][n2-1] = -1;
    
    if (n1 !== undefined && n1 > 0) G[n1-1][row] = 1;
    if (n2 !== undefined && n2 > 0) G[n2-1][row] = -1;

    B[row] = c.value;
  });

  // 3. Solve
  const solution = solveLinearSystem(G, B);

  if (!solution) {
    return { 
        components: components.map(c => ({ ...c, current: 0, voltageDrop: 0 })), 
        error: "电路断路或连接异常" 
    };
  }

  // 4. Extract Results
  const getVoltage = (node: number) => (node === 0 ? 0 : solution[node - 1]);

  let maxCurrent = 0;

  const newComponents = components.map(c => {
    const n1 = pinToNodeMap.get(`${c.id}_0`);
    const n2 = pinToNodeMap.get(`${c.id}_1`);
    
    if (n1 === undefined || n2 === undefined) return { ...c, current: 0, voltageDrop: 0 };

    const v1 = getVoltage(n1);
    const v2 = getVoltage(n2);
    const vDrop = v1 - v2;
    let current = 0;

    if (c.type === 'BATTERY') {
        const srcIdx = voltageSources.findIndex(s => s.id === c.id);
        // MNA current variable for voltage source is usually I_leaving_pos
        if (srcIdx !== -1) current = solution[numVoltageNodes + srcIdx];
    } else {
        let r = Infinity;
        if (c.type === 'RESISTOR') r = Math.max(0.001, c.value);
        else if (c.type === 'RHEOSTAT') r = Math.max(0.1, c.value);
        else if (c.type === 'BULB') r = 10;
        else if (c.type === 'AMMETER') r = 0.01;
        else if (c.type === 'SWITCH') r = c.isOpen ? Infinity : 0.001;

        if (r !== Infinity) current = vDrop / r;
    }
    
    if (Math.abs(current) > maxCurrent) maxCurrent = Math.abs(current);

    return {
      ...c,
      voltageDrop: vDrop,
      current: current
    };
  });

  let errorStr = undefined;
  if (maxCurrent > 15) {
      errorStr = "警告：电路短路！电流过大！";
  }

  return { components: newComponents, error: errorStr };
}