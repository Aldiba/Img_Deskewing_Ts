/* ===== 颜色预览组件 ===== */

import React from 'react';
import type { RgbColor } from '../types';

interface ColorPreviewProps {
  color: RgbColor | null;
}

const ColorPreview: React.FC<ColorPreviewProps> = ({ color }) => {
  const hexColor = color
    ? `#${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`
    : '#ffffff';

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-box border border-base-content/20"
        style={{ backgroundColor: hexColor }}
      />
      <div className="text-sm font-mono">
        {color
          ? `RGB(${color[0]}, ${color[1]}, ${color[2]})`
          : '未选择'}
      </div>
    </div>
  );
};

export default ColorPreview;
