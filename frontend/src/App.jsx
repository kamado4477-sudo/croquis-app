import React, { useState, useRef } from 'react';
import { Stage, Layer, Line } from 'react-konva';

function App() {
  const [lines, setLines] = useState([]);
  const isDrawing = useRef(false);

  // 描画開始（ペンが触れたとき）
  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    // 新しい線のデータを追加
    setLines([...lines, { points: [pos.x, pos.y] }]);
  };

  // 描画中（ペンを動かしているとき）
  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    
    // 現在描いている線の座標配列に新しい点を追加
    lastLine.points = lastLine.points.concat([point.x, point.y]);

    // 状態を更新して再描画
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
  };

  // 描画終了（ペンを離したとき）
  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  return (
    <div style={{ backgroundColor: '#f0f0f0', height: '100vh', overflow: 'hidden' }}>
      <h1 style={{ textAlign: 'center', fontSize: '1.2rem', padding: '10px' }}>
        Croquis Canvas (iPad Debug Mode)
      </h1>
      
      {/* 描画エリア */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #ccc', margin: '0 auto', width: '90vw', height: '80vh' }}>
        <Stage
          width={window.innerWidth * 0.9}
          height={window.innerHeight * 0.8}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          style={{ touchAction: 'none' }} // iPadでのスクロールを防止
        >
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke="#df4b26"
                strokeWidth={3}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
              />
            ))}
          </Layer>
        </Stage>
      </div>

      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        <button onClick={() => setLines([])} style={{ padding: '10px 20px' }}>
          クリア
        </button>
      </div>
    </div>
  );
}

export default App;