
import React, { useState, useEffect } from 'react';
import { CircuitComponent, Wire } from '../types';
import { analyzeTopology, TopologyResult } from '../utils/topology';
import { CheckCircle2, Circle, HelpCircle, ArrowRight } from 'lucide-react';

interface Props {
  components: CircuitComponent[];
  wires: Wire[];
}

type TaskType = 'NONE' | 'SERIES' | 'PARALLEL';

const TaskPanel: React.FC<Props> = ({ components, wires }) => {
  const [activeTask, setActiveTask] = useState<TaskType>('NONE');
  const [result, setResult] = useState<TopologyResult | null>(null);

  useEffect(() => {
    if (activeTask !== 'NONE') {
      const res = analyzeTopology(components, wires);
      setResult(res);
    }
  }, [components, wires, activeTask]);

  const isSuccess = (activeTask === 'SERIES' && result?.type === 'SERIES') || 
                    (activeTask === 'PARALLEL' && result?.type === 'PARALLEL');

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200 bg-indigo-50">
        <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-800">连接向导</h3>
        </div>
        <p className="text-xs text-gray-600">选择一个目标，系统将检测你的电路连接方式。</p>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Task Selection */}
        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={() => setActiveTask('SERIES')}
                className={`p-3 rounded-lg border text-left transition-all ${activeTask === 'SERIES' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-indigo-300'}`}
            >
                <div className="text-sm font-bold text-gray-800">串联电路</div>
                <div className="text-xs text-gray-500 mt-1">首尾相连，只有一条路径</div>
            </button>
            <button 
                onClick={() => setActiveTask('PARALLEL')}
                className={`p-3 rounded-lg border text-left transition-all ${activeTask === 'PARALLEL' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-indigo-300'}`}
            >
                <div className="text-sm font-bold text-gray-800">并联电路</div>
                <div className="text-xs text-gray-500 mt-1">首首相连，有多条支路</div>
            </button>
        </div>

        {/* Feedback Area */}
        {activeTask !== 'NONE' && (
            <div className={`rounded-lg border p-4 ${isSuccess ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex items-center gap-2 mb-2">
                    {isSuccess ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                    )}
                    <span className={`font-bold ${isSuccess ? 'text-green-700' : 'text-gray-700'}`}>
                        {isSuccess ? '恭喜！连接正确' : '检测中...'}
                    </span>
                </div>
                
                <div className="text-sm space-y-2">
                    <div className="flex justify-between text-gray-600">
                        <span>当前状态:</span>
                        <span className="font-mono font-bold">
                            {result?.type === 'SERIES' ? '串联' : 
                             result?.type === 'PARALLEL' ? '并联' : 
                             result?.type === 'OPEN' ? '断路' : 
                             result?.type === 'SHORT' ? '短路' : '未知'}
                        </span>
                    </div>
                     {result?.type !== 'OPEN' && result?.type !== 'SHORT' && (
                         <div className="flex justify-between text-gray-500 text-xs">
                            <span>回路数量: {result?.loops}</span>
                            <span>支路节点: {result?.branches > 0 ? '存在' : '无'}</span>
                         </div>
                     )}
                </div>

                {!isSuccess && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-600 leading-relaxed">
                            <span className="font-bold text-orange-600">提示：</span>
                            {result?.feedback}
                            {activeTask === 'SERIES' && result?.type === 'PARALLEL' && " 试着拆除中间的支路，让电流只有一条路可走。"}
                            {activeTask === 'PARALLEL' && result?.type === 'SERIES' && " 试着把两个用电器并列连接到电源两端。"}
                        </p>
                    </div>
                )}
            </div>
        )}

        {/* General Tips */}
        {activeTask === 'NONE' && (
            <div className="text-xs text-gray-400 italic text-center mt-10">
                点击上方按钮开始练习
            </div>
        )}
      </div>
    </div>
  );
};

export default TaskPanel;
