import React from 'react';
import { ComponentType } from '../types';
import { Battery, Zap, Lightbulb, ToggleLeft, Gauge, CircleMinus } from 'lucide-react';

interface Props {
  onAdd: (type: ComponentType) => void;
}

const ComponentPalette: React.FC<Props> = ({ onAdd }) => {
  const items: { type: ComponentType; label: string; icon: React.ReactNode }[] = [
    { type: 'BATTERY', label: '电源', icon: <Battery className="w-6 h-6" /> },
    { type: 'RESISTOR', label: '电阻', icon: <div className="w-6 h-2 bg-gray-400 border-2 border-gray-600" /> },
    { type: 'RHEOSTAT', label: '滑动变阻器', icon: <div className="flex flex-col items-center"><div className="w-6 h-2 bg-gray-400 border-2 border-gray-600" /><div className="w-0.5 h-2 bg-red-500" /></div> },
    { type: 'BULB', label: '小灯泡', icon: <Zap className="w-6 h-6 text-yellow-500" /> },
    { type: 'SWITCH', label: '开关', icon: <ToggleLeft className="w-6 h-6" /> },
    { type: 'AMMETER', label: '电流表', icon: <div className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center font-bold text-xs">A</div> },
    { type: 'VOLTMETER', label: '电压表', icon: <div className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center font-bold text-xs">V</div> },
  ];

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
      <h3 className="font-bold text-gray-700 text-sm uppercase">元件箱</h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <button
            key={item.type}
            onClick={() => onAdd(item.type)}
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-colors group"
          >
            <div className="text-gray-600 group-hover:text-blue-600 mb-1">
              {item.icon}
            </div>
            <span className="text-xs font-medium text-gray-600">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="text-xs text-gray-400 mt-2">
        点击添加，然后在画布上拖动。连接红点可接线。
      </div>
    </div>
  );
};

export default ComponentPalette;