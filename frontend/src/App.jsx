import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Group } from 'react-konva';
import { Pencil, Eraser, PenTool, Hand, Trash2, Search, Maximize, Grip, Crop, Move, Send, X, Scaling } from 'lucide-react';

// --- 【便利関数】HSVからHEX(カラーコード)への変換 ---
function hsvToHex(h, s, v) {
  s /= 100; v /= 100;
  const k = (n) => (n + h / 60) % 6;
  const f = (n) => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));
  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
}

// --- 【便利関数】HEXからHSVへの変換 ---
function hexToHsv(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return null;
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;
  let d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) h = 0;
  else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

// --- 【完全自作】プロ仕様カラーピッカーコンポーネント ---
const CustomColorPicker = ({ onChange }) => {
  const [hsv, setHsv] = useState({ h: 13, s: 83, v: 87 }); 
  const [hexInput, setHexInput] = useState('#df4b26'); 
  const ringRef = useRef(null); const boxRef = useRef(null);
  const isDraggingHue = useRef(false); const isDraggingSV = useRef(false);

  const updateColor = (newHsv) => {
    setHsv(newHsv);
    const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    setHexInput(hex); onChange(hex);
  };

  const updateHue = (e) => {
    if (!ringRef.current) return;
    const rect = ringRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2; const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    const newH = angle < 0 ? angle + 360 : angle;
    updateColor({ ...hsv, h: newH });
  };

  const updateSV = (e) => {
    if (!boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left; let y = e.clientY - rect.top;
    x = Math.max(0, Math.min(x, rect.width)); y = Math.max(0, Math.min(y, rect.height));
    updateColor({ ...hsv, s: (x / rect.width) * 100, v: (1 - y / rect.height) * 100 });
  };

  const handleHexInputChange = (e) => {
    let val = e.target.value; if (!val.startsWith('#')) val = '#' + val;
    setHexInput(val); if (/^#[0-9A-Fa-f]{6}$/i.test(val)) {
      const newHsv = hexToHsv(val); if (newHsv) { setHsv(newHsv); onChange(val); }
    }
  };

  const ringSize = 160; const ringThickness = 24; const boxSize = 80;
  const hueAngleRad = hsv.h * (Math.PI / 180); const hueRadius = (ringSize - ringThickness) / 2;
  const hueHandleX = ringSize / 2 + hueRadius * Math.cos(hueAngleRad); const hueHandleY = ringSize / 2 + hueRadius * Math.sin(hueAngleRad);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '200px' }}>
      <style>{`
        .hsv-slider { -webkit-appearance: none; width: 100%; height: 12px; border-radius: 6px; outline: none; box-shadow: inset 0 0 2px rgba(0,0,0,0.3); touch-action: none; }
        .hsv-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%; background: white; border: 2px solid #ccc; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
      `}</style>
      <div style={{ position: 'relative', width: ringSize, height: ringSize, userSelect: 'none', touchAction: 'none' }}>
        <div ref={ringRef} onPointerDown={(e) => { e.stopPropagation(); isDraggingHue.current = true; try { e.target.setPointerCapture(e.pointerId); } catch(err){} updateHue(e); }} onPointerMove={(e) => { e.stopPropagation(); if (isDraggingHue.current) updateHue(e); }} onPointerUp={(e) => { e.stopPropagation(); isDraggingHue.current = false; try { e.target.releasePointerCapture(e.pointerId); } catch(err){} }} onPointerCancel={(e) => { e.stopPropagation(); isDraggingHue.current = false; }}
          style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: 'conic-gradient(from 90deg, red, yellow, lime, cyan, blue, magenta, red)', maskImage: `radial-gradient(transparent ${ringSize/2 - ringThickness}px, black ${ringSize/2 - ringThickness + 1}px)`, WebkitMaskImage: `radial-gradient(transparent ${ringSize/2 - ringThickness}px, black ${ringSize/2 - ringThickness + 1}px)`, cursor: 'crosshair' }} />
        <div style={{ position: 'absolute', left: hueHandleX, top: hueHandleY, width: 22, height: 22, transform: 'translate(-50%, -50%)', borderRadius: '50%', backgroundColor: `hsl(${hsv.h}, 100%, 50%)`, border: '3px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.4)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: boxSize, height: boxSize, borderRadius: 4, overflow: 'hidden', backgroundColor: `hsl(${hsv.h}, 100%, 50%)`, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)' }}>
          <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'linear-gradient(to right, #fff 0%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'linear-gradient(to bottom, transparent 0%, #000 100%)', pointerEvents: 'none' }} />
          <div ref={boxRef} onPointerDown={(e) => { e.stopPropagation(); isDraggingSV.current = true; try { e.target.setPointerCapture(e.pointerId); } catch(err){} updateSV(e); }} onPointerMove={(e) => { e.stopPropagation(); if (isDraggingSV.current) updateSV(e); }} onPointerUp={(e) => { e.stopPropagation(); isDraggingSV.current = false; try { e.target.releasePointerCapture(e.pointerId); } catch(err){} }} onPointerCancel={(e) => { e.stopPropagation(); isDraggingSV.current = false; }} style={{ position: 'absolute', width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }} />
          <div style={{ position: 'absolute', left: `${hsv.s}%`, top: `${100 - hsv.v}%`, width: 14, height: 14, transform: 'translate(-50%, -50%)', borderRadius: '50%', border: '2px solid white', boxShadow: '0 0 3px rgba(0,0,0,0.6)', pointerEvents: 'none' }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '12px', width: '12px', fontWeight: 'bold', color: '#555' }}>H</span><input type="range" className="hsv-slider" min="0" max="360" value={Math.round(hsv.h)} onChange={(e) => updateColor({ ...hsv, h: parseInt(e.target.value) })} style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '12px', width: '12px', fontWeight: 'bold', color: '#555' }}>S</span><input type="range" className="hsv-slider" min="0" max="100" value={Math.round(hsv.s)} onChange={(e) => updateColor({ ...hsv, s: parseInt(e.target.value) })} style={{ background: `linear-gradient(to right, ${hsvToHex(hsv.h, 0, hsv.v)}, ${hsvToHex(hsv.h, 100, hsv.v)})` }} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '12px', width: '12px', fontWeight: 'bold', color: '#555' }}>V</span><input type="range" className="hsv-slider" min="0" max="100" value={Math.round(hsv.v)} onChange={(e) => updateColor({ ...hsv, v: parseInt(e.target.value) })} style={{ background: `linear-gradient(to right, #000, ${hsvToHex(hsv.h, hsv.s, 100)})` }} /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', width: '100%' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#555' }}>HEX</span>
        <input type="text" value={hexInput} onChange={handleHexInputChange} data-apple-scribble-disable="true" spellCheck="false" style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', outline: 'none', userSelect: 'text', WebkitUserSelect: 'text' }} />
      </div>
    </div>
  );
};

