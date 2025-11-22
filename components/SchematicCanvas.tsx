
import React from 'react';
import { CircuitComponent, Wire } from '../types';

interface Props {
  components: CircuitComponent[];
  wires: Wire[];
}

const SchematicCanvas: React.FC<Props> = ({ components, wires }) => {
  // Schematic symbols are drawn in black/white style
  
  const renderSchematicSymbol = (c: CircuitComponent) => {
    const strokeColor = "#000";
    const strokeWidth = 2;

    switch (c.type) {
        case 'BATTERY':
            return (
                <g>
                    {/* Long line (+) */}
                    <line x1="-5" y1="-15" x2="-5" y2="15" stroke={strokeColor} strokeWidth={strokeWidth} />
                    {/* Short line (-) */}
                    <line x1="5" y1="-25" x2="5" y2="25" stroke={strokeColor} strokeWidth="4" />
                    {/* Connectors */}
                    <line x1="-35" y1="0" x2="-5" y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <line x1="5" y1="0" x2="35" y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <text x="-10" y="-20" className="text-xs font-serif">+</text>
                </g>
            );
        case 'RESISTOR':
            return (
                <g>
                     <polyline 
                        points="-25,0 -20,-8 -10,8 0,-8 10,8 20,-8 25,0" 
                        fill="none" stroke={strokeColor} strokeWidth={strokeWidth} 
                     />
                     <line x1="-35" y1="0" x2="-25" y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
                     <line x1="25" y1="0" x2="35" y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
                </g>
            );
        case 'RHEOSTAT':
            return (
                <g>
                     <rect x="-20" y="-6" width="40" height="12" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
                     <line x1="-35" y1="0" x2="-20" y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
                     <line x1="20" y1="0" x2="35" y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
                     {/* Arrow */}
                     <line x1="0" y1="6" x2="0" y2="15" stroke={strokeColor} strokeWidth={strokeWidth} />
                     <polygon points="-3,6 3,6 0,0" fill={strokeColor} />
                </g>
            );
        case 'BULB':
            return (
                <g>
                    <circle cx="0" cy="0" r="12" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <path d="M -8 -8 L 8 8 M -8 8 L 8 -8" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <line x1="-35" y1="0" x2="-12" y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <line x1="12" y1="0" x2="35" y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
                </g>
            );
        case 'SWITCH':
            return (
                <g>
                    <circle cx="-15" cy="0" r="2" fill={strokeColor} />
                    <circle cx="15" cy="0" r="2" fill={strokeColor} />
                    <line x1="-35" y1="0" x2="-15" y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <line x1="15" y1="0" x2="35" y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <line 
                        x1="-15" y1="0" x2={12} y2={c.isOpen ? -15 : 0} 
                        stroke={strokeColor} strokeWidth={strokeWidth} 
                    />
                </g>
            );
        case 'AMMETER':
            return (
                <g>
                    <circle cx="0" cy="0" r="12" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <text x="0" y="4" textAnchor="middle" className="font-serif font-bold text-sm">A</text>
                    <line x1="-35" y1="0" x2="-12" y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <line x1="12" y1="0" x2="35" y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
                </g>
            );
        case 'VOLTMETER':
            return (
                <g>
                    <circle cx="0" cy="0" r="12" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <text x="0" y="4" textAnchor="middle" className="font-serif font-bold text-sm">V</text>
                    <line x1="-35" y1="0" x2="-12" y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <line x1="12" y1="0" x2="35" y2="0" stroke={strokeColor} strokeWidth={strokeWidth} />
                </g>
            );
        default: return null;
    }
  };

  // Helper to get pin positions (reuse logic from CircuitCanvas but stricter)
  const getPinCoords = (c: CircuitComponent, pinIndex: number) => {
    const PIN_OFFSET = 35;
    const rad = c.rotation * Math.PI / 180;
    const lx = pinIndex === 0 ? -PIN_OFFSET : PIN_OFFSET;
    
    const rx = lx * Math.cos(rad);
    const ry = lx * Math.sin(rad);

    return { x: c.x + rx, y: c.y + ry };
  };

  // Orthogonal wire routing helper (simple Manhattan)
  const renderWire = (x1: number, y1: number, x2: number, y2: number) => {
      // Simple L-shape: Horizontal then Vertical
      const midX = (x1 + x2) / 2;
      return (
          <path 
            d={`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`} 
            fill="none" 
            stroke="#000" 
            strokeWidth="2" 
            strokeLinecap="square"
          />
      );
  };

  return (
    <div className="w-full h-full bg-white relative overflow-hidden select-none">
        <div className="absolute top-4 right-4 bg-white/90 border border-gray-300 px-3 py-1 rounded shadow-sm z-10 text-xs text-gray-500">
            标准电路符号视图
        </div>

        {/* Grid Background */}
        <svg className="w-full h-full">
            <defs>
                <pattern id="schematic-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#schematic-grid)" />

            {/* Wires */}
            {wires.map(w => {
                const c1 = components.find(c => c.id === w.sourceComponentId);
                const c2 = components.find(c => c.id === w.targetComponentId);
                if (!c1 || !c2) return null;
                const p1 = getPinCoords(c1, w.sourcePinIndex);
                const p2 = getPinCoords(c2, w.targetPinIndex);
                return <g key={w.id}>{renderWire(p1.x, p1.y, p2.x, p2.y)}</g>;
            })}

            {/* Components */}
            {components.map(c => (
                <g 
                    key={c.id} 
                    transform={`translate(${c.x}, ${c.y}) rotate(${c.rotation})`}
                >
                    {/* White bg to cover wires behind */}
                    <rect x="-30" y="-20" width="60" height="40" fill="white" opacity="0.8" />
                    {renderSchematicSymbol(c)}
                    <text x="0" y="-25" textAnchor="middle" className="text-xs font-mono fill-gray-500">{c.label}</text>
                </g>
            ))}
        </svg>
    </div>
  );
};

export default SchematicCanvas;
