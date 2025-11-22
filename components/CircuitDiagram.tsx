import React from 'react';
import { ExperimentState, CircuitMetrics } from '../types';

interface Props {
  state: ExperimentState;
  metrics: CircuitMetrics;
  onChangeR2: (val: number) => void;
}

const CircuitDiagram: React.FC<Props> = ({ state, metrics, onChangeR2 }) => {
  // SVG Configuration
  const width = 600;
  const height = 400;
  const wireColor = "#374151"; // Gray-700
  const wireWidth = 4;
  
  // R2 Slider Calculation
  const maxR2 = 50; // Assuming max slider value for visual representation scaling
  const sliderWidth = 160;
  const sliderXStart = 320;
  const sliderY = 100;
  
  // Calculate handle position based on current resistance
  const handleX = sliderXStart + (state.varResistor / maxR2) * sliderWidth;

  const handleDrag = (e: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>) => {
    e.preventDefault();
    const svg = e.currentTarget.closest('svg');
    if (!svg) return;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      let clientX;
      if (window.TouchEvent && moveEvent instanceof TouchEvent) {
        clientX = moveEvent.touches[0].clientX;
      } else {
        clientX = (moveEvent as MouseEvent).clientX;
      }

      const pt = svg.createSVGPoint();
      pt.x = clientX;
      const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
      
      // Constrain within slider bounds
      let newX = Math.max(sliderXStart, Math.min(sliderXStart + sliderWidth, svgP.x));
      
      // Convert position back to resistance
      const percentage = (newX - sliderXStart) / sliderWidth;
      const newR2 = Math.round(percentage * maxR2);
      onChangeR2(newR2);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
  };

  // Current animation speed (faster current = faster dash offset)
  // We use CSS animation in a style tag for dynamic speed, simplified here by visual glow
  const glowOpacity = Math.min(metrics.current / 2, 1); // Cap glow at 2A for visual sanity

  return (
    <div className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-200 overflow-hidden relative select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>

        {/* Main Circuit Loop */}
        <rect 
            x="50" y="50" 
            width="500" height="300" 
            rx="20" 
            fill="none" 
            stroke={wireColor} 
            strokeWidth={wireWidth} 
        />

        {/* Voltage Source (Left Vertical) */}
        <g transform="translate(50, 200)">
            {/* Clear wire behind battery */}
            <line x1="0" y1="-30" x2="0" y2="30" stroke="white" strokeWidth={wireWidth + 2} />
            {/* Battery Symbol */}
            <line x1="-15" y1="-10" x2="15" y2="-10" stroke={wireColor} strokeWidth="2" />
            <line x1="-25" y1="10" x2="25" y2="10" stroke={wireColor} strokeWidth="4" />
            <text x="-40" y="0" textAnchor="end" className="text-xs fill-gray-500 font-mono">U={state.voltage}V</text>
            <text x="-40" y="20" textAnchor="end" className="text-xs fill-green-600 font-bold font-mono">I={metrics.current.toFixed(2)}A</text>
        </g>

        {/* Fixed Resistor R1 (Bottom Horizontal) */}
        <g transform="translate(300, 350)">
            <line x1="-40" y1="0" x2="40" y2="0" stroke="white" strokeWidth={wireWidth + 2} />
            <rect x="-30" y="-10" width="60" height="20" fill="#fcd34d" stroke={wireColor} strokeWidth="2" />
            <text x="0" y="5" textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold fill-gray-800">R1</text>
            <text x="0" y="25" textAnchor="middle" className="text-xs fill-gray-500">定值: {state.fixedResistor}Ω</text>
        </g>

        {/* Sliding Rheostat R2 (Top Horizontal) */}
        <g transform="translate(0, 50)">
            {/* Clear wire for R2 area */}
            <line x1={sliderXStart - 20} y1="0" x2={sliderXStart + sliderWidth + 20} y2="0" stroke="white" strokeWidth={wireWidth + 2} />
            
            {/* The Resistor Coil */}
            <path 
                d={`M ${sliderXStart} 0 l 10 -10 l 10 20 l 10 -20 l 10 20 l 10 -20 l 10 20 l 10 -20 l 10 20 l 10 -20 l 10 20 l 10 -20 l 10 20 l 10 -20 l 10 20`}
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
            />

            {/* The Slider Contact (Draggable) */}
            <g style={{ cursor: 'ew-resize' }} onMouseDown={handleDrag} onTouchStart={handleDrag}>
                {/* Vertical Line */}
                <line x1={handleX} y1="-30" x2={handleX} y2="0" stroke="#ef4444" strokeWidth="3" />
                {/* Arrow Head */}
                <polygon points={`${handleX},0 ${handleX-5},-8 ${handleX+5},-8`} fill="#ef4444" />
                {/* Handle Knob */}
                <circle cx={handleX} cy="-35" r="12" fill="#ef4444" stroke="white" strokeWidth="2" />
                <text x={handleX} y="-55" textAnchor="middle" className="text-xs font-bold fill-red-600 select-none">
                  R2: {state.varResistor}Ω
                </text>
            </g>
            
            {/* Label */}
            <text x={sliderXStart + sliderWidth / 2} y="30" textAnchor="middle" className="text-xs fill-gray-500">
              滑动变阻器 (拖动滑片)
            </text>
        </g>

        {/* Voltmeter across R2 */}
        <g transform={`translate(${sliderXStart + sliderWidth / 2}, 100)`}>
             <circle cx="0" cy="0" r="20" fill="white" stroke={wireColor} strokeWidth="2" />
             <text x="0" y="2" textAnchor="middle" dominantBaseline="middle" className="font-bold text-sm">V</text>
             <text x="0" y="35" textAnchor="middle" className="text-xs fill-blue-600 font-mono">
                {metrics.vVar.toFixed(1)}V
             </text>
             {/* Wires to Voltmeter */}
             <path d={`M -20 0 L -${sliderWidth/2 + 20} 0 L -${sliderWidth/2 + 20} -50`} fill="none" stroke={wireColor} strokeWidth="1" strokeDasharray="4" />
             <path d={`M 20 0 L ${sliderWidth/2 + 20} 0 L ${sliderWidth/2 + 20} -50`} fill="none" stroke={wireColor} strokeWidth="1" strokeDasharray="4" />
        </g>

        {/* Power Bulb/Visualizer for R2 Power */}
        <g transform="translate(480, 200)">
            <circle cx="0" cy="0" r={10 + Math.sqrt(metrics.pVar) * 3} fill={`rgba(255, 165, 0, ${0.2 + glowOpacity * 0.8})`} filter="url(#glow)" />
            <text x="0" y="50" textAnchor="middle" className="text-xs fill-orange-600 font-bold">
                R2 功率
            </text>
            <text x="0" y="65" textAnchor="middle" className="text-sm fill-gray-900 font-mono font-bold">
                {metrics.pVar.toFixed(2)}W
            </text>
        </g>

      </svg>
      
      <div className="absolute bottom-2 left-2 text-xs text-gray-400 italic">
        拖拽红色滑片改变电阻 R2
      </div>
    </div>
  );
};

export default CircuitDiagram;