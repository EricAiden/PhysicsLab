import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine
} from 'recharts';
import { ExperimentState } from '../types';

interface Props {
  state: ExperimentState;
}

const DataChart: React.FC<Props> = ({ state }) => {
  // Generate data points for the curve
  const data = useMemo(() => {
    const points = [];
    // We plot from 0 to 50 Ohms to show the curve context
    for (let r = 0; r <= 50; r += 1) {
      const rTotal = state.fixedResistor + r;
      // Avoid division by zero if both are 0 (unlikely given fixed defaults)
      const current = rTotal > 0 ? state.voltage / rTotal : 0;
      const power = current * current * r;
      points.push({
        r2: r,
        power: parseFloat(power.toFixed(2)),
      });
    }
    return points;
  }, [state.voltage, state.fixedResistor]);

  // Current Operating Point
  const currentRTotal = state.fixedResistor + state.varResistor;
  const currentI = state.voltage / currentRTotal;
  const currentPower = currentI * currentI * state.varResistor;

  return (
    <div className="w-full h-64 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">
        滑动变阻器 R2 电功率曲线 (P - R2)
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="r2" 
            label={{ value: 'R2 (Ω)', position: 'insideBottomRight', offset: -5 }} 
            tick={{fontSize: 12}}
            type="number"
            domain={[0, 50]}
          />
          <YAxis 
            label={{ value: 'Power (W)', angle: -90, position: 'insideLeft' }} 
            tick={{fontSize: 12}}
          />
          <Tooltip 
            formatter={(value: number) => [`${value} W`, 'Power']}
            labelFormatter={(label: number) => `R2: ${label} Ω`}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
          <Line 
            type="monotone" 
            dataKey="power" 
            stroke="#3b82f6" 
            strokeWidth={3} 
            dot={false} 
            activeDot={false}
          />
          
          {/* The theoretical Peak */}
          <ReferenceLine x={state.fixedResistor} stroke="#9ca3af" strokeDasharray="3 3" label={{position: 'top', value: 'R1=R2', fill: '#9ca3af', fontSize: 10}} />
          
          {/* The User's Current Position */}
          <ReferenceDot 
            x={state.varResistor} 
            y={currentPower} 
            r={6} 
            fill="#ef4444" 
            stroke="white" 
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DataChart;