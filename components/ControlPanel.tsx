import React from 'react';
import { ExperimentState } from '../types';

interface Props {
  state: ExperimentState;
  onUpdate: (key: keyof ExperimentState, value: number) => void;
}

const ControlPanel: React.FC<Props> = ({ state, onUpdate }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      {/* Voltage Control */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          电源电压 U (V)
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min="1"
            max="24"
            step="1"
            value={state.voltage}
            onChange={(e) => onUpdate('voltage', Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="text-lg font-bold text-blue-600 w-12 text-right">
            {state.voltage}V
          </span>
        </div>
      </div>

      {/* Fixed Resistor Control */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          定值电阻 R1 (Ω)
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min="5"
            max="40"
            step="1"
            value={state.fixedResistor}
            onChange={(e) => onUpdate('fixedResistor', Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          />
          <span className="text-lg font-bold text-yellow-600 w-12 text-right">
            {state.fixedResistor}Ω
          </span>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;