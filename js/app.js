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

      function getAdjustPanelMetrics() {
        const isMobileViewport = window.innerWidth <= 900;
        const marginX = isMobileViewport ? 12 : 8;
        const minY = 66;

        if (!isMobileViewport) {
          return {
            isMobileViewport,
            width: null,
            minX: marginX,
            maxX: Math.max(marginX, window.innerWidth - (adjustPanel.offsetWidth || 520) - marginX),
            minY,
            maxY: Math.max(minY, window.innerHeight - (adjustPanel.offsetHeight || 76) - 8)
          };
        }

        const dockOnSide = state.ui.dockSide === 'right' || state.ui.dockSide === 'left';
        const dockSpace = dockOnSide ? ((penDockRoot?.offsetWidth || 84) + 16) : 0;
        const availableWidth = clamp(window.innerWidth - (marginX * 2) - dockSpace, 240, Math.max(240, window.innerWidth - (marginX * 2)));
        const minX = state.ui.dockSide === 'left' ? (dockSpace + marginX) : marginX;
        const maxX = state.ui.dockSide === 'right'
          ? Math.max(minX, window.innerWidth - availableWidth - dockSpace - marginX)
          : Math.max(minX, window.innerWidth - availableWidth - marginX);

        return {
          isMobileViewport,
          width: availableWidth,
          minX,
          maxX,
          minY,
          maxY: Math.max(minY, window.innerHeight - (adjustPanel.offsetHeight || 76) - 8)
        };
      }

      function applyAdjustPanelPosition() {
        if (!adjustPanel || isProjection) return;

        const metrics = getAdjustPanelMetrics();

        if (metrics.isMobileViewport && metrics.width) {
          adjustPanel.style.width = metrics.width + 'px';
          adjustPanel.style.maxWidth = metrics.width + 'px';
        } else {
          adjustPanel.style.width = '';
          adjustPanel.style.maxWidth = '';
        }

        requestAnimationFrame(() => {
          const panelWidth = adjustPanel.offsetWidth || metrics.width || 520;
          const panelHeight = adjustPanel.offsetHeight || 76;
          const minX = metrics.minX;
          const maxX = Math.max(minX, metrics.maxX ?? (window.innerWidth - panelWidth - 8));
          const nextX = clamp(state.ui.adjustPanelX, minX, maxX);
          const nextY = clamp(state.ui.adjustPanelY, metrics.minY, Math.max(metrics.minY, window.innerHeight - panelHeight - 8));

          state.ui.adjustPanelX = nextX;
          state.ui.adjustPanelY = nextY;
          adjustPanel.style.left = nextX + 'px';
          adjustPanel.style.top = nextY + 'px';
        });
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
        applyAdjustPanelPosition();
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
        const metrics = getAdjustPanelMetrics();
        const panelWidth = adjustPanel.offsetWidth || metrics.width || 520;
        const panelHeight = adjustPanel.offsetHeight || 76;
        state.ui.adjustPanelX = clamp(event.clientX - adjustDrag.offsetX, metrics.minX, Math.max(metrics.minX, window.innerWidth - panelWidth - 8));
        state.ui.adjustPanelY = clamp(event.clientY - adjustDrag.offsetY, metrics.minY, Math.max(metrics.minY, window.innerHeight - panelHeight - 8));
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
          case 'commitStroke': {
            if (msg.tool === 'neon') {
              commitFxToDraw(false);
            }
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

      function usesFxLayer(tool) {
        return tool === 'neon';
      }

      function getGuideRectForCanvas(canvas) {
        if (!state.baseImageObject) return null;
        if (state.baseImageRectNorm) {
          return {
            x: state.baseImageRectNorm.x * canvas.width,
            y: state.baseImageRectNorm.y * canvas.height,
            w: state.baseImageRectNorm.w * canvas.width,
            h: state.baseImageRectNorm.h * canvas.height
          };
        }
        return fitImageRect(state.baseImageObject.width, state.baseImageObject.height, canvas.width, canvas.height);
      }

      function drawGuideOverlay(targetCtx, targetCanvas) {
        if (!state.baseImageObject) return false;
        const rect = getGuideRectForCanvas(targetCanvas);
        if (!rect) return false;
        targetCtx.drawImage(state.baseImageObject, rect.x, rect.y, rect.w, rect.h);
        return true;
      }

      function commitFxToDraw(notifyPeer = false) {
        const hasPixels = fxCanvas.width > 0 && fxCanvas.height > 0;
        if (!hasPixels) return;
        drawCtx.save();
        drawCtx.globalCompositeOperation = 'source-over';
        drawCtx.drawImage(fxCanvas, 0, 0);
        drawCtx.restore();
        clearCanvas(fxCtx, fxCanvas);
        if (notifyPeer) {
          send({ type: 'commitStroke', tool: 'neon' });
        }
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
        const pressureRaw = typeof event.pressure === 'number' && event.pressure > 0 ? event.pressure : 1;
        const pressure = event.pointerType === 'pen' ? clamp(pressureRaw, 0.08, 1) : 1;
        return { x, y, pressure };
      }

      function applyAlphaToColor(color, alpha) {
        const safeAlpha = clamp(alpha ?? 1, 0, 1);
        if (!color) return `rgba(255,255,255,${safeAlpha})`;
        if (color.startsWith('#')) {
          const clean = color.replace('#', '');
          const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
          const num = parseInt(full, 16);
          const r = (num >> 16) & 255;
          const g = (num >> 8) & 255;
          const b = num & 255;
          return `rgba(${r},${g},${b},${safeAlpha})`;
        }
        if (color.startsWith('rgba(')) {
          return color.replace(/rgba\(([^)]+),\s*[^,()]+\)$/i, `rgba($1, ${safeAlpha})`);
        }
        if (color.startsWith('rgb(')) {
          return color.replace(/^rgb\(([^)]+)\)$/i, `rgba($1, ${safeAlpha})`);
        }
        return color;
      }

      function rgba(color, alpha) {
        return applyAlphaToColor(color, alpha);
      }

      function toNormPoint(point) {
        return {
          xNorm: point.x / drawCanvas.width,
          yNorm: point.y / drawCanvas.height,
          pressure: clamp(point.pressure ?? 1, 0.08, 1)
        };
      }

      function fromStrokePoint(point) {
        if (point.xNorm != null && point.yNorm != null) {
          return {
            x: point.xNorm * drawCanvas.width,
            y: point.yNorm * drawCanvas.height,
            pressure: clamp(point.pressure ?? 1, 0.08, 1)
          };
        }
        return {
          x: point.x,
          y: point.y,
          pressure: clamp(point.pressure ?? 1, 0.08, 1)
        };
      }

      function getRenderableStrokePoints(stroke) {
        const pts = stroke.points || [];
        if (pts.length <= 3) return pts.slice();
        return pts.slice(-3);
      }

      function getMidPoint(a, b) {
        return {
          x: (a.x + b.x) * 0.5,
          y: (a.y + b.y) * 0.5
        };
      }

      function getPressureAdjustedSize(stroke, point, multiplier = 1) {
        const pressure = clamp(point?.pressure ?? 1, 0.18, 1);
        const pressureBoost = 0.45 + pressure * 0.55;
        return Math.max(0.75, stroke.size * multiplier * pressureBoost);
      }

      function getCurveSegment(points) {
        if (!points || points.length < 2) return null;
        const p2 = points[points.length - 1];
        const p1 = points[points.length - 2];
        const p0 = points.length > 2 ? points[points.length - 3] : p1;
        return {
          p0,
          p1,
          p2,
          mid1: getMidPoint(p0, p1),
          mid2: getMidPoint(p1, p2)
        };
      }

      function traceCurve(ctx, points) {
        const segment = getCurveSegment(points);
        if (!segment) return false;
        ctx.beginPath();
        ctx.moveTo(segment.mid1.x, segment.mid1.y);
        ctx.quadraticCurveTo(segment.p1.x, segment.p1.y, segment.mid2.x, segment.mid2.y);
        ctx.stroke();
        return true;
      }

      function traceWholeCurve(ctx, points) {
        if (!points || points.length < 2) return false;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length - 1; i++) {
          const midX = (points[i].x + points[i + 1].x) * 0.5;
          const midY = (points[i].y + points[i + 1].y) * 0.5;
          ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
        }

        const last = points[points.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
        return true;
      }

      function erasePoint(point, stroke) {
        [
          { ctx: drawCtx, radiusMultiplier: 0.72 },
          { ctx: fxCtx, radiusMultiplier: 1.08 }
        ].forEach(layer => {
          layer.ctx.save();
          layer.ctx.globalCompositeOperation = 'destination-out';
          layer.ctx.beginPath();
          layer.ctx.arc(point.x, point.y, getPressureAdjustedSize(stroke, point, layer.radiusMultiplier), 0, Math.PI * 2);
          layer.ctx.fill();
          layer.ctx.restore();
        });
      }

      function sprayBurstAt(point, stroke, densityMultiplier = 1) {
        const radius = Math.max(2, getPressureAdjustedSize(stroke, point));
        const density = Math.max(8, Math.floor(stroke.size * 1.45 * densityMultiplier));
        drawCtx.save();
        drawCtx.globalCompositeOperation = 'source-over';
        drawCtx.fillStyle = applyAlphaToColor(stroke.color, clamp(stroke.alpha, 0.03, 1));
        for (let i = 0; i < density; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.sqrt(Math.random()) * radius;
          const sprayX = point.x + Math.cos(angle) * dist;
          const sprayY = point.y + Math.sin(angle) * dist;
          const dropSize = Math.max(0.7, Math.random() * (stroke.glow * 3 + 1.4));
          drawCtx.fillRect(sprayX, sprayY, dropSize, dropSize);
        }
        drawCtx.restore();
      }

      function renderBrushPoint(_ctx, point, stroke) {
        const tool = stroke.tool;
        if (tool === 'eraser') {
          erasePoint(point, stroke);
          return;
        }
        if (tool === 'spray') {
          sprayBurstAt(point, stroke, 0.9);
          return;
        }
        if (tool === 'neon') {
          const pointStroke = { ...stroke, points: [point, { ...point, x: point.x + 0.01, y: point.y + 0.01 }] };
          clearCanvas(fxCtx, fxCanvas);
          drawNeonLine(fxCtx, pointStroke);
          return;
        }

        drawCtx.save();
        drawCtx.globalCompositeOperation = 'source-over';
        drawCtx.fillStyle = applyAlphaToColor(stroke.color, stroke.alpha);
        drawCtx.beginPath();
        drawCtx.arc(point.x, point.y, Math.max(0.8, getPressureAdjustedSize(stroke, point) * 0.5), 0, Math.PI * 2);
        drawCtx.fill();
        drawCtx.restore();
      }

      function renderStrokeContinuously(_ctx, strokeParams) {
        const pts = strokeParams.points || [];
        if (!pts.length) return;
        if (pts.length < 2) {
          renderBrushPoint(drawCtx, pts[0], strokeParams);
          return;
        }

        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        fxCtx.lineCap = 'round';
        fxCtx.lineJoin = 'round';

        switch (strokeParams.tool) {
          case 'brush':
            drawStandardFluidLine(drawCtx, pts, strokeParams);
            break;
          case 'eraser':
            drawEraserLine(pts, strokeParams);
            break;
          case 'neon':
            clearCanvas(fxCtx, fxCanvas);
            drawNeonLine(fxCtx, strokeParams);
            break;
          case 'spray':
            drawSprayPattern(drawCtx, pts, strokeParams);
            break;
          default:
            drawStandardFluidLine(drawCtx, pts, strokeParams);
            break;
        }
      }

      function drawStandardFluidLine(ctx, pts, params) {
        const segment = getCurveSegment(pts);
        if (!segment) return;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = applyAlphaToColor(params.color, params.alpha);
        ctx.lineWidth = getPressureAdjustedSize(params, segment.p2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        traceCurve(ctx, pts);
        ctx.restore();
      }

      function drawEraserLine(pts, params) {
        const segment = getCurveSegment(pts);
        if (!segment) return;
        [
          { ctx: drawCtx, widthMultiplier: 1.18 },
          { ctx: fxCtx, widthMultiplier: 1.78 }
        ].forEach(layer => {
          layer.ctx.save();
          layer.ctx.globalCompositeOperation = 'destination-out';
          layer.ctx.strokeStyle = 'rgba(0,0,0,1)';
          layer.ctx.lineWidth = getPressureAdjustedSize(params, segment.p2, layer.widthMultiplier);
          layer.ctx.lineCap = 'round';
          layer.ctx.lineJoin = 'round';
          traceCurve(layer.ctx, pts);
          layer.ctx.restore();
        });
      }

      function drawNeonLine(ctx, params) {
        const pts = params.points || [];
        if (pts.length < 2) return;

        const lastPoint = pts[pts.length - 1];
        const strokeSize = getPressureAdjustedSize(params, lastPoint);
        const haloSize = strokeSize;
        const coreSize = Math.max(1, strokeSize * 0.35);
        const blurAmount = strokeSize * clamp(params.glow ?? 0.5, 0, 1) * 1.5;
        const alphaBase = clamp(params.alpha ?? 1, 0.05, 1);

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.shadowBlur = blurAmount;
        ctx.shadowColor = params.color;
        ctx.lineWidth = haloSize;
        ctx.strokeStyle = applyAlphaToColor(params.color, alphaBase * 0.85);
        traceWholeCurve(ctx, pts);

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = coreSize;
        ctx.strokeStyle = '#ffffff';
        traceWholeCurve(ctx, pts);

        ctx.restore();
      }

      function drawSprayPattern(ctx, pts, params) {
        const lastPoint = pts[pts.length - 1];
        const prevPoint = pts.length > 1 ? pts[pts.length - 2] : lastPoint;
        const travel = Math.max(1, Math.hypot(lastPoint.x - prevPoint.x, lastPoint.y - prevPoint.y));
        const bursts = Math.max(1, Math.ceil(travel / 8));
        for (let i = 0; i < bursts; i++) {
          const t = bursts === 1 ? 1 : i / (bursts - 1);
          const point = {
            x: prevPoint.x + (lastPoint.x - prevPoint.x) * t,
            y: prevPoint.y + (lastPoint.y - prevPoint.y) * t,
            pressure: lastPoint.pressure ?? 1
          };
          sprayBurstAt(point, params, 0.85);
        }
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

        renderBrushPoint(drawCtx, point, state.activeStroke);
        send({
          type: 'drawStroke',
          stroke: {
            ...state.activeStroke,
            points: [toNormPoint(point)]
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
        state.activeStroke.points.push(point);
        renderStrokeContinuously(drawCtx, state.activeStroke);

        if (state.activeStroke.tool !== 'neon' && state.activeStroke.points.length > 12) {
          state.activeStroke.points = state.activeStroke.points.slice(-6);
        }

        send({
          type: 'drawStroke',
          stroke: {
            ...state.activeStroke,
            points: (state.activeStroke.tool === 'neon' ? state.activeStroke.points : getRenderableStrokePoints(state.activeStroke)).map(toNormPoint)
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
        const finishedStroke = state.activeStroke;
        state.pointerDown = false;
        state.activeStroke = null;
        if (finishedStroke && usesFxLayer(finishedStroke.tool)) {
          commitFxToDraw(true);
        }
        send({ type: 'pointerPreview', show: false });
      }

      function renderRemoteStroke(stroke) {
        if (!stroke || !stroke.points || !stroke.points.length) return;
        const hydratedPoints = stroke.points.map(fromStrokePoint);
        const hydratedStroke = { ...stroke, points: hydratedPoints };
        if (hydratedStroke.tool === 'neon') {
          if (hydratedPoints.length === 1) {
            renderBrushPoint(fxCtx, hydratedPoints[0], hydratedStroke);
            return;
          }
          renderStrokeContinuously(fxCtx, hydratedStroke);
          return;
        }
        if (hydratedPoints.length === 1) {
          renderBrushPoint(drawCtx, hydratedPoints[0], hydratedStroke);
          return;
        }
        renderStrokeContinuously(drawCtx, hydratedStroke);
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

      function tryLoadImageSource(src) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(src);
          img.onerror = reject;
          img.src = src;
        });
      }

      function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      async function tryLoadImageAsDataUrl(src) {
        const response = await fetch(src, { cache: 'no-store' });
        if (!response.ok) throw new Error(`No se pudo cargar ${src}`);
        const blob = await response.blob();
        return blobToDataUrl(blob);
      }

      async function autoLoadGuideImage() {
        if (state.baseImageData) return false;

        const candidates = ['./assets/guia.png', './guia.png'];
        for (const src of candidates) {
          try {
            const dataUrl = await tryLoadImageAsDataUrl(src);
            state.baseImageData = dataUrl;
            state.baseImageVisible = true;
            state.baseImageRect = null;
            state.baseImageRectNorm = null;
            loadBaseImageFromState();
            broadcastState(true);
            return true;
          } catch (_) {
            try {
              await tryLoadImageSource(src);
              state.baseImageData = src;
              state.baseImageVisible = true;
              state.baseImageRect = null;
              state.baseImageRectNorm = null;
              loadBaseImageFromState();
              broadcastState(true);
              return true;
            } catch (_) {}
          }
        }

        return false;
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

      function isMobileLikeDevice() {
        return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '') || window.innerWidth <= 900;
      }

      function dataUrlToFile(dataUrl, filename) {
        const [header, body] = dataUrl.split(',');
        const mimeMatch = /data:(.*?);base64/.exec(header || '');
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const binary = atob(body || '');
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new File([bytes], filename, { type: mime });
      }

      function triggerDownloadUrl(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      async function exportArtwork() {
        try {
          if (state.pointerDown && state.activeStroke && usesFxLayer(state.activeStroke.tool)) {
            commitFxToDraw(true);
          }

          const composite = document.createElement('canvas');
          composite.width = drawCanvas.width;
          composite.height = drawCanvas.height;
          const ctx = composite.getContext('2d');

          if (state.blackBg) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, composite.width, composite.height);
          }

          ctx.drawImage(drawCanvas, 0, 0);
          ctx.drawImage(fxCanvas, 0, 0);

          if (state.baseImageObject) {
            drawGuideOverlay(ctx, composite);
          }

          const dataUrl = composite.toDataURL('image/png', 1.0);
          const filename = `car-projection-${Date.now()}.png`;

          if (isMobileLikeDevice()) {
            try {
              const res = await fetch(dataUrl);
              const blob = await res.blob();
              const file = new File([blob], filename, { type: 'image/png' });

              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                  files: [file],
                  title: 'Exportación de proyección',
                  text: 'Dibujo exportado desde Car Projection Studio.'
                });
                simpleToast('Compartiendo imagen…');
                return;
              }
            } catch (shareErr) {
              console.warn('El menú de compartir falló o se canceló, forzando descarga...', shareErr);
            }
          }

          try {
            triggerDownloadUrl(dataUrl, filename);
            simpleToast('Imagen descargada exitosamente');
            return;
          } catch (downloadErr) {
            console.warn('La descarga directa falló, intentando vista previa...', downloadErr);
          }

          if (isMobileLikeDevice()) {
            const previewWindow = window.open('', '_blank');
            if (previewWindow) {
              previewWindow.document.write(`<!doctype html><title>${filename}</title><style>html,body{margin:0;background:#000;display:grid;place-items:center;height:100%}img{max-width:100%;max-height:100%;object-fit:contain}</style><img src="${dataUrl}" alt="${filename}">`);
              previewWindow.document.close();
              simpleToast('Abre la imagen y mantenla presionada para guardarla');
              return;
            }
          }

          window.location.href = dataUrl;
          simpleToast('Imagen generada');
        } catch (e) {
          console.error(e);
          simpleToast('Error general al exportar');
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

          if (state.pointerDown && state.activeStroke && state.activeStroke.tool === 'neon') {
            fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
          }

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
      autoLoadGuideImage();
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
