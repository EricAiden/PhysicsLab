export type ComponentType = 
  | 'BATTERY' 
  | 'RESISTOR' 
  | 'RHEOSTAT' 
  | 'BULB' 
  | 'SWITCH' 
  | 'VOLTMETER' 
  | 'AMMETER' 
  | 'WIRE';

export interface Pin {
  id: string;
  componentId: string;
  x: number; // Relative to component center or absolute on canvas
  y: number;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  rotation: number; // 0, 90, 180, 270
  value: number; // Resistance (Ohms) or Voltage (Volts)
  label: string; // e.g., "R1", "U1"
  isOpen?: boolean; // For switches
  // For visual state (e.g., bulb brightness, ammeter reading)
  current?: number;
  voltageDrop?: number;
}

export interface Wire {
  id: string;
  sourceComponentId: string;
  sourcePinIndex: number; // 0 or 1 usually
  targetComponentId: string;
  targetPinIndex: number;
}

export interface CircuitState {
  components: CircuitComponent[];
  wires: Wire[];
  error?: string; // "Short Circuit", "Open Circuit", etc.
}

// For specific experiment modes (e.g. Ohm's Law Lab)
export interface ExperimentState {
  voltage: number;
  fixedResistor: number;
  varResistor: number;
}

export interface CircuitMetrics {
  current: number;
  vVar: number;
  pVar: number;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}