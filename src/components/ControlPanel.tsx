/* ===== 控制面板组件 ===== */

import React from 'react';
import ColorPreview from './ColorPreview';
import type { RgbColor } from '../types';

interface ControlPanelProps {
  selectedColor: RgbColor | null;
  tolerance: number;
  hasContour: boolean;
  onToleranceChange: (val: number) => void;
  onPreview: () => void;
  onConfirm: () => void;
  onSkip: () => void;
  onUndo: () => void;
  canUndo: boolean;
  currentIndex: number;
  totalCount: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedColor,
  tolerance,
  hasContour,
  onToleranceChange,
  onPreview,
  onConfirm,
  onSkip,
  onUndo,
  canUndo,
  currentIndex,
  totalCount,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-base-200 rounded-box">
      {/* 左侧：颜色预览 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">🎨</span>
        <ColorPreview color={selectedColor} />
      </div>

      {/* 中间：容差滑块 */}
      <div className="flex items-center gap-3 flex-1 min-w-[200px]">
        <span className="text-sm font-medium whitespace-nowrap">容差</span>
        <input
          type="range"
          min={1}
          max={100}
          value={tolerance}
          onChange={(e) => onToleranceChange(Number(e.target.value))}
          className="range range-primary range-xs flex-1"
        />
        <span className="text-sm font-mono w-8 text-right">{tolerance}</span>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2">
        <button
          className="btn btn-ghost btn-sm"
          onClick={onUndo}
          disabled={!canUndo}
        >
          ↩ 撤销
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={onPreview}
          disabled={!hasContour || !selectedColor}
        >
          👁 预览
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onSkip}>
          跳过
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={onConfirm}
          disabled={!hasContour || !selectedColor}
        >
          ✓ 确认 {currentIndex + 1}/{totalCount}
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