// --- メインアプリ ---
function App() {
  const [lines, setLines] = useState([]); 
  const [tool, setTool] = useState('pen'); 
  const [refImage, setRefImage] = useState(null); 
  const [pencilOnly, setPencilOnly] = useState(true);
  const [penWidth, setPenWidth] = useState(3);
  const [eraserWidth, setEraserWidth] = useState(20);
  const [penColor, setPenColor] = useState('#df4b26');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false); 
  const [evaluationResult, setEvaluationResult] = useState(null); 

  // ★ 追加：評価モードとキャンバスサイズの状態
  const [evalMode, setEvalMode] = useState('object'); 
  const [baseSize, setBaseSize] = useState({ width: 595, height: 842 }); 

  const mainAreaRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [baseScale, setBaseScale] = useState(1); 
  const [userTransform, setUserTransform] = useState({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [isTransforming, setIsTransforming] = useState(false);
  
  const activePointers = useRef(new Map()); 
  const initialGesture = useRef(null); 
  const isDrawing = useRef(false);
  const currentPoints = useRef([]); 
  const currentLineRef = useRef(null); 
  const layerRef = useRef(null); 
  const paperGroupRef = useRef(null); 

  const [winPos, setWinPos] = useState({ x: 20, y: 80 }); // UIに被らないよう少し下に配置
  const [winSize, setWinSize] = useState({ width: 250, height: 350 }); 
  const [refTransform, setRefTransform] = useState({ x: 0, y: 0, scale: 1 }); 
  const isDraggingWin = useRef(false); const isResizingWin = useRef(false); 
  const dragOffset = useRef({ x: 0, y: 0 });
  const refPointers = useRef(new Map()); const refGesture = useRef(null);

  // ★ 修正：キャンバスサイズが変わった時にもスケールを再計算する
  useEffect(() => {
    const updateSize = () => {
      if (!mainAreaRef.current) return;
      const width = mainAreaRef.current.clientWidth; const height = mainAreaRef.current.clientHeight;
      setStageSize({ width, height });
      setBaseScale(Math.min((width - 40) / baseSize.width, (height - 40) / baseSize.height));
    };
    window.addEventListener('resize', updateSize);
    setTimeout(updateSize, 100); 
    updateSize(); 
    return () => window.removeEventListener('resize', updateSize);
  }, [baseSize]);

  useEffect(() => {
    const preventNative = (e) => e.preventDefault();
    document.addEventListener('gesturestart', preventNative);
    document.addEventListener('gesturechange', preventNative);
    document.addEventListener('gestureend', preventNative);

    const cleanupGhostPointers = (e) => {
      if (e.touches && e.touches.length === 0) {
        const currentPointers = Array.from(activePointers.current.values());
        activePointers.current.clear();
        
        let hasPen = false;
        currentPointers.forEach(p => {
          if (p.pointerType === 'pen' || p.pointerType === 'mouse') {
            activePointers.current.set(p.pointerId, p);
            hasPen = true;
          }
        });

        if (!hasPen) {
          setIsTransforming(false); 
          isDrawing.current = false; 
          initialGesture.current = null;
        }
      }
    };
    window.addEventListener('touchend', cleanupGhostPointers);
    window.addEventListener('touchcancel', cleanupGhostPointers);

    return () => {
      window.removeEventListener('resize', updateSize);
      document.removeEventListener('gesturestart', preventNative);
      document.removeEventListener('gesturechange', preventNative);
      document.removeEventListener('gestureend', preventNative);
      window.removeEventListener('touchend', cleanupGhostPointers);
      window.removeEventListener('touchcancel', cleanupGhostPointers);
    };
  }, []);

  // ★ 追加：お手本画像に合わせてキャンバスサイズを自動/手動で調整する機能
  const matchCanvasToReference = (dataUrl) => {
    const src = dataUrl || refImage;
    if (!src) return;
    const img = new window.Image();
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const MAX_SIZE = 1000;
      if (w > MAX_SIZE || h > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      setBaseSize({ width: w, height: h });
      setUserTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
    };
    img.src = src;
  };

  const handleEvaluate = async () => {
    if (!paperGroupRef.current || isEvaluating) return;
    setIsEvaluating(true);

    try {
      const tempTransform = { ...userTransform };
      setUserTransform({ x: 0, y: 0, scale: 1, rotation: 0 });

      setTimeout(async () => {
        try {
          const dataURL = paperGroupRef.current.toDataURL({ pixelRatio: 1 });
          setUserTransform(tempTransform);

          const res = await fetch(dataURL);
          const sketchBlob = await res.blob();
          
          const formData = new FormData();
          formData.append("sketch", sketchBlob, "sketch.png");
          // ★ 追加：バックエンドにモードを送信
          formData.append("mode", evalMode);

          if (refImage) {
            const refRes = await fetch(refImage);
            const refBlob = await refRes.blob();
            formData.append("reference", refBlob, "reference.png");
          }

          const response = await fetch("http://192.168.1.113:8000/api/evaluate", {
            method: "POST",
            body: formData,
          });

          const result = await response.json();
          if (result.status === "success") {
            setEvaluationResult(result);
          } else {
            alert("エラー: " + result.error);
          }
        } catch (err) {
          alert("通信エラー: " + err.message);
        } finally {
          setIsEvaluating(false);
        }
      }, 100);
    } catch (error) {
      setIsEvaluating(false);
      alert("送信準備失敗");
    }
  };

  const handleWinPointerDown = (e) => { 
    e.stopPropagation(); isDraggingWin.current = true; dragOffset.current = { x: e.clientX - winPos.x, y: e.clientY - winPos.y }; 
    try { e.target.setPointerCapture(e.pointerId); } catch(err){}
  };
  const handleWinPointerMove = (e) => { e.stopPropagation(); if (!isDraggingWin.current) return; setWinPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
  const handleWinPointerUp = (e) => { 
    e.stopPropagation(); isDraggingWin.current = false; 
    try { e.target.releasePointerCapture(e.pointerId); } catch(err){} 
  };

  const handleResizePointerDown = (e) => { 
    e.stopPropagation(); isResizingWin.current = true; 
    try { e.target.setPointerCapture(e.pointerId); } catch(err){} 
  };
  const handleResizePointerMove = (e) => { e.stopPropagation(); if (!isResizingWin.current) return; setWinSize({ width: Math.max(150, e.clientX - winPos.x), height: Math.max(200, e.clientY - winPos.y) }); };
  const handleResizePointerUp = (e) => { 
    e.stopPropagation(); isResizingWin.current = false; 
    try { e.target.releasePointerCapture(e.pointerId); } catch(err){} 
  };

  const handleRefImgPointerDown = (e) => { 
    e.stopPropagation(); 
    refPointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY }); 
    
    if (refPointers.current.size === 2) { 
      const pts = Array.from(refPointers.current.values()); 
      const dist = Math.hypot(pts[1].clientX - pts[0].clientX, pts[1].clientY - pts[0].clientY); 
      refGesture.current = { type: 'zoom', dist: dist, scale: refTransform.scale }; 
    } else if (refPointers.current.size === 1) { 
      refGesture.current = { type: 'pan', startX: e.clientX, startY: e.clientY, originX: refTransform.x, originY: refTransform.y }; 
    } 
    try { e.target.setPointerCapture(e.pointerId); } catch(err){} 
  };
  
  const handleRefImgPointerMove = (e) => { 
    e.stopPropagation(); 
    if (!refPointers.current.has(e.pointerId)) return; 
    refPointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY }); 
    
    if (refPointers.current.size === 2 && refGesture.current?.type === 'zoom') { 
      const pts = Array.from(refPointers.current.values()); 
      const dist = Math.hypot(pts[1].clientX - pts[0].clientX, pts[1].clientY - pts[0].clientY); 
      if (refGesture.current.dist > 0) {
        const newScale = Math.max(0.5, Math.min(refGesture.current.scale * (dist / refGesture.current.dist), 10));
        if (!isNaN(newScale)) setRefTransform(prev => ({ ...prev, scale: newScale }));
      }
    } else if (refPointers.current.size === 1 && refGesture.current?.type === 'pan') { 
      const newX = refGesture.current.originX + (e.clientX - refGesture.current.startX);
      const newY = refGesture.current.originY + (e.clientY - refGesture.current.startY);
      if (!isNaN(newX) && !isNaN(newY)) setRefTransform(prev => ({ ...prev, x: newX, y: newY }));
    } 
  };
  
  const handleRefImgPointerUp = (e) => { 
    e.stopPropagation(); refPointers.current.delete(e.pointerId); 
    if (refPointers.current.size < 2 && refGesture.current?.type === 'zoom') refGesture.current = null; 
    if (refPointers.current.size === 0) refGesture.current = null; 
    try { e.target.releasePointerCapture(e.pointerId); } catch(err){} 
  };

  const getPointers = () => { 
    const pts = Array.from(activePointers.current.values()); 
    return { touches: pts.filter(p => p.pointerType === 'touch'), pens: pts.filter(p => p.pointerType === 'pen' || p.pointerType === 'mouse') }; 
  };

  const handlePointerDown = (e) => {
    if (showColorPicker) setShowColorPicker(false);
    const pInfo = { pointerId: e.evt.pointerId, clientX: e.evt.clientX, clientY: e.evt.clientY, pointerType: e.evt.pointerType };
    activePointers.current.set(e.evt.pointerId, pInfo);
    
    const { touches, pens } = getPointers();
    if (touches.length === 2 && pens.length === 0) { 
      isDrawing.current = false; setIsTransforming(true); 
      const p1 = touches[0]; const p2 = touches[1]; 
      const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      initialGesture.current = { dist: dist, angle: Math.atan2(p2.clientY - p1.clientY, p2.clientX - p1.clientX), cx: (p1.clientX + p2.clientX) / 2, cy: (p1.clientY + p2.clientY) / 2, scale: userTransform.scale, rotation: userTransform.rotation, x: userTransform.x, y: userTransform.y }; 
      return; 
    }
    
    const isPen = e.evt.pointerType === 'pen' || e.evt.pointerType === 'mouse';
    const canDraw = (pens.length === 1 && isPen) || (!pencilOnly && touches.length === 1 && pens.length === 0 && e.evt.pointerType === 'touch');
    if (canDraw) { 
      const pos = e.target.getStage().getPointerPosition(); 
      if (!pos) return; 
      isDrawing.current = true; 
      const transform = paperGroupRef.current.getAbsoluteTransform().copy().invert(); 
      const pt = transform.point(pos); 
      currentPoints.current = [pt.x, pt.y]; 
      if (currentLineRef.current) { 
        currentLineRef.current.globalCompositeOperation(tool === 'eraser' ? 'destination-out' : 'source-over'); 
        currentLineRef.current.strokeWidth(tool === 'eraser' ? eraserWidth : penWidth); 
        currentLineRef.current.points(currentPoints.current); 
        layerRef.current.batchDraw(); 
      } 
    }
  };

  const handlePointerMove = (e) => {
    e.evt.preventDefault();
    const pInfo = { pointerId: e.evt.pointerId, clientX: e.evt.clientX, clientY: e.evt.clientY, pointerType: e.evt.pointerType };
    if (activePointers.current.has(e.evt.pointerId)) activePointers.current.set(e.evt.pointerId, pInfo); 
    
    const { touches, pens } = getPointers();
    if (isTransforming && touches.length === 2 && initialGesture.current) { 
      const p1 = touches[0]; const p2 = touches[1]; 
      const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY); 
      if (initialGesture.current.dist > 0) {
        const angle = Math.atan2(p2.clientY - p1.clientY, p2.clientX - p1.clientX); 
        const cx = (p1.clientX + p2.clientX) / 2; const cy = (p1.clientY + p2.clientY) / 2; 
        const scaleRatio = dist / initialGesture.current.dist; 
        const angleDiff = angle - initialGesture.current.angle; 
        let rawRotation = initialGesture.current.rotation + angleDiff * (180 / Math.PI); 
        const snappedRotation = Math.round(rawRotation / 90) * 90; 
        if (Math.abs(rawRotation - snappedRotation) < 5) rawRotation = snappedRotation; 
        
        const newScale = Math.max(0.2, Math.min(initialGesture.current.scale * scaleRatio, 5));
        const newX = initialGesture.current.x + (cx - initialGesture.current.cx);
        const newY = initialGesture.current.y + (cy - initialGesture.current.cy);
        if (!isNaN(newScale) && !isNaN(newX) && !isNaN(newY)) {
          setUserTransform({ scale: newScale, rotation: rawRotation, x: newX, y: newY }); 
        }
      }
      return; 
    } 
    if (isDrawing.current) { 
      const isPen = e.evt.pointerType === 'pen' || e.evt.pointerType === 'mouse'; 
      if (pens.length > 0 && !isPen) return; 
      const pos = e.target.getStage().getPointerPosition(); 
      if (!pos) return; 
      const transform = paperGroupRef.current.getAbsoluteTransform().copy().invert(); 
      const pt = transform.point(pos); 
      currentPoints.current.push(pt.x, pt.y); 
      if (currentLineRef.current) { currentLineRef.current.points(currentPoints.current); layerRef.current.batchDraw(); } 
    } 
  };

  const removePointer = (e) => {
    activePointers.current.delete(e.evt.pointerId);
    const { touches, pens } = getPointers();
    if (isTransforming && touches.length < 2) { setIsTransforming(false); initialGesture.current = null; }
    if (isDrawing.current) { 
      const isPen = e.evt.pointerType === 'pen' || e.evt.pointerType === 'mouse'; 
      if ((isPen) || (!pencilOnly && touches.length === 0 && pens.length === 0)) { 
        isDrawing.current = false; 
        setLines([...lines, { points: [...currentPoints.current], tool: tool, width: tool === 'eraser' ? eraserWidth : penWidth, color: tool === 'eraser' ? null : penColor }]); 
        currentPoints.current = []; 
        if (currentLineRef.current) { currentLineRef.current.points([]); layerRef.current.batchDraw(); } 
      } 
    }
  };

  const resetTransform = () => setUserTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
  const resetRefTransform = () => setRefTransform({ x: 0, y: 0, scale: 1 }); 

  const containerStyle = { display: 'flex', flexDirection: 'row', width: '100vw', height: '100dvh', overflow: 'hidden', backgroundColor: '#dcdcdc', fontFamily: 'sans-serif', touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' };
  const mainAreaStyle = { flex: 1, height: '100%', position: 'relative', overflow: 'hidden' };
  const sideBarStyle = { width: '45px', height: '100%', backgroundColor: '#eee', borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: '15px' };
  const toolbarStyle = { width: '75px', height: '100%', backgroundColor: '#fcfcfc', borderLeft: '1px solid #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: '15px', flexShrink: 0 };
  const buttonBaseStyle = { width: '55px', height: '55px', borderRadius: '15px', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '4px', transition: 'all 0.2s' };
  const activeButtonStyle = (isActive) => ({ ...buttonBaseStyle, backgroundColor: isActive ? '#df4b26' : '#eee', color: isActive ? 'white' : '#333', boxShadow: isActive ? '0 4px 8px rgba(223,75,38,0.3)' : 'none' });
  const functionButtonStyle = { ...buttonBaseStyle, backgroundColor: '#eee', color: '#df4b26', fontSize: '9px' };

  return (
    <div style={containerStyle}>
      <div style={mainAreaStyle} ref={mainAreaRef}>
        
        {/* --- ★ 【新UI】モード切り替えボタン --- */}
        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 50, display: 'flex', gap: '10px' }}>
          <button onClick={() => setEvalMode('object')} style={{ padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', backgroundColor: evalMode === 'object' ? '#df4b26' : '#fff', color: evalMode === 'object' ? '#fff' : '#555', border: '2px solid #df4b26', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>ものモード</button>
          <button onClick={() => setEvalMode('human')} style={{ padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', backgroundColor: evalMode === 'human' ? '#df4b26' : '#fff', color: evalMode === 'human' ? '#fff' : '#555', border: '2px solid #df4b26', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>人体モード</button>
        </div>

        {isTransforming && (<div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', fontSize: '14px', fontWeight: 'bold', color: 'rgba(0,0,0,0.6)', backgroundColor: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: '4px', pointerEvents: 'none', zIndex: 110 }}>{Math.round((userTransform.rotation % 360 + 360) % 360)}°</div>)}
        <button style={{ position: 'absolute', bottom: '20px', right: '20px', backgroundColor: 'rgba(255,255,255,0.7)', border: '1px solid #ccc', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 5 }} onClick={() => setUserTransform({ x: 0, y: 0, scale: 1, rotation: 0 })}><Maximize size={24} /></button>
        
        <Stage width={stageSize.width} height={stageSize.height} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={removePointer}>
          <Layer>
            {/* ★ baseSize を適用 */}
            <Group offsetX={baseSize.width/2} offsetY={baseSize.height/2} x={stageSize.width/2 + userTransform.x} y={stageSize.height/2 + userTransform.y} scaleX={baseScale * userTransform.scale} scaleY={baseScale * userTransform.scale} rotation={userTransform.rotation}>
              <Rect width={baseSize.width} height={baseSize.height} fill="white" shadowBlur={10} shadowColor="rgba(0,0,0,0.3)" />
            </Group>
          </Layer>
          <Layer ref={layerRef}>
            <Group ref={paperGroupRef} offsetX={baseSize.width/2} offsetY={baseSize.height/2} x={stageSize.width/2 + userTransform.x} y={stageSize.height/2 + userTransform.y} scaleX={baseScale * userTransform.scale} scaleY={baseScale * userTransform.scale} rotation={userTransform.rotation} clipX={0} clipY={0} clipWidth={baseSize.width} clipHeight={baseSize.height}>
              {lines.map((line, i) => (
                <Line 
                  key={i} 
                  points={line.points} 
                  stroke={line.tool === 'eraser' ? '#df4b26' : (line.color || '#df4b26')} 
                  strokeWidth={line.width} 
                  tension={0.5} 
                  lineCap="round" 
                  lineJoin="round" 
                  globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'} 
                  listening={false}
                  perfectDrawEnabled={false}
                />
              ))}
              <Line 
                ref={currentLineRef} 
                points={[]} 
                stroke={tool === 'eraser' ? '#df4b26' : penColor} 
                tension={0.5} 
                lineCap="round" 
                lineJoin="round" 
                listening={false}
                perfectDrawEnabled={false}
              />
            </Group>
          </Layer>
        </Stage>

        <div style={{ position: 'absolute', top: winPos.y, left: winPos.x, width: winSize.width, height: winSize.height, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '12px', boxShadow: '0 6px 16px rgba(0,0,0,0.15)', zIndex: 100, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onPointerDown={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', borderBottom: '1px solid #eee', backgroundColor: '#f5f5f5' }} onPointerDown={handleWinPointerDown} onPointerMove={handleWinPointerMove} onPointerUp={handleWinPointerUp}><div style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Search size={14} /> お手本</div></div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#fafafa' }} onPointerDown={handleRefImgPointerDown} onPointerMove={handleRefImgPointerMove} onPointerUp={handleRefImgPointerUp}>{refImage && <img src={refImage} alt="ref" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', transform: `translate(${refTransform.x}px, ${refTransform.y}px) scale(${refTransform.scale})` }} />}</div>
          
          <div style={{ padding: '8px', borderTop: '1px solid #eee', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input type="file" accept="image/*" onChange={(e) => { 
                const file = e.target.files[0]; 
                if (file) { 
                  const r = new FileReader(); 
                  r.onload = (ev) => {
                    const dataUrl = ev.target.result;
                    setRefImage(dataUrl);
                    resetRefTransform();
                    // ★ 画像アップロード時、ものモードなら自動でキャンバスサイズを合わせる
                    if (evalMode === 'object') {
                      matchCanvasToReference(dataUrl);
                    }
                  };
                  r.readAsDataURL(file); 
                } 
              }} style={{ fontSize: '10px' }} />
            {refImage && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button onClick={resetRefTransform} style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>位置リセット</button>
                <button onClick={() => matchCanvasToReference()} style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px', cursor: 'pointer', color: '#0050b3', display: 'flex', alignItems: 'center', gap: '3px' }}><Scaling size={12} /> キャンバスを合わせる</button>
                <button onClick={() => { setBaseSize({ width: 595, height: 842 }); setUserTransform({ x: 0, y: 0, scale: 1, rotation: 0 }); }} style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#fff0f6', border: '1px solid #ffadd2', borderRadius: '4px', cursor: 'pointer', color: '#c41d7f' }}>A4に戻す</button>
              </div>
            )}
          </div>
          
          <div style={{ position: 'absolute', right: '4px', bottom: '4px', cursor: 'nwse-resize' }} onPointerDown={handleResizePointerDown} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp}><Grip size={18} color="#ccc" /></div>
        </div>

        {/* --- ★ 【新UI】歪まない横スクロールの結果表示 --- */}
        {evaluationResult && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', touchAction: 'none' }}>
            <div style={{ width: '100%', maxWidth: '1400px', display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff', margin: '0 0 5px 0' }}>Score: {evaluationResult.score}</h2>
                  <p style={{ fontSize: '16px', color: '#ddd', margin: 0 }}>{evaluationResult.evaluation_message}</p>
                </div>
                <button onClick={() => setEvaluationResult(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={32} color="#fff" /></button>
              </div>

              <div style={{ flex: 1, display: 'flex', gap: '20px', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '10px', alignItems: 'center' }}>
                <div style={{ flex: '0 0 auto', width: 'min(80vw, 400px)', height: '100%', maxHeight: '80vh', backgroundColor: '#222', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                  <span style={{ color: '#aaa', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>① お手本画像</span>
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img src={`data:image/png;base64,${evaluationResult.images?.reference}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', backgroundColor: '#fff' }} />
                  </div>
                </div>
                <div style={{ flex: '0 0 auto', width: 'min(80vw, 400px)', height: '100%', maxHeight: '80vh', backgroundColor: '#222', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                  <span style={{ color: '#aaa', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>② あなたの線</span>
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img src={`data:image/png;base64,${evaluationResult.images?.sketch}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', backgroundColor: '#fff' }} />
                  </div>
                </div>
                <div style={{ flex: '0 0 auto', width: 'min(80vw, 400px)', height: '100%', maxHeight: '80vh', backgroundColor: '#222', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                  <span style={{ color: '#aaa', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>③ お手本のエッジ</span>
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img src={`data:image/png;base64,${evaluationResult.images?.edge}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', backgroundColor: '#fff' }} />
                  </div>
                </div>
                <div style={{ flex: '0 0 auto', width: 'min(80vw, 400px)', height: '100%', maxHeight: '80vh', backgroundColor: '#222', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                  <span style={{ color: '#aaa', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>④ 評価（緑:正解 / 赤:ズレ）</span>
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img src={`data:image/png;base64,${evaluationResult.images?.overlay}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', backgroundColor: '#fff' }} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => setEvaluationResult(null)} style={{ padding: '12px 40px', backgroundColor: '#df4b26', color: 'white', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold' }}>閉じる</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={sideBarStyle}>
        <div style={{ color: '#df4b26', fontWeight: 'bold' }}>{tool === 'pen' ? <Pencil size={24} /> : <Eraser size={24} />}</div>
        <input type="range" min="1" max={tool === 'pen' ? "25" : "100"} value={tool === 'pen' ? penWidth : eraserWidth} onChange={(e) => { const v = parseInt(e.target.value); tool === 'pen' ? setPenWidth(v) : setEraserWidth(v); }} style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical', width: '20px', height: '60%', accentColor: '#df4b26' }} />
        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{tool === 'pen' ? penWidth : eraserWidth}px</div>
      </div>

      <div style={toolbarStyle}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button style={activeButtonStyle(tool === 'pen')} onClick={() => setTool('pen')}><Pencil size={24} /><span style={{fontSize:'10px'}}>ペン</span></button>
          <div onClick={() => { setTool('pen'); setShowColorPicker(!showColorPicker); }} style={{ marginTop: '10px', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: penColor, border: '3px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', cursor: 'pointer' }} />
          {showColorPicker && (<div style={{ position: 'absolute', right: '85px', top: '0', backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center' }}><div style={{ fontSize: '14px', fontWeight: 'bold', color: '#555', marginBottom: '12px', width: '100%', textAlign: 'left' }}>カラー設定</div><CustomColorPicker onChange={(hex) => setPenColor(hex)} /></div>)}
        </div>
        <button style={activeButtonStyle(tool === 'eraser')} onClick={() => setTool('eraser')}><Eraser size={24} /><span style={{fontSize:'10px'}}>消しゴム</span></button>
        <button style={{ ...activeButtonStyle(pencilOnly), gap: '2px' }} onClick={() => setPencilOnly(!pencilOnly)}>{pencilOnly ? <PenTool size={24} /> : <Hand size={24} />}<span style={{fontSize:'9px', lineHeight:'1.1'}}>{pencilOnly ? "ペン\n限定" : "指＋\nペン"}</span></button>
        <div style={{ flex: 1 }} />
        <button style={functionButtonStyle} onClick={() => setLines([])}><Trash2 size={24} /><span>全消去</span></button>
        <button style={{ ...functionButtonStyle, color: isEvaluating ? '#ccc' : '#28a745', border: '1px solid #28a745' }} onClick={handleEvaluate} disabled={isEvaluating}><Send size={24} /><span>{isEvaluating ? "..." : "評価"}</span></button>
      </div>
    </div>
  );
}

export default App;