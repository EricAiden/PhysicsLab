import { CircuitComponent, Wire, ComponentType } from '../types';

interface AIComponent {
  id: string;
  type: string; // AI might return uppercase or lowercase
  row: number;
  col: number;
}

interface AIConnection {
  source: string;
  target: string;
}

interface AIResponse {
  components: AIComponent[];
  connections: AIConnection[];
}

const GRID_SIZE_X = 150;
const GRID_SIZE_Y = 120;
const OFFSET_X = 150;
const OFFSET_Y = 100;

export function convertLayoutToState(data: AIResponse): { components: CircuitComponent[], wires: Wire[] } {
  const components: CircuitComponent[] = [];
  const wires: Wire[] = [];
  
  // 1. Map Components
  data.components.forEach(c => {
    // Normalize Type
    let type: ComponentType = 'RESISTOR'; // Fallback
    const rawType = c.type.toUpperCase();
    
    if (rawType.includes('BATTERY') || rawType.includes('SOURCE') || rawType.includes('POWER')) type = 'BATTERY';
    else if (rawType.includes('RHEOSTAT') || rawType.includes('VARIABLE')) type = 'RHEOSTAT';
    else if (rawType.includes('BULB') || rawType.includes('LAMP') || rawType.includes('LIGHT')) type = 'BULB';
    else if (rawType.includes('SWITCH') || rawType.includes('KEY')) type = 'SWITCH';
    else if (rawType.includes('AMMETER')) type = 'AMMETER';
    else if (rawType.includes('VOLT')) type = 'VOLTMETER';
    else if (rawType.includes('RESISTOR')) type = 'RESISTOR';

    const comp: CircuitComponent = {
      id: c.id, // Keep AI ID for wiring map, replace later if needed
      type: type,
      x: OFFSET_X + c.col * GRID_SIZE_X,
      y: OFFSET_Y + c.row * GRID_SIZE_Y,
      rotation: 0,
      value: type === 'BATTERY' ? 12 : (type === 'RESISTOR' || type === 'RHEOSTAT' ? 10 : 0),
      label: `${type.substring(0, 1)}${components.length + 1}`,
      isOpen: type === 'SWITCH' ? true : undefined
    };
    
    // Auto-rotate based on grid position relative to center or neighbors could be added here
    // For now, default 0 is horizontal. Vertical wires will handle the rest.
    
    components.push(comp);
  });

  // 2. Map Wires
  // We need to manage pins. Each component roughly has Pin 0 (Left) and Pin 1 (Right).
  // We will assign pins greedily.
  const pinUsage = new Map<string, number>(); // "compId_pinIdx" -> count

  data.connections.forEach((conn, idx) => {
    const sourceComp = components.find(c => c.id === conn.source);
    const targetComp = components.find(c => c.id === conn.target);

    if (sourceComp && targetComp) {
       // Simple heuristic: Connect Right pin of Source to Left pin of Target if Source is to the left
       // Else flip.
       
       let sPin = 1;
       let tPin = 0;

       // Adjust based on relative position
       if (sourceComp.x > targetComp.x) { sPin = 0; tPin = 1; }
       
       // Vertical stacking logic?
       if (Math.abs(sourceComp.x - targetComp.x) < 50 && sourceComp.y < targetComp.y) {
           // Source is above Target
           // Rotate them? 
           // For simplicity, just wire blindly. The solver allows any connection.
           // Better: Rotate vertical components.
       }

       // Auto-rotate Vertical components
       // If a component is surrounded vertically, rotate 90.
       
       wires.push({
         id: `wire_${idx}`,
         sourceComponentId: sourceComp.id,
         sourcePinIndex: sPin,
         targetComponentId: targetComp.id,
         targetPinIndex: tPin
       });
    }
  });

  // Post-process: Improve Rotations
  components.forEach(c => {
      // Find connected wires
      const connectedWires = wires.filter(w => w.sourceComponentId === c.id || w.targetComponentId === c.id);
      if (connectedWires.length === 2) {
          // If connected to things purely above/below, rotate 90
          const neighbors = connectedWires.map(w => {
              const otherId = w.sourceComponentId === c.id ? w.targetComponentId : w.sourceComponentId;
              return components.find(x => x.id === otherId);
          }).filter(Boolean) as CircuitComponent[];
          
          if (neighbors.length === 2) {
              const isVertical = neighbors.every(n => Math.abs(n.x - c.x) < 50);
              if (isVertical) {
                  c.rotation = 90;
              }
          }
      }
  });

  return { components, wires };
}