(() => {
      const qs = new URLSearchParams(location.search);
      const mode = (qs.get('mode') || 'control').toLowerCase();
      const initialRoom = qs.get('room') || '';
      const isProjection = mode === 'projection';
      document.body.classList.toggle('projection-mode', isProjection);

      const baseCanvas = document.getElementById('baseCanvas');
      const drawCanvas = document.getElementById('drawCanvas');
      const fxCanvas = document.getElementById('fxCanvas');
      const baseCtx = baseCanvas.getContext('2d');
      const drawCtx = drawCanvas.getContext('2d');
      const fxCtx = fxCanvas.getContext('2d');
      const crosshair = document.getElementById('crosshair');

      const roomInput = document.getElementById('roomInput');
      const connectBtn = document.getElementById('connectBtn');
      const copyControlLinkBtn = document.getElementById('copyControlLinkBtn');
      const copyProjectionLinkBtn = document.getElementById('copyProjectionLinkBtn');
      const fullscreenBtn = document.getElementById('fullscreenBtn');
      const projectionFullscreenBtn = document.getElementById('projectionFullscreenBtn');
      const projectionHudBtn = document.getElementById('projectionHudBtn');
      const toggleToolbarBtn = document.getElementById('toggleToolbarBtn');
      const toolbar = document.getElementById('toolbar');
      const penDockRoot = document.getElementById('penDockRoot');
      const penDock = document.getElementById('penDock');
      const toolsPanel = document.getElementById('toolsPanel');
      const penMenuToggle = document.getElementById('penMenuToggle');
      const dockHandle = document.getElementById('dockHandle');
      const quickPaletteBtn = document.getElementById('quickPaletteBtn');
      const quickUndoBtn = document.getElementById('quickUndoBtn');
      const quickRedoBtn = document.getElementById('quickRedoBtn');
      const quickClearBtn = document.getElementById('quickClearBtn');
      const quickSaveBtn = document.getElementById('quickSaveBtn');
      const brushesPanel = document.getElementById('brushesPanel');
      const colorsPanel = document.getElementById('colorsPanel');
      const panelTitle = document.getElementById('panelTitle');
      const adjustPanel = document.getElementById('adjustPanel');
      const dockPositionButtons = document.querySelectorAll('.dock-pos-btn');
      const colorCard = document.getElementById('colorCard');
      const floatLockBtn = document.getElementById('floatLockBtn');
      const quickHideBtn = document.getElementById('quickHideBtn');
      const quickFullscreenBtn = document.getElementById('quickFullscreenBtn');
      const modeLabel = document.getElementById('modeLabel');
      const peerRoleLabel = document.getElementById('peerRoleLabel');
      const roomReadout = document.getElementById('roomReadout');
      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');
      const toolReadout = document.getElementById('toolReadout');
      const colorInput = document.getElementById('colorInput');
      const adjustHandle = document.getElementById('adjustHandle');
      const sizeInput = document.getElementById('sizeInput');
      const alphaInput = document.getElementById('alphaInput');
      const glowInput = document.getElementById('glowInput');
      const sizeValue = document.getElementById('sizeValue');
      const alphaValue = document.getElementById('alphaValue');
      const glowValue = document.getElementById('glowValue');
      const loadImageBtn = document.getElementById('loadImageBtn');
      const fitImageBtn = document.getElementById('fitImageBtn');
      const imageInput = document.getElementById('imageInput');
      const clearBtn = document.getElementById('clearBtn');
      const toggleImageBtn = document.getElementById('toggleImageBtn');
      const undoBtn = document.getElementById('undoBtn');
      const redoBtn = document.getElementById('redoBtn');
      const paletteChips = document.getElementById('paletteChips');
      const controlShell = document.getElementById('controlShell');
      const fabBar = document.getElementById('fabBar');
      const projectionUi = document.getElementById('projectionUi');
      const toggleHudBtn = document.getElementById('toggleHudBtn');
      const blackBgBtn = document.getElementById('blackBgBtn');
      const hud = document.getElementById('hud');

      // Evitar que el clic derecho del S-Pen abra el menú del navegador
      drawCanvas.addEventListener('contextmenu', e => e.preventDefault());

      const palette = ['#72f2ff', '#ffffff', '#ff4d8d', '#9a7cff', '#2dfc98', '#ffd166', '#ff7b00', '#00e5ff', '#f4f4f4', '#e91e63'];
      palette.forEach(color => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.style.background = color;
        chip.title = color;
        chip.addEventListener('click', () => {
          state.color = color;
          syncUiFromState();
          broadcastState(); 
        });
        paletteChips.appendChild(chip);
      });

      modeLabel.textContent = isProjection ? 'PROJECTION MODE' : 'CONTROL MODE';
      peerRoleLabel.textContent = isProjection ? 'Projection' : 'Control';
      roomInput.value = initialRoom;
      
      if (isProjection) {
        controlShell.classList.add('hidden-in-projection');
        fabBar.classList.add('hidden-in-projection');
        adjustPanel.classList.add('hidden-in-projection');
      } else {
        projectionUi.classList.add('hidden-in-projection');
      }

      const DEFAULT_TOOL_PROFILES = {
        brush: { color: '#72f2ff', size: 12, alpha: 1, glow: 0.12, label: 'Bolígrafo' },
        eraser: { color: '#72f2ff', size: 24, alpha: 1, glow: 0, label: 'Borrador rápido' },
        neon: { color: '#72f2ff', size: 18, alpha: 0.96, glow: 0.72, label: 'Neón' },
        spray: { color: '#72f2ff', size: 28, alpha: 0.28, glow: 0.12, label: 'Aerógrafo suave' }
      };

      const DEFAULT_GLOBAL_OVERRIDES = {
        size: null,
        alpha: null,
        glow: null,
      };

      const TOOL_PROFILE_KEYS = {
        brush: 'brush',
        eraser: 'eraser',
        neon: 'neon',
        spray: 'spray'
      };

      function cloneToolProfiles(source = DEFAULT_TOOL_PROFILES) {
        return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, { ...value }]));
      }

      function normalizeGlobalOverrides(overrides) {
        const next = { ...DEFAULT_GLOBAL_OVERRIDES };
        if (!overrides || typeof overrides !== 'object') return next;
        ['size', 'alpha', 'glow'].forEach(key => {
          const value = overrides[key];
          next[key] = value == null || value === '' || Number.isNaN(Number(value)) ? null : Number(value);
        });
        return next;
      }

      const state = {
        roomId: initialRoom || '',
        tool: 'brush',
        color: DEFAULT_TOOL_PROFILES.brush.color,
        size: DEFAULT_TOOL_PROFILES.brush.size,
        alpha: DEFAULT_TOOL_PROFILES.brush.alpha,
        glow: DEFAULT_TOOL_PROFILES.brush.glow,
        toolProfiles: cloneToolProfiles(),
        globalOverrides: { ...DEFAULT_GLOBAL_OVERRIDES },
        blackBg: true,
        baseImageVisible: true,
        baseImageData: null,
        baseImageObject: null,
        baseImageRect: null,
        baseImageRectNorm: null,
        history: [],
        redo: [],
        pointerDown: false,
        activeStroke: null,

        // Variables para soporte temporal del S-Pen
        isStylusEraser: false,
        previousTool: null,

        ui: {
          dockSide: 'right',
          dockOffset: 96,
          penPanelOpen: false,
          panelView: 'brushes',
          activePresetLabel: 'Bolígrafo',
          panelsLocked: true,
          adjustPanelX: 16,
          adjustPanelY: 74,
          isPanelDragging: false
        }
      };

      let peer = null;
      let conn = null;
      let peerOpen = false;
      let reconnectTimer = null;
      let dockDrag = null;
      let adjustDrag = null;

      try {
        state.ui.dockSide = localStorage.getItem('penDockSide') || 'right';
        state.ui.dockOffset = Number(localStorage.getItem('penDockOffset') || 96);
        state.ui.penPanelOpen = false;
        state.ui.panelView = localStorage.getItem('penPanelView') || 'brushes';
        state.ui.activePresetLabel = localStorage.getItem('penActivePresetLabel') || 'Bolígrafo';
        state.ui.panelsLocked = localStorage.getItem('floatingPanelsLocked') !== '0';
        state.ui.adjustPanelX = Number(localStorage.getItem('adjustPanelX') || 16);
        state.ui.adjustPanelY = Number(localStorage.getItem('adjustPanelY') || 74);
        const storedOverrides = localStorage.getItem('globalOverrides');
        if (storedOverrides) {
          state.globalOverrides = normalizeGlobalOverrides(JSON.parse(storedOverrides));
        }
      } catch (_) {}

      loadToolProfile(state.tool);

      function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
      }

      function getProfileKey(tool = state.tool) {
        return TOOL_PROFILE_KEYS[tool] || 'brush';
      }

      function ensureToolProfile(tool = state.tool) {
        const key = getProfileKey(tool);
        if (!state.toolProfiles[key]) {
          state.toolProfiles[key] = { ...(DEFAULT_TOOL_PROFILES[key] || DEFAULT_TOOL_PROFILES.brush) };
        }
        return state.toolProfiles[key];
      }

      function normalizeToolProfiles(profiles) {
        const next = cloneToolProfiles();
        if (!profiles || typeof profiles !== 'object') return next;
        Object.keys(next).forEach(key => {
          if (profiles[key] && typeof profiles[key] === 'object') {
            next[key] = { ...next[key], ...profiles[key] };
          }
        });
        return next;
      }

      function hasGlobalOverride(key) {
        return state.globalOverrides[key] != null;
      }

      function getEffectiveToolNumeric(tool, key) {
        const profile = ensureToolProfile(tool);
        if (hasGlobalOverride(key)) return Number(state.globalOverrides[key]);
        return Number(profile[key] ?? DEFAULT_TOOL_PROFILES[getProfileKey(tool)][key]);
      }

      function saveCurrentToolProfile() {
        const profile = ensureToolProfile(state.tool);
        profile.color = state.color;
        if (!hasGlobalOverride('size')) profile.size = state.size;
        if (!hasGlobalOverride('alpha')) profile.alpha = state.alpha;
        if (!hasGlobalOverride('glow')) profile.glow = state.glow;
        profile.label = state.ui.activePresetLabel || profile.label || DEFAULT_TOOL_PROFILES[getProfileKey(state.tool)].label;
      }

      function loadToolProfile(tool = state.tool) {
        const profile = ensureToolProfile(tool);
        state.size = getEffectiveToolNumeric(tool, 'size');
        state.alpha = getEffectiveToolNumeric(tool, 'alpha');
        state.glow = getEffectiveToolNumeric(tool, 'glow');
        state.color = profile.color || DEFAULT_TOOL_PROFILES[getProfileKey(tool)].color;
        state.ui.activePresetLabel = profile.label || DEFAULT_TOOL_PROFILES[getProfileKey(tool)].label;
      }

      function setGlobalOverride(key, value) {
        state.globalOverrides[key] = Number(value);
        if (key === 'size') state.size = Number(value);
        if (key === 'alpha') state.alpha = Number(value);
        if (key === 'glow') state.glow = Number(value);
        persistUiState();
      }

      function persistUiState() {
        try {
          localStorage.setItem('penDockSide', state.ui.dockSide);
          localStorage.setItem('penDockOffset', String(Math.round(state.ui.dockOffset)));
          localStorage.setItem('penPanelOpen', state.ui.penPanelOpen ? '1' : '0');
          localStorage.setItem('penPanelView', state.ui.panelView);
          localStorage.setItem('penActivePresetLabel', state.ui.activePresetLabel || '');
          localStorage.setItem('floatingPanelsLocked', state.ui.panelsLocked ? '1' : '0');
          localStorage.setItem('adjustPanelX', String(Math.round(state.ui.adjustPanelX)));
          localStorage.setItem('adjustPanelY', String(Math.round(state.ui.adjustPanelY)));
          localStorage.setItem('globalOverrides', JSON.stringify(state.globalOverrides));
        } catch (_) {}
      }

      function approxEqual(a, b) {
        return Math.abs(Number(a) - Number(b)) < 0.001;
      }

      function buttonMatchesState(btn) {
        if (!btn.dataset.tool || btn.dataset.tool !== state.tool) return false;
        if (btn.classList.contains('quick-tool-btn')) return true;

        if (btn.dataset.label && state.ui.activePresetLabel) {
          return btn.dataset.label === state.ui.activePresetLabel;
        }

        if (!hasGlobalOverride('size') && btn.dataset.size && !approxEqual(btn.dataset.size, state.size)) return false;
        if (!hasGlobalOverride('alpha') && btn.dataset.alpha && !approxEqual(btn.dataset.alpha, state.alpha)) return false;
        if (!hasGlobalOverride('glow') && btn.dataset.glow && !approxEqual(btn.dataset.glow, state.glow)) return false;
        if (btn.dataset.color && btn.dataset.color.toLowerCase() !== state.color.toLowerCase()) return false;
        return true;
      }

      function updatePanelModeUi() {
        const open = state.ui.penPanelOpen;
        const brushesViewActive = open && state.ui.panelView === 'brushes';
        const colorsViewActive = open && state.ui.panelView === 'colors';

        toolsPanel.classList.toggle('is-collapsed', !open);
        brushesPanel.classList.toggle('is-active', brushesViewActive);
        colorsPanel.classList.toggle('is-active', colorsViewActive);

        penMenuToggle.classList.toggle('active', brushesViewActive);
        quickPaletteBtn.classList.toggle('active', colorsViewActive);

        panelTitle.textContent = state.ui.panelView === 'colors' ? 'Color' : 'Pinceles';
      }

      function setPanelView(view) {
        state.ui.panelView = view === 'colors' ? 'colors' : 'brushes';
        updatePanelModeUi();
        persistUiState();
        requestAnimationFrame(applyDockPosition);
      }

      function togglePenPanel(force) {
        state.ui.penPanelOpen = typeof force === 'boolean' ? force : !state.ui.penPanelOpen;
        updatePanelModeUi();
        persistUiState();
        requestAnimationFrame(applyDockPosition);
      }

      function applyDockPosition() {
        if (!penDockRoot) return;
        penDockRoot.dataset.side = state.ui.dockSide;
        const side = state.ui.dockSide;
        const margin = 16;
        const topSafe = 84;
        const rootRect = penDockRoot.getBoundingClientRect();
        if (side === 'left' || side === 'right') {
          const top = clamp(state.ui.dockOffset, topSafe, Math.max(topSafe, window.innerHeight - rootRect.height - 16));
          penDockRoot.style.top = top + 'px';
          penDockRoot.style.bottom = 'auto';
          penDockRoot.style.left = side === 'left' ? margin + 'px' : 'auto';
          penDockRoot.style.right = side === 'right' ? margin + 'px' : 'auto';
        } else {
          const topValue = side === 'top' ? topSafe : (window.innerHeight - rootRect.height - 16);
          const left = clamp(state.ui.dockOffset, 16, Math.max(16, window.innerWidth - rootRect.width - 16));
          penDockRoot.style.left = left + 'px';
          penDockRoot.style.right = 'auto';
          penDockRoot.style.top = topValue + 'px';
          penDockRoot.style.bottom = 'auto';
        }

        dockPositionButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.side === side));
        quickPaletteBtn.style.color = state.color;
      }

      function applyAdjustPanelPosition() {
        if (!adjustPanel || isProjection) return;
        const panelWidth = adjustPanel.offsetWidth || 520;
        const panelHeight = adjustPanel.offsetHeight || 76;
        const nextX = clamp(state.ui.adjustPanelX, 8, Math.max(8, window.innerWidth - panelWidth - 8));
        const nextY = clamp(state.ui.adjustPanelY, 66, Math.max(66, window.innerHeight - panelHeight - 8));
        state.ui.adjustPanelX = nextX;
        state.ui.adjustPanelY = nextY;
        adjustPanel.style.left = nextX + 'px';
        adjustPanel.style.top = nextY + 'px';
      }

      function updateFloatingLockUi() {
        if (!floatLockBtn) return;
        const locked = state.ui.panelsLocked;
        floatLockBtn.classList.toggle('active', !locked);
        floatLockBtn.title = locked ? 'Desbloquear menús flotantes' : 'Bloquear menús flotantes';
        floatLockBtn.setAttribute('aria-label', floatLockBtn.title);
        floatLockBtn.innerHTML = locked
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 10V8a4 4 0 0 1 8 0v2"></path><rect x="5" y="10" width="14" height="10" rx="3"></rect></svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 10V8a4 4 0 0 1 7.3-2.1"></path><rect x="5" y="10" width="14" height="10" rx="3"></rect><path d="M15 6l2.6-2.6"></path></svg>`;
        dockHandle.style.opacity = locked ? '0.42' : '1';
        adjustHandle.style.opacity = locked ? '0.42' : '1';
      }

      function setDockSide(side, offset = state.ui.dockOffset) {
        state.ui.dockSide = side;
        state.ui.dockOffset = offset;
        persistUiState();
        applyDockPosition();
      }

      function nearestDockSide(rect) {
        const distances = {
          left: rect.left,
          right: window.innerWidth - rect.right,
          top: rect.top,
          bottom: window.innerHeight - rect.bottom
        };
        return Object.entries(distances).sort((a, b) => a[1] - b[1])[0][0];
      }

      function beginDockDrag(event) {
        if (isProjection || state.ui.panelsLocked) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = penDockRoot.getBoundingClientRect();
        dockDrag = {
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top
        };
        state.ui.isPanelDragging = true;
        penDockRoot.classList.add('is-dragging');
      }

      function moveDockDrag(event) {
        if (!dockDrag) return;
        const left = clamp(event.clientX - dockDrag.offsetX, 8, Math.max(8, window.innerWidth - penDockRoot.offsetWidth - 8));
        const top = clamp(event.clientY - dockDrag.offsetY, 8, Math.max(8, window.innerHeight - penDockRoot.offsetHeight - 8));
        penDockRoot.style.left = left + 'px';
        penDockRoot.style.top = top + 'px';
        penDockRoot.style.right = 'auto';
        penDockRoot.style.bottom = 'auto';
      }

      function endDockDrag() {
        if (!dockDrag) return;
        const rect = penDockRoot.getBoundingClientRect();
        const snappedSide = nearestDockSide(rect);
        const offset = (snappedSide === 'left' || snappedSide === 'right') ? rect.top : rect.left;
        dockDrag = null;
        state.ui.isPanelDragging = false;
        penDockRoot.classList.remove('is-dragging');
        setDockSide(snappedSide, offset);
      }

      function beginAdjustDrag(event) {
        if (isProjection || state.ui.panelsLocked) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = adjustPanel.getBoundingClientRect();
        adjustDrag = {
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top
        };
        state.ui.isPanelDragging = true;
        adjustPanel.classList.add('is-dragging');
      }

      function moveAdjustDrag(event) {
        if (!adjustDrag) return;
        state.ui.adjustPanelX = clamp(event.clientX - adjustDrag.offsetX, 8, Math.max(8, window.innerWidth - adjustPanel.offsetWidth - 8));
        state.ui.adjustPanelY = clamp(event.clientY - adjustDrag.offsetY, 66, Math.max(66, window.innerHeight - adjustPanel.offsetHeight - 8));
        applyAdjustPanelPosition();
      }

      function endAdjustDrag() {
        if (!adjustDrag) return;
        adjustDrag = null;
        state.ui.isPanelDragging = false;
        adjustPanel.classList.remove('is-dragging');
        persistUiState();
      }

      function togglePanelsLocked() {
        state.ui.panelsLocked = !state.ui.panelsLocked;
        updateFloatingLockUi();
        persistUiState();
      }

      function applyToolPreset(button) {
        if (!button) return;
        const targetTool = button.dataset.tool || state.tool;
        const profile = ensureToolProfile(targetTool);
        if (button.dataset.size) profile.size = Number(button.dataset.size);
        if (button.dataset.alpha) profile.alpha = Number(button.dataset.alpha);
        if (button.dataset.glow) profile.glow = Number(button.dataset.glow);
        if (button.dataset.color) profile.color = button.dataset.color;
        profile.label = button.dataset.label || button.title || profile.label;

        if (targetTool === state.tool) {
          loadToolProfile(targetTool);
        }
      }


      // SOLUCIÓN 3: Preservar el lienzo al hacer resize / fullscreen
      function resizeCanvases() {
        // Hacemos un respaldo sincronizado de los píxeles actuales
        const wOff = drawCanvas.width;
        const hOff = drawCanvas.height;
        
        let offDraw, offFx;
        if (wOff > 0 && hOff > 0) {
          offDraw = document.createElement('canvas'); offDraw.width = wOff; offDraw.height = hOff;
          offFx = document.createElement('canvas'); offFx.width = wOff; offFx.height = hOff;
          offDraw.getContext('2d').drawImage(drawCanvas, 0, 0);
          offFx.getContext('2d').drawImage(fxCanvas, 0, 0);
        }

        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const w = Math.floor(window.innerWidth * dpr);
        const h = Math.floor(window.innerHeight * dpr);
        
        [baseCanvas, drawCanvas, fxCanvas].forEach(c => {
          c.width = w; c.height = h;
          c.style.width = window.innerWidth + 'px';
          c.style.height = window.innerHeight + 'px';
        });

        // Restaurar los pixeles de forma instantánea
        if (offDraw && offFx) {
          drawCtx.drawImage(offDraw, 0, 0);
          fxCtx.drawImage(offFx, 0, 0);
        }

        renderAll();
        requestAnimationFrame(() => {
          applyDockPosition();
          applyAdjustPanelPosition();
        });
      }

      function syncUiFromState() {
        colorInput.value = state.color;
        sizeInput.value = state.size;
        alphaInput.value = state.alpha;
        glowInput.value = state.glow;
        sizeValue.textContent = state.size + ' px';
        alphaValue.textContent = Number(state.alpha).toFixed(2);
        glowValue.textContent = Number(state.glow).toFixed(2);
        toolReadout.textContent = state.ui.panelView === 'colors'
          ? 'Paleta y muestras'
          : (state.ui.activePresetLabel || state.tool);
        toggleImageBtn.textContent = state.baseImageVisible ? 'Ocultar imagen' : 'Mostrar imagen';
        toggleImageBtn.classList.toggle('active', !state.baseImageVisible);
        document.querySelectorAll('.tool-btn').forEach(btn => {
          btn.classList.toggle('active', buttonMatchesState(btn));
        });
        roomReadout.textContent = 'Sala: ' + (state.roomId || '—');
        quickPaletteBtn.style.color = state.color;

        const pointerSize = Math.max(8, state.size * (state.tool === 'eraser' ? 1.25 : 1));
        crosshair.style.width = pointerSize + 'px';
        crosshair.style.height = pointerSize + 'px';

        updatePanelModeUi();
        updateFloatingLockUi();
        applyDockPosition();
        applyAdjustPanelPosition();
      }

      function setStatus(kind, text) {
        statusDot.className = 'dot ' + kind;
        statusText.textContent = text;
      }

      function simpleToast(text) {
        statusText.textContent = text;
        clearTimeout(simpleToast._t);
        simpleToast._t = setTimeout(() => {
          if (conn && conn.open) setStatus('connected', 'Conectado');
        }, 1600);
      }

      function peerIdForRoom(role, roomId) {
        return 'carproj-' + roomId + '-' + role;
      }

      function makePeer(role, roomId) {
        if (role === 'projection') {
          return new Peer(peerIdForRoom(role, roomId));
        }
        return new Peer();
      }

      
      function initPeer() {
        if (!state.roomId) return;
        destroyPeer();
        setStatus('connecting', isProjection ? 'Iniciando proyección…' : 'Iniciando control…');
        peer = makePeer(isProjection ? 'projection' : 'control', state.roomId);

        peer.on('open', () => {
          peerOpen = true;
          clearTimeout(reconnectTimer);
          if (isProjection) {
            setStatus('connecting', 'Esperando tablet…');
          } else {
            tryConnectToProjection();
          }
        });

        peer.on('connection', incoming => {
          if (!isProjection) return;
          attachConnection(incoming);
        });

        peer.on('disconnected', () => {
          peerOpen = false;
          if (isProjection) {
            setStatus('connecting', 'Reconectando servidor…');
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
              try { peer?.reconnect?.(); } catch (_) {}
            }, 1400);
          } else {
            setStatus('disconnected', 'Reconectando control…');
            scheduleReconnect();
          }
        });

        peer.on('error', err => {
          console.warn('Peer error', err);
          if (err?.type === 'unavailable-id' && !isProjection) {
            destroyPeer();
          }
          setStatus('disconnected', 'Error de conexión');
          if (!isProjection) scheduleReconnect();
        });
      }

      function tryConnectToProjection() {
        if (!peer || !peerOpen || isProjection || !state.roomId) return;
        const projectionId = peerIdForRoom('projection', state.roomId);

        if (conn && (conn.open || conn.peer === projectionId)) return;

        setStatus('connecting', 'Buscando proyección…');
        const outgoing = peer.connect(projectionId, {
          reliable: true,
          metadata: { role: 'control', roomId: state.roomId }
        });
        attachConnection(outgoing);
      }

      function attachConnection(c) {
        if (!c) return;
        clearTimeout(reconnectTimer);

        if (conn && conn !== c) {
          try { conn.close(); } catch (_) {}
        }

        conn = c;
        setStatus('connecting', isProjection ? 'Tablet conectando…' : 'Conectando a proyección…');

        conn.on('open', () => {
          clearTimeout(reconnectTimer);
          setStatus('connected', 'Conectado');

          if (isProjection) {
            broadcastState(true);
            sendFullFrame();
          } else {
            syncUiFromState();
          }
        });

        conn.on('data', handleMessage);

        conn.on('close', () => {
          if (conn === c) conn = null;
          if (isProjection) {
            setStatus('connecting', 'Esperando tablet…');
            return;
          }
          setStatus('disconnected', 'Conexión perdida');
          scheduleReconnect();
        });

        conn.on('error', err => {
          console.warn('Connection error', err);
          if (conn === c && !c.open) conn = null;
          setStatus('disconnected', 'Error en conexión');
          if (!isProjection) scheduleReconnect();
        });
      }

      function destroyPeer() {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
        if (conn) { try { conn.close(); } catch (_) {} }
        if (peer) { try { peer.destroy(); } catch (_) {} }
        conn = null;
        peer = null;
        peerOpen = false;
      }

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          clearTimeout(reconnectTimer);
          return;
        }

        if (!isProjection && (!conn || !conn.open)) {
          scheduleReconnect(true);
        }
      });

      function scheduleReconnect(immediate = false) {
        clearTimeout(reconnectTimer);
        if (isProjection || !state.roomId || document.visibilityState === 'hidden') return;

        reconnectTimer = setTimeout(() => {
          if (conn && conn.open) return;

          if (!peer || peer.destroyed || !peerOpen) {
            initPeer();
            return;
          }

          tryConnectToProjection();
        }, immediate ? 120 : 1600);
      }

      function send(msg) {

        if (conn && conn.open) conn.send(msg);
      }

      function broadcastState(sendImage = false) {
        const rectNorm = state.baseImageRect
          ? {
              x: state.baseImageRect.x / baseCanvas.width,
              y: state.baseImageRect.y / baseCanvas.height,
              w: state.baseImageRect.w / baseCanvas.width,
              h: state.baseImageRect.h / baseCanvas.height,
            }
          : state.baseImageRectNorm;

        state.baseImageRectNorm = rectNorm || null;

        saveCurrentToolProfile();

        const payload = {
          tool: state.tool,
          color: state.color,
          size: state.size,
          alpha: state.alpha,
          glow: state.glow,
          toolProfiles: state.toolProfiles,
          globalOverrides: state.globalOverrides,
          blackBg: state.blackBg,
          baseImageVisible: state.baseImageVisible,
          baseImageRectNorm: state.baseImageRectNorm,
        };

        if (sendImage) {
          payload.baseImageData = state.baseImageData;
        }

        send({
          type: 'state',
          sourceRole: isProjection ? 'projection' : 'control',
          payload: payload
        });
      }

      function sendFullFrame() {
        send({ type: 'fullFrame', draw: drawCanvas.toDataURL('image/png'), fx: fxCanvas.toDataURL('image/png') });
      }

      function handleMessage(msg) {
        if (!msg || typeof msg !== 'object') return;
        switch (msg.type) {
          case 'state': {
            const oldImageData = state.baseImageData;
            const payload = msg.payload || {};
            const incomingProfiles = normalizeToolProfiles(payload.toolProfiles);
            const incomingOverrides = normalizeGlobalOverrides(payload.globalOverrides);

            Object.assign(state, { ...payload, toolProfiles: incomingProfiles, globalOverrides: incomingOverrides });
            loadToolProfile(state.tool);

            if ('baseImageData' in payload && oldImageData !== state.baseImageData) {
              loadBaseImageFromState();
            } else {
              renderBase();
            }

            syncUiFromState();
            renderAll();
            break;
          }
          case 'fullFrame': {
            if (msg.draw) drawDataUrlToCanvas(msg.draw, drawCanvas, drawCtx);
            if (msg.fx) drawDataUrlToCanvas(msg.fx, fxCanvas, fxCtx);
            break;
          }
          case 'drawStroke': {
            renderRemoteStroke(msg.stroke);
            break;
          }
          case 'clearDraw': {
            clearCanvas(drawCtx, drawCanvas);
            break;
          }
          case 'clearFx': {
            clearCanvas(fxCtx, fxCanvas);
            break;
          }
          case 'undoFrame': {
            if (msg.draw) drawDataUrlToCanvas(msg.draw, drawCanvas, drawCtx);
            if (msg.fx) drawDataUrlToCanvas(msg.fx, fxCanvas, fxCtx);
            break;
          }
          case 'pointerPreview': {
            if (!isProjection) return;
            const { xNorm, yNorm, x, y, show } = msg;
            crosshair.style.display = show ? 'block' : 'none';
            if (show) {
              const px = xNorm != null ? xNorm * window.innerWidth : x;
              const py = yNorm != null ? yNorm * window.innerHeight : y;
              crosshair.style.left = px + 'px';
              crosshair.style.top = py + 'px';
              // Actualizamos tamaño visual en proyección
              const pSize = Math.max(8, state.size * (state.tool === 'eraser' ? 1.25 : 1));
              crosshair.style.width = pSize + 'px';
              crosshair.style.height = pSize + 'px';
            }
            break;
          }
        }
      }

      function drawDataUrlToCanvas(dataUrl, canvas, ctx) {
        const img = new Image();
        img.onload = () => {
          clearCanvas(ctx, canvas);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = dataUrl;
      }

      function clearCanvas(ctx, canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      function renderAll() {
        renderBase();
        if (state.blackBg) {
            document.body.style.background = '#000';
        } else {
            document.body.style.background = '';
        }
      }

      function renderBase() {
        clearCanvas(baseCtx, baseCanvas);
        if (state.blackBg) {
          baseCtx.fillStyle = '#000';
          baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);
        }
        if (state.baseImageVisible && state.baseImageObject) {
          let rect = null;
          if (state.baseImageRectNorm) {
            rect = {
              x: state.baseImageRectNorm.x * baseCanvas.width,
              y: state.baseImageRectNorm.y * baseCanvas.height,
              w: state.baseImageRectNorm.w * baseCanvas.width,
              h: state.baseImageRectNorm.h * baseCanvas.height
            };
          } else {
            rect = fitImageRect(state.baseImageObject.width, state.baseImageObject.height, baseCanvas.width, baseCanvas.height);
            state.baseImageRectNorm = {
              x: rect.x / baseCanvas.width,
              y: rect.y / baseCanvas.height,
              w: rect.w / baseCanvas.width,
              h: rect.h / baseCanvas.height
            };
          }
          state.baseImageRect = rect;
          baseCtx.drawImage(state.baseImageObject, rect.x, rect.y, rect.w, rect.h);
        }
      }

      function fitImageRect(imgW, imgH, canvasW, canvasH) {
        const scale = Math.min(canvasW / imgW, canvasH / imgH) * 0.92;
        const w = imgW * scale;
        const h = imgH * scale;
        return {
          x: (canvasW - w) / 2,
          y: (canvasH - h) / 2,
          w, h
        };
      }

      function loadBaseImageFromState() {
        if (!state.baseImageData) {
          state.baseImageObject = null;
          state.baseImageRect = null;
          state.baseImageRectNorm = null;
          renderBase();
          return;
        }
        const img = new Image();
        img.onload = () => {
          state.baseImageObject = img;
          if (!state.baseImageRectNorm) {
            const rect = fitImageRect(img.width, img.height, baseCanvas.width, baseCanvas.height);
            state.baseImageRect = rect;
            state.baseImageRectNorm = {
              x: rect.x / baseCanvas.width,
              y: rect.y / baseCanvas.height,
              w: rect.w / baseCanvas.width,
              h: rect.h / baseCanvas.height
            };
          }
          renderBase();
        };
        img.src = state.baseImageData;
      }

      function snapshot() {
        if (isProjection) return;
        state.history.push({
          draw: drawCanvas.toDataURL('image/png'),
          fx: fxCanvas.toDataURL('image/png')
        });
        if (state.history.length > 20) state.history.shift();
        state.redo = [];
      }

      function undo() {
        if (!state.history.length) return;
        state.redo.push({
          draw: drawCanvas.toDataURL('image/png'),
          fx: fxCanvas.toDataURL('image/png')
        });
        const last = state.history.pop();
        drawDataUrlToCanvas(last.draw, drawCanvas, drawCtx);
        drawDataUrlToCanvas(last.fx, fxCanvas, fxCtx);
        send({ type: 'undoFrame', draw: last.draw, fx: last.fx });
      }

      function redo() {
        if (!state.redo.length) return;
        const next = state.redo.pop();
        state.history.push({
          draw: drawCanvas.toDataURL('image/png'),
          fx: fxCanvas.toDataURL('image/png')
        });
        drawDataUrlToCanvas(next.draw, drawCanvas, drawCtx);
        drawDataUrlToCanvas(next.fx, fxCanvas, fxCtx);
        send({ type: 'undoFrame', draw: next.draw, fx: next.fx });
      }

      function getPointerPos(event) {
        const rect = drawCanvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (drawCanvas.width / rect.width);
        const y = (event.clientY - rect.top) * (drawCanvas.height / rect.height);
        return { x, y };
      }

      function rgba(hex, alpha) {
        const clean = hex.replace('#', '');
        const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
        const num = parseInt(full, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r},${g},${b},${alpha})`;
      }

      function beginStroke(point) {
        if (isProjection) return;
        snapshot();
        state.pointerDown = true;
        state.activeStroke = {
          tool: state.tool,
          color: state.color,
          size: state.size,
          alpha: state.alpha,
          glow: state.glow,
          points: [point]
        };

        const tinyPoint = { x: point.x + 0.01, y: point.y + 0.01 };
        renderStrokeSegment(point, tinyPoint, state.activeStroke);
        send({
          type: 'drawStroke',
          stroke: {
            ...state.activeStroke,
            points: [
              { xNorm: point.x / drawCanvas.width, yNorm: point.y / drawCanvas.height },
              { xNorm: tinyPoint.x / drawCanvas.width, yNorm: tinyPoint.y / drawCanvas.height }
            ]
          }
        });

        send({
          type: 'pointerPreview',
          xNorm: point.x / drawCanvas.width,
          yNorm: point.y / drawCanvas.height,
          show: true
        });
      }

      function extendStroke(point) {
        if (!state.pointerDown || !state.activeStroke) return;
        const stroke = state.activeStroke;
        const prev = stroke.points[stroke.points.length - 1];
        stroke.points.push(point);
        renderStrokeSegment(prev, point, stroke);

        send({
          type: 'drawStroke',
          stroke: {
            ...stroke,
            points: [
              { xNorm: prev.x / drawCanvas.width, yNorm: prev.y / drawCanvas.height },
              { xNorm: point.x / drawCanvas.width, yNorm: point.y / drawCanvas.height }
            ]
          }
        });

        send({
          type: 'pointerPreview',
          xNorm: point.x / drawCanvas.width,
          yNorm: point.y / drawCanvas.height,
          show: true
        });
      }

      function endStroke() {
        if (!state.pointerDown) return;
        state.pointerDown = false;
        state.activeStroke = null;
        send({ type: 'pointerPreview', show: false });
      }

      function renderRemoteStroke(stroke) {
        if (!stroke || !stroke.points || stroke.points.length < 2) return;
        const a = stroke.points[0].xNorm != null
          ? { x: stroke.points[0].xNorm * drawCanvas.width, y: stroke.points[0].yNorm * drawCanvas.height }
          : stroke.points[0];
        const b = stroke.points[1].xNorm != null
          ? { x: stroke.points[1].xNorm * drawCanvas.width, y: stroke.points[1].yNorm * drawCanvas.height }
          : stroke.points[1];
        renderStrokeSegment(a, b, { ...stroke, points: [a, b] });
      }

      function renderStrokeSegment(a, b, stroke) {
        const tool = stroke.tool;
        if (tool === 'spray') return spraySegment(a, b, stroke);
        if (tool === 'neon') return neonSegment(a, b, stroke);
        if (tool === 'eraser') return eraserSegment(a, b, stroke);
        return brushSegment(a, b, stroke);
      }

      function brushSegment(a, b, stroke) {
        drawCtx.save();
        drawCtx.globalCompositeOperation = 'source-over';
        drawCtx.strokeStyle = rgba(stroke.color, stroke.alpha);
        drawCtx.lineWidth = stroke.size;
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.beginPath();
        drawCtx.moveTo(a.x, a.y);
        drawCtx.quadraticCurveTo(a.x, a.y, b.x, b.y);
        drawCtx.stroke();
        drawCtx.restore();
      }

      function neonSegment(a, b, stroke) {
        const glowStrength = clamp(stroke.glow ?? 0.5, 0, 1);
        const alphaVal = clamp(stroke.alpha ?? 1, 0.05, 1);
        const baseSize = Math.max(1.2, stroke.size * 0.4);
        const haloOuterWidth = baseSize * (2.25 + glowStrength * 0.95);
        const haloInnerWidth = baseSize * (1.35 + glowStrength * 0.38);
        const haloOuterBlur = baseSize * (3.8 + glowStrength * 2.1);
        const haloInnerBlur = baseSize * (1.6 + glowStrength * 0.9);

        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        fxCtx.lineCap = 'round';
        fxCtx.lineJoin = 'round';

        fxCtx.shadowColor = rgba(stroke.color, 1);
        fxCtx.shadowBlur = haloOuterBlur;
        fxCtx.strokeStyle = rgba(stroke.color, (0.08 + glowStrength * 0.04) * alphaVal);
        fxCtx.lineWidth = haloOuterWidth;
        fxCtx.beginPath();
        fxCtx.moveTo(a.x, a.y);
        fxCtx.lineTo(b.x, b.y);
        fxCtx.stroke();

        fxCtx.shadowBlur = haloInnerBlur;
        fxCtx.strokeStyle = rgba(stroke.color, (0.12 + glowStrength * 0.06) * alphaVal);
        fxCtx.lineWidth = haloInnerWidth;
        fxCtx.beginPath();
        fxCtx.moveTo(a.x, a.y);
        fxCtx.lineTo(b.x, b.y);
        fxCtx.stroke();
        fxCtx.restore();

        drawCtx.save();
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.globalCompositeOperation = 'screen';

        const bodyAlpha = Math.min(1, alphaVal * 0.68);
        drawCtx.strokeStyle = rgba(stroke.color, bodyAlpha);
        drawCtx.lineWidth = Math.max(1.2, baseSize);
        drawCtx.beginPath();
        drawCtx.moveTo(a.x, a.y);
        drawCtx.lineTo(b.x, b.y);
        drawCtx.stroke();

        drawCtx.strokeStyle = rgba(stroke.color, Math.min(1, alphaVal * 0.38));
        drawCtx.lineWidth = Math.max(0.9, baseSize * 0.62);
        drawCtx.beginPath();
        drawCtx.moveTo(a.x, a.y);
        drawCtx.lineTo(b.x, b.y);
        drawCtx.stroke();

        drawCtx.globalCompositeOperation = 'source-over';
        drawCtx.strokeStyle = `rgba(255,255,255,${Math.min(1, alphaVal * 0.82).toFixed(3)})`;
        drawCtx.lineWidth = Math.max(0.7, baseSize * 0.26);
        drawCtx.beginPath();
        drawCtx.moveTo(a.x, a.y);
        drawCtx.lineTo(b.x, b.y);
        drawCtx.stroke();
        drawCtx.restore();
      }


      function spraySegment(a, b, stroke) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const steps = Math.ceil(dist / 4);
        drawCtx.save();
        drawCtx.fillStyle = rgba(stroke.color, Math.max(0.03, stroke.alpha * 0.16));
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          const x = a.x + dx * t;
          const y = a.y + dy * t;
          const count = Math.max(10, Math.floor(stroke.size * 1.2));
          for (let j = 0; j < count; j++) {
            const ang = Math.random() * Math.PI * 2;
            const rad = Math.random() * stroke.size;
            drawCtx.beginPath();
            drawCtx.arc(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad, Math.random() * 1.7 + 0.4, 0, Math.PI * 2);
            drawCtx.fill();
          }
        }
        drawCtx.restore();
      }

      function eraserSegment(a, b, stroke) {
        [
          { ctx: drawCtx, width: stroke.size * 1.25 },
          { ctx: fxCtx, width: stroke.size * 1.9 }
        ].forEach(layer => {
          layer.ctx.save();
          layer.ctx.globalCompositeOperation = 'destination-out';
          layer.ctx.strokeStyle = 'rgba(0,0,0,1)';
          layer.ctx.lineWidth = layer.width;
          layer.ctx.lineCap = 'round';
          layer.ctx.lineJoin = 'round';
          layer.ctx.beginPath();
          layer.ctx.moveTo(a.x, a.y);
          layer.ctx.lineTo(b.x, b.y);
          layer.ctx.stroke();
          layer.ctx.restore();
        });
      }

      function setTool(tool) {
        saveCurrentToolProfile();
        state.tool = tool;
        loadToolProfile(tool);
        syncUiFromState();
        broadcastState();
      }

      function toggleToolbar() {
        toolbar.classList.toggle('hidden');
      }

      function makeLink(nextMode) {
        const url = new URL(location.href);
        url.searchParams.set('mode', nextMode);
        if (state.roomId) url.searchParams.set('room', state.roomId);
        return url.toString();
      }

      async function copyText(text) {
        try {
          await navigator.clipboard.writeText(text);
          simpleToast('Link copiado');
        } catch {
          prompt('Copia este link:', text);
        }
      }

      function connectRoom() {
        const room = roomInput.value.trim().replace(/\s+/g, '-').toLowerCase();
        if (!room) {
          simpleToast('Pon un Room ID');
          return;
        }
        state.roomId = room;
        syncUiFromState();
        initPeer();
      }

      async function loadLocalImage(file) {
        const reader = new FileReader();
        reader.onload = () => {
          state.baseImageData = reader.result;
          state.baseImageVisible = true;
          state.baseImageRect = null;
          state.baseImageRectNorm = null;
          loadBaseImageFromState();
          broadcastState(true); 
        };
        reader.readAsDataURL(file);
      }


      function toggleBaseImageVisibility() {
        if (!state.baseImageData) {
          simpleToast('Primero carga una imagen');
          return;
        }
        state.baseImageVisible = !state.baseImageVisible;
        renderBase();
        syncUiFromState();
        broadcastState();
      }

      function clearArtwork() {
        snapshot();
        clearCanvas(drawCtx, drawCanvas);
        clearCanvas(fxCtx, fxCanvas);
        send({ type: 'clearDraw' });
        send({ type: 'clearFx' });
        simpleToast('Lienzo limpiado');
      }

      function exportArtwork() {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = drawCanvas.width;
        exportCanvas.height = drawCanvas.height;
        const exportCtx = exportCanvas.getContext('2d');

        if (state.blackBg) {
          exportCtx.fillStyle = '#000';
          exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        }

        exportCtx.drawImage(baseCanvas, 0, 0);
        exportCtx.drawImage(drawCanvas, 0, 0);
        exportCtx.drawImage(fxCanvas, 0, 0);

        const stamp = new Date();
        const filename = `dibujo-${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}-${String(stamp.getHours()).padStart(2, '0')}${String(stamp.getMinutes()).padStart(2, '0')}${String(stamp.getSeconds()).padStart(2, '0')}.png`;

        const triggerDownload = url => {
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          if (url.startsWith('blob:')) {
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
          simpleToast('Imagen guardada');
        };

        if (exportCanvas.toBlob) {
          exportCanvas.toBlob(blob => {
            if (!blob) return;
            triggerDownload(URL.createObjectURL(blob));
          }, 'image/png');
        } else {
          triggerDownload(exportCanvas.toDataURL('image/png'));
        }
      }

      colorInput.addEventListener('input', () => {
        state.color = colorInput.value;
        const profile = ensureToolProfile(state.tool);
        profile.color = state.color;
        state.ui.activePresetLabel = profile.label || state.ui.activePresetLabel;
        syncUiFromState();
        broadcastState();
      });
      sizeInput.addEventListener('input', () => {
        setGlobalOverride('size', sizeInput.value);
        syncUiFromState();
        broadcastState();
      });
      alphaInput.addEventListener('input', () => {
        setGlobalOverride('alpha', alphaInput.value);
        syncUiFromState();
        broadcastState();
      });
      glowInput.addEventListener('input', () => {
        setGlobalOverride('glow', glowInput.value);
        syncUiFromState();
        broadcastState();
      });

      document.querySelectorAll('.brush-preset.tool-btn').forEach(btn => btn.addEventListener('click', () => {
        setTool(btn.dataset.tool);
        applyToolPreset(btn);
        syncUiFromState();
        broadcastState();
        setPanelView('brushes');
        togglePenPanel(true);
      }));

      document.querySelectorAll('.quick-tool-btn.tool-btn').forEach(btn => btn.addEventListener('click', () => {
        setTool(btn.dataset.tool);
        applyToolPreset(btn);
        syncUiFromState();
        broadcastState();
      }));

      penMenuToggle.addEventListener('click', () => {
        if (!state.ui.penPanelOpen || state.ui.panelView !== 'brushes') {
          setPanelView('brushes');
          togglePenPanel(true);
          return;
        }
        togglePenPanel(false);
      });

      quickPaletteBtn.addEventListener('click', () => {
        if (state.ui.penPanelOpen && state.ui.panelView === 'colors') {
          togglePenPanel(false);
          return;
        }
        setPanelView('colors');
        togglePenPanel(true);
      });

      quickUndoBtn.addEventListener('click', undo);
      quickRedoBtn.addEventListener('click', redo);
      quickClearBtn.addEventListener('click', clearArtwork);
      quickSaveBtn.addEventListener('click', exportArtwork);

      dockPositionButtons.forEach(btn => btn.addEventListener('click', () => setDockSide(btn.dataset.side, btn.dataset.side === 'left' || btn.dataset.side === 'right' ? penDockRoot.getBoundingClientRect().top : penDockRoot.getBoundingClientRect().left)));
      dockHandle.addEventListener('pointerdown', beginDockDrag, { passive: false });
      adjustHandle.addEventListener('pointerdown', beginAdjustDrag, { passive: false });
      floatLockBtn.addEventListener('click', togglePanelsLocked);
      connectBtn.addEventListener('click', connectRoom);
      roomInput.addEventListener('keydown', e => { if (e.key === 'Enter') connectRoom(); });
      copyControlLinkBtn.addEventListener('click', () => copyText(makeLink('control')));
      copyProjectionLinkBtn.addEventListener('click', () => copyText(makeLink('projection')));
      fullscreenBtn.addEventListener('click', toggleFullscreen);
      quickFullscreenBtn.addEventListener('click', toggleFullscreen);
      projectionFullscreenBtn.addEventListener('click', toggleFullscreen);
      quickHideBtn.addEventListener('click', toggleToolbar);
      toggleToolbarBtn.addEventListener('click', toggleToolbar);
      toggleHudBtn.addEventListener('click', () => hud.classList.toggle('hidden-in-projection'));
      projectionHudBtn.addEventListener('click', () => hud.classList.toggle('hidden-in-projection'));
      
      blackBgBtn.addEventListener('click', () => {
        state.blackBg = !state.blackBg;
        blackBgBtn.classList.toggle('active', state.blackBg);
        renderAll();
        broadcastState(); 
      });

      document.addEventListener('pointerdown', event => {
        if (isProjection) return;
        if (penDockRoot.contains(event.target) || toolbar.contains(event.target) || fabBar.contains(event.target) || adjustPanel.contains(event.target)) return;
        if (state.ui.penPanelOpen) togglePenPanel(false);
      });

      loadImageBtn.addEventListener('click', () => imageInput.click());
      imageInput.addEventListener('change', e => {
        const file = e.target.files && e.target.files[0];
        if (file) loadLocalImage(file);
      });

      fitImageBtn.addEventListener('click', () => {
        if (!state.baseImageObject) return;
        state.baseImageRect = fitImageRect(state.baseImageObject.width, state.baseImageObject.height, baseCanvas.width, baseCanvas.height);
        state.baseImageRectNorm = {
          x: state.baseImageRect.x / baseCanvas.width,
          y: state.baseImageRect.y / baseCanvas.height,
          w: state.baseImageRect.w / baseCanvas.width,
          h: state.baseImageRect.h / baseCanvas.height
        };
        renderBase();
        broadcastState();
      });

      clearBtn.addEventListener('click', clearArtwork);
      toggleImageBtn.addEventListener('click', toggleBaseImageVisibility);
      undoBtn.addEventListener('click', undo);
      redoBtn.addEventListener('click', redo);

      // SOLUCIÓN 1: Manejar eventos del botón del S-Pen (Eraser)
      function pointerDown(event) {
        if (isProjection) return;
        event.preventDefault();

        // Detectar botón lateral del S-Pen (suele ser botón 2 o 5) o botones adicionales.
        if (event.pointerType === 'pen' && (event.button === 2 || event.button === 5 || (event.buttons & 2) || (event.buttons & 32))) {
          state.isStylusEraser = true;
          state.previousTool = state.tool;
          setTool('eraser');
        }

        const p = getPointerPos(event);
        beginStroke(p);
      }
      
      function pointerMove(event) {
        if (dockDrag) {
          moveDockDrag(event);
          return;
        }
        if (adjustDrag) {
          moveAdjustDrag(event);
          return;
        }

        if (!isProjection) {
          const p = getPointerPos(event);
          send({
            type: 'pointerPreview',
            xNorm: p.x / drawCanvas.width,
            yNorm: p.y / drawCanvas.height,
            show: true
          });
          if (state.pointerDown) extendStroke(p);
        }
      }
      
      function pointerUp(event) {
        if (dockDrag) {
          endDockDrag();
          return;
        }
        if (adjustDrag) {
          endAdjustDrag();
          return;
        }

        if (isProjection) return;
        event.preventDefault();
        endStroke();

        // Restaurar herramienta anterior si estábamos usando el botón del S-Pen
        if (state.isStylusEraser) {
          setTool(state.previousTool);
          state.isStylusEraser = false;
        }
      }

      drawCanvas.addEventListener('pointerdown', event => {
        drawCanvas.setPointerCapture?.(event.pointerId);
        pointerDown(event);
      }, { passive: false });
      
      drawCanvas.addEventListener('pointermove', pointerMove, { passive: false });
      window.addEventListener('pointermove', pointerMove, { passive: false });
      window.addEventListener('pointerup', pointerUp, { passive: false });
      window.addEventListener('pointercancel', pointerUp, { passive: false });
      window.addEventListener('resize', resizeCanvases);

      function toggleFullscreen() {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }

      setPanelView(state.ui.panelView);
      togglePenPanel(false);
      syncUiFromState();
      resizeCanvases();
      updateFloatingLockUi();
      blackBgBtn.classList.toggle('active', state.blackBg);

      if (state.roomId) initPeer();
      if (isProjection) setStatus('connecting', state.roomId ? 'Esperando tablet…' : 'Pon room= en la URL');
      else setStatus('disconnected', state.roomId ? 'Lista para conectar' : 'Elige un Room ID');

      window.addEventListener('beforeunload', destroyPeer);

      window.CarProjectionApp = {
        state,
        connectRoom,
        toggleFullscreen,
        clearDraw: clearArtwork,
        toggleImage: toggleBaseImageVisibility,
        saveImage: exportArtwork,
      };
    })();
