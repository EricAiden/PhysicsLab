
import React, { useState, useRef } from 'react';
import { CircuitComponent, Wire } from '../types';
import { Trash2, RotateCw, AlertTriangle } from 'lucide-react';

interface Props {
  components: CircuitComponent[];
  wires: Wire[];
  onMoveComponent: (id: string, x: number, y: number) => void;
  onConnect: (sourceId: string, sourcePin: number, targetId: string, targetPin: number) => void;
  onDeleteComponent: (id: string) => void;
  onUpdateComponent: (id: string, updates: Partial<CircuitComponent>) => void;
  error?: string;
}

const PIN_OFFSET = 35;

const CircuitCanvas: React.FC<Props> = ({ 
  components, wires, onMoveComponent, onConnect, onDeleteComponent, onUpdateComponent, error 
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [drawingWireStart, setDrawingWireStart] = useState<{compId: string, pinIndex: number} | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rheostatDrag, setRheostatDrag] = useState<{id: string, startX: number, startVal: number} | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // Coordinate helper
  const getEventPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation();
    if (drawingWireStart) return; 
    setDraggingId(id);
    setSelectedId(id);
  };

  const handleSliderStart = (e: React.MouseEvent | React.TouchEvent, id: string, currentVal: number) => {
      e.stopPropagation();
      const pt = getEventPoint(e);
      setRheostatDrag({ id, startX: pt.x, startVal: currentVal });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const p = getEventPoint(e);
    setMousePos(p);

    if (rheostatDrag) {
        const delta = p.x - rheostatDrag.startX;
        let newVal = rheostatDrag.startVal + delta * 0.5;
        newVal = Math.max(0, Math.min(50, newVal));
        onUpdateComponent(rheostatDrag.id, { value: Math.round(newVal) });
    } else if (draggingId) {
      onMoveComponent(draggingId, p.x, p.y);
    }
  };

  const handleCanvasUp = () => {
    setDraggingId(null);
    setRheostatDrag(null);
  };

  const handlePinClick = (e: React.MouseEvent, compId: string, pinIndex: number) => {
    e.stopPropagation();
    if (drawingWireStart) {
      if (drawingWireStart.compId !== compId) {
        onConnect(drawingWireStart.compId, drawingWireStart.pinIndex, compId, pinIndex);
      }
      setDrawingWireStart(null);
    } else {
      setDrawingWireStart({ compId, pinIndex });
    }
  };

  const getPinCoords = (c: CircuitComponent, pinIndex: number) => {
    let dx = 0, dy = 0;
    const rad = c.rotation * Math.PI / 180;
    const lx = pinIndex === 0 ? -PIN_OFFSET : PIN_OFFSET;
    const ly = 0;
    const rx = lx * Math.cos(rad) - ly * Math.sin(rad);
    const ry = lx * Math.sin(rad) + ly * Math.cos(rad);
    return { x: c.x + rx, y: c.y + ry };
  };

  const renderSymbol = (c: CircuitComponent) => {
    switch (c.type) {
        case 'BATTERY':
            return (
                <g>
                    <line x1="-10" y1="-15" x2="-10" y2="15" stroke="black" strokeWidth="3" />
                    <line x1="10" y1="-25" x2="10" y2="25" stroke="black" strokeWidth="5" />
                    <text x="-15" y="-20" className="text-[10px] font-bold select-none">+</text>
                    <text x="-10" y="35" textAnchor="middle" className="text-[10px] font-bold fill-blue-600">{c.value}V</text>
                </g>
            );
        case 'RESISTOR':
            return (
                <g>
                    <rect x="-20" y="-8" width="40" height="16" fill="#fcd34d" stroke="black" strokeWidth="2" />
                    <text x="0" y="4" textAnchor="middle" className="text-[10px] font-bold">{c.value}Ω</text>
                </g>
            );
        case 'RHEOSTAT':
            const sliderX = -15 + (c.value / 50) * 30;
            return (
                <g>
                    <rect x="-20" y="-8" width="40" height="16" fill="#d1d5db" stroke="black" strokeWidth="2" />
                    <text x="0" y="4" textAnchor="middle" className="text-[8px] fill-gray-600 select-none">0...50Ω</text>
                    <line x1="-15" y1="-12" x2="15" y2="-12" stroke="gray" strokeWidth="1" />
                    <g 
                        className="cursor-col-resize hover:scale-110 transition-transform"
                        onMouseDown={(e) => handleSliderStart(e, c.id, c.value)}
                        onTouchStart={(e) => handleSliderStart(e, c.id, c.value)}
                    >
                        <polygon points={`${sliderX},-18 ${sliderX-4},-25 ${sliderX+4},-25`} fill="red" />
                        <line x1={sliderX} y1="-18" x2={sliderX} y2="-8" stroke="red" strokeWidth="2" />
                        <circle cx={sliderX} cy="-24" r="5" fill="red" opacity="0.2" />
                    </g>
                    <text x="0" y="-30" textAnchor="middle" className="text-[9px] font-bold fill-red-600">{Math.round(c.value)}Ω</text>
                </g>
            );
        case 'BULB':
            const brightness = Math.min((Math.abs(c.current || 0) * 2), 1);
            return (
                <g>
                    <circle cx="0" cy="0" r="15" fill={`rgba(255, 215, 0, ${0.1 + brightness})`} stroke={brightness > 0.5 ? "orange" : "black"} strokeWidth="2" />
                    {brightness > 0.2 && <circle cx="0" cy="0" r="20" fill="url(#glow)" opacity={brightness} />}
                    <path d="M -10 10 L 0 -5 L 10 10" fill="none" stroke="black" />
                </g>
            );
        case 'SWITCH':
            return (
                <g onClick={(e) => { e.stopPropagation(); onUpdateComponent(c.id, { isOpen: !c.isOpen }); }} className="cursor-pointer hover:opacity-70">
                     <circle cx="-15" cy="0" r="3" fill="black" />
                     <circle cx="15" cy="0" r="3" fill="black" />
                     <path 
                        d={c.isOpen ? "M -15 0 L 12 -15" : "M -15 0 L 15 0"} 
                        stroke="black" strokeWidth="2" 
                        className="transition-all duration-200"
                     />
                     <text x="0" y="20" textAnchor="middle" className="text-[9px] select-none">{c.isOpen ? "断开" : "闭合"}</text>
                </g>
            );
        case 'AMMETER':
            return (
                <g>
                    <circle cx="0" cy="0" r="18" fill="white" stroke="black" strokeWidth="2" />
                    <text x="0" y="4" textAnchor="middle" className="font-bold font-serif select-none">A</text>
                    <rect x="-14" y="14" width="28" height="12" rx="4" fill="black" />
                    <text x="0" y="22" textAnchor="middle" className="text-[9px] font-mono fill-green-400 select-none">
                        {Math.abs(c.current || 0).toFixed(2)}A
                    </text>
                </g>
            );
        case 'VOLTMETER':
            return (
                 <g>
                    <circle cx="0" cy="0" r="18" fill="white" stroke="black" strokeWidth="2" />
                    <text x="0" y="4" textAnchor="middle" className="font-bold font-serif select-none">V</text>
                    <rect x="-14" y="14" width="28" height="12" rx="4" fill="black" />
                    <text x="0" y="22" textAnchor="middle" className="text-[9px] font-mono fill-red-400 select-none">
                        {Math.abs(c.voltageDrop || 0).toFixed(2)}V
                    </text>
                </g>
            );
        default: return null;
    }
  };

  return (
    <div className="w-full h-full relative flex flex-col bg-white">
        <svg style={{position: 'absolute', width: 0, height: 0}}>
            <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
        </svg>

      {selectedId && (
        <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur p-2 rounded-lg shadow border border-gray-200 flex gap-2 items-center">
           <button onClick={() => {
               const c = components.find(x => x.id === selectedId);
               if (c) onUpdateComponent(selectedId, { rotation: (c.rotation + 45) % 360 });
           }} className="p-1 hover:bg-gray-100 rounded" title="旋转">
              <RotateCw className="w-4 h-4 text-gray-600" />
           </button>
           
           {(() => {
               const c = components.find(x => x.id === selectedId);
               if (!c) return null;
               if (['RESISTOR', 'BATTERY'].includes(c.type)) {
                   return (
                       <div className="flex items-center gap-1 border-l pl-2 ml-1 border-gray-300">
                           <span className="text-xs text-gray-500">{c.type === 'BATTERY' ? 'U:' : 'R:'}</span>
                           <input 
                             type="number" 
                             value={c.value} 
                             onChange={(e) => onUpdateComponent(selectedId, { value: parseFloat(e.target.value) })}
                             className="w-16 px-1 py-0.5 text-xs border rounded"
                           />
                           <span className="text-xs text-gray-500">{c.type === 'BATTERY' ? 'V' : 'Ω'}</span>
                       </div>
                   );
               }
               return null;
           })()}

           <button onClick={() => { onDeleteComponent(selectedId); setSelectedId(null); }} className="p-1 hover:bg-red-50 rounded border-l border-gray-300 ml-1" title="删除">
              <Trash2 className="w-4 h-4 text-red-500" />
           </button>
        </div>
      )}
      
      {error && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-lg shadow-xl z-20 flex items-center gap-3 animate-bounce">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-bold text-sm">{error}</span>
          </div>
      )}
      
      {!error && components.some(c => Math.abs(c.current || 0) > 0.001) && (
           <div className="absolute bottom-6 right-6 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg shadow-md z-10 text-xs font-bold flex items-center gap-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
               电路通电中
           </div>
      )}

      <svg 
        ref={svgRef}
        className="w-full h-full bg-white cursor-crosshair touch-none"
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasUp}
        onTouchMove={handleCanvasMouseMove}
        onTouchEnd={handleCanvasUp}
        onClick={() => { if(!drawingWireStart) setSelectedId(null); }} 
      >
        <defs>
           <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
             <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
           </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {wires.map(w => {
           const c1 = components.find(c => c.id === w.sourceComponentId);
           const c2 = components.find(c => c.id === w.targetComponentId);
           if (!c1 || !c2) return null;
           const p1 = getPinCoords(c1, w.sourcePinIndex);
           const p2 = getPinCoords(c2, w.targetPinIndex);
           const current = c1.current || 0; 
           const isFlowing = Math.abs(current) > 0.001;

           return (
             <g key={w.id} className="pointer-events-none">
                {isFlowing && <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(239, 68, 68, 0.2)" strokeWidth="8" />}
                <line 
                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} 
                    stroke={isFlowing ? "#ef4444" : "#374151"} 
                    strokeWidth={isFlowing ? 3 : 2} 
                    strokeLinecap="round" 
                />
             </g>
           );
        })}

        {drawingWireStart && mousePos && (() => {
            const c = components.find(comp => comp.id === drawingWireStart.compId);
            if (!c) return null;
            const startPos = getPinCoords(c, drawingWireStart.pinIndex);
            return (
                <line 
                    x1={startPos.x} y1={startPos.y} 
                    x2={mousePos.x} y2={mousePos.y} 
                    stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" 
                    className="pointer-events-none"
                />
            );
        })()}

        {components.map(c => {
            const isSelected = selectedId === c.id;
            return (
                <g 
                    key={c.id} 
                    transform={`translate(${c.x}, ${c.y}) rotate(${c.rotation})`}
                    onMouseDown={(e) => handleMouseDown(e, c.id)}
                    onTouchStart={(e) => handleMouseDown(e, c.id)}
                    className={`cursor-move ${isSelected ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}
                >
                    {isSelected && <circle r="35" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4" />}
                    {renderSymbol(c)}
                    <g className="cursor-pointer">
                         <circle 
                            cx={-PIN_OFFSET} cy="0" r="6" 
                            fill={drawingWireStart?.compId === c.id && drawingWireStart?.pinIndex === 0 ? "#ef4444" : "transparent"}
                            stroke="#ef4444" strokeWidth="2" 
                            className="hover:fill-red-100"
                            onClick={(e) => handlePinClick(e, c.id, 0)}
                         />
                         <circle 
                            cx={PIN_OFFSET} cy="0" r="6" 
                            fill={drawingWireStart?.compId === c.id && drawingWireStart?.pinIndex === 1 ? "#ef4444" : "transparent"}
                            stroke="#ef4444" strokeWidth="2" 
                            className="hover:fill-red-100"
                            onClick={(e) => handlePinClick(e, c.id, 1)}
                         />
                    </g>
                    <text x="0" y="-35" textAnchor="middle" className="text-xs font-bold fill-gray-500 select-none pointer-events-none">{c.label}</text>
                </g>
            );
        })}
      </svg>
    </div>
  );
};

export default CircuitCanvas;
