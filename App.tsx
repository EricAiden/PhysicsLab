import React, { useState, useEffect } from 'react';
import { CircuitComponent, Wire, ComponentType } from './types';
import CircuitCanvas from './components/CircuitCanvas';
import ComponentPalette from './components/ComponentPalette';
import ChatAssistant from './components/ChatAssistant';
import { GraduationCap, Zap, RotateCcw } from 'lucide-react';
import { solveCircuit } from './utils/solver';

const App: React.FC = () => {
  // Initial State
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  
  // For generating IDs
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Simulation Loop
  useEffect(() => {
    const result = solveCircuit(components, wires);
    
    if (result.error !== error) {
        setError(result.error);
    }

    if (!result.error) {
        const newComps = result.components;
        // Check difference to avoid infinite loops (only if values changed drastically)
        const changed = newComps.some((nc) => {
            const oc = components.find(c => c.id === nc.id);
            if (!oc) return true;
            return Math.abs((oc.current || 0) - (nc.current || 0)) > 0.001 || 
                   Math.abs((oc.voltageDrop || 0) - (nc.voltageDrop || 0)) > 0.001;
        });
        
        if (changed) {
             // Use functional update to merge
             setComponents(prev => prev.map(p => {
                 const calculated = newComps.find(n => n.id === p.id);
                 return calculated ? { ...p, current: calculated.current, voltageDrop: calculated.voltageDrop } : p;
             }));
        }
    } else {
        // Zero out on error
        setComponents(prev => {
            const needsZero = prev.some(p => (p.current || 0) !== 0 || (p.voltageDrop || 0) !== 0);
            if(needsZero) return prev.map(p => ({...p, current: 0, voltageDrop: 0}));
            return prev;
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wires.length, components.map(c => `${c.id}-${c.value}-${c.isOpen}-${c.x}-${c.y}`).join('|')]);

  const handleAddComponent = (type: ComponentType) => {
    const id = generateId();
    const labels = components.filter(c => c.type === type).length + 1;
    const newComp: CircuitComponent = {
      id,
      type,
      x: 150 + Math.random() * 50,
      y: 150 + Math.random() * 50,
      rotation: 0,
      value: type === 'BATTERY' ? 12 : (type === 'RESISTOR' || type === 'RHEOSTAT' ? 10 : 0),
      label: `${type === 'BATTERY' ? 'U' : (type === 'RESISTOR' ? 'R' : (type === 'BULB' ? 'L' : ''))}${labels}`,
      isOpen: type === 'SWITCH' ? true : undefined
    };
    setComponents(prev => [...prev, newComp]);
  };

  const handleMoveComponent = (id: string, x: number, y: number) => {
    setComponents(prev => prev.map(c => c.id === id ? { ...c, x, y } : c));
  };

  const handleUpdateComponent = (id: string, updates: Partial<CircuitComponent>) => {
      setComponents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleDeleteComponent = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
    setWires(prev => prev.filter(w => w.sourceComponentId !== id && w.targetComponentId !== id));
  };

  const handleConnect = (sId: string, sPin: number, tId: string, tPin: number) => {
    if (sId === tId) return;
    const exists = wires.some(w => 
        (w.sourceComponentId === sId && w.sourcePinIndex === sPin && w.targetComponentId === tId && w.targetPinIndex === tPin) ||
        (w.sourceComponentId === tId && w.sourcePinIndex === tPin && w.targetComponentId === sId && w.targetPinIndex === sPin)
    );
    if (exists) return;

    setWires(prev => [...prev, {
        id: generateId(),
        sourceComponentId: sId,
        sourcePinIndex: sPin,
        targetComponentId: tId,
        targetPinIndex: tPin
    }]);
  };

  const handleReset = () => {
      if(confirm("确定要清空画布吗？")) {
          setComponents([]);
          setWires([]);
          setError(undefined);
      }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-800 overflow-hidden">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 h-14 shrink-0 flex items-center justify-between px-4 z-20 relative shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-gray-900 tracking-tight">PhysicsLab <span className="font-normal text-gray-500 text-sm">| 自由电路实验室</span></h1>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={handleReset} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-1 rounded-md hover:bg-red-50">
                <RotateCcw className="w-4 h-4" />
                清空
            </button>
            <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-medium text-indigo-700">智能探究模式</span>
            </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Sidebar: Palette */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 z-10">
            <ComponentPalette onAdd={handleAddComponent} />
            
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800 leading-relaxed">
                <strong>使用说明：</strong><br/>
                1. 点击元件加入画布。<br/>
                2. 拖动调整位置。<br/>
                3. 点击红色引脚开始连线，点击另一个引脚结束。<br/>
                4. 点击元件可修改参数。<br/>
                5. 别忘了闭合开关！
            </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden shadow-inner">
             <CircuitCanvas 
                components={components} 
                wires={wires}
                onMoveComponent={handleMoveComponent}
                onConnect={handleConnect}
                onDeleteComponent={handleDeleteComponent}
                onUpdateComponent={handleUpdateComponent}
                error={error}
             />
        </div>

        {/* Right Sidebar: Chat */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-xl">
            <ChatAssistant circuitContext={{ components, wires, error }} />
        </div>
      </div>
    </div>
  );
};

export default App;
