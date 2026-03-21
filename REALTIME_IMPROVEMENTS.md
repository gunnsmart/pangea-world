# Real-time Improvements & Dialogue System Guide

## Overview

This document describes the improvements made to the Pangea Simulation to achieve:
1. **Accelerated Simulation Speed**: 1 real-world day = 2 simulation days (30 minutes to see 1 full sim day)
2. **Smoother Visual Rendering**: Enhanced canvas rendering with interpolation support
3. **Dialogue/Speech Tracking**: New dedicated UI panel to monitor Adam and Eve's conversations

## 1. Simulation Speed Acceleration

### Time Scale Changes

**Previous Configuration:**
- 1 simulation hour = 150 real seconds
- 1 simulation day (24 hours) = 3,600 real seconds = 60 minutes
- User watches for 1 hour to see 1 full day

**New Configuration:**
- 1 simulation hour = 75 real seconds (2x faster)
- 1 simulation day (24 hours) = 1,800 real seconds = **30 minutes**
- User watches for 30 minutes to see 1 full day

### Implementation (server.py)

```python
# Time Scale
SIM_STEP_INTERVAL = 75.0   # Real seconds per 1 sim hour (3600/48 = 75)

# Summary
# 75 seconds = 1 hour sim
# 1,800 seconds (30 minutes real) = 24 hours sim = 1 day sim ✅
# Watch 30 minutes, see Adam/Eve live 1 full day
```

This is achieved by reducing the `SIM_STEP_INTERVAL` from 150 to 75 seconds, which doubles the simulation speed.

## 2. Dialogue Data Collection

### Server-side Changes (server.py)

The `get_snapshot()` method now collects recent dialogue events from both humans:

```python
# Collect recent dialogue/speech events
dialogue_events = []
for h in self.humans:
    if h.last_utterance:
        dialogue_events.append({
            "speaker": h.name,
            "words": " ".join(h.last_utterance.words),
            "meaning": h.last_utterance.meaning,
            "day": self.day,
            "hour": self.hour,
            "timestamp": now_thai.isoformat(),
        })

result = {
    ...
    "dialogue": dialogue_events,  # Recent speech events from Adam/Eve
    ...
}
```

**Data Structure:**
| Field | Type | Description |
|-------|------|-------------|
| `speaker` | string | Name of the speaker (Adam or Eve) |
| `words` | string | The words spoken (space-separated) |
| `meaning` | string | The semantic meaning/intent of the utterance |
| `day` | int | Simulation day when spoken |
| `hour` | int | Simulation hour when spoken |
| `timestamp` | string | ISO timestamp (Thai timezone) |

### Dialogue Source

The dialogue data comes from the `HumanAI.last_utterance` attribute, which is populated by the language system (`language.py`):
- Each utterance contains the words spoken and their semantic meaning
- Utterances are created when humans interact with each other or their environment
- The system tracks who heard the utterance and when it was spoken

## 3. Frontend UI Improvements

### New Dialogue Tab

**Location:** `static/index.html`

A new tab has been added to the sidebar UI:
```html
<div class="tab" onclick="switchTab('dialogue')">💬</div>

<!-- DIALOGUE -->
<div class="tab-content" id="tab-dialogue">
  <div class="section">
    <div class="section-title">💬 Speech & Language</div>
    <div id="dialogue-panel" style="font-size:11px; max-height:100%; overflow-y:auto;"></div>
  </div>
</div>
```

**CSS Styling:**
```css
/* Dialogue panel */
#dialogue-panel { display: flex; flex-direction: column; gap: 4px; }
.dialogue-entry { 
  padding: 4px 6px; 
  background: var(--bg); 
  border-left: 2px solid var(--accent); 
  border-radius: 2px; 
  font-size: 11px; 
  line-height: 1.4; 
  color: var(--text); 
}
.dialogue-entry strong { color: var(--gold); }
```

### Frontend JavaScript Update (main_responsive.js)

A new function `updateDialoguePanel()` processes incoming dialogue events:

```javascript
// Update dialogue panel
function updateDialoguePanel(dialogueEvents) {
  const dialoguePanel = document.getElementById('dialogue-panel');
  if (!dialoguePanel) return;
  
  for (const event of dialogueEvents) {
    const entry = document.createElement('div');
    entry.className = 'dialogue-entry';
    entry.innerHTML = '<strong>' + event.speaker + ':</strong> ' + event.words;
    dialoguePanel.appendChild(entry);
  }
  
  // Keep only last 20 entries
  while (dialoguePanel.children.length > 20) {
    dialoguePanel.removeChild(dialoguePanel.firstChild);
  }
  
  // Auto-scroll to bottom
  dialoguePanel.scrollTop = dialoguePanel.scrollHeight;
}
```

**Features:**
- Displays speaker name in gold color
- Shows the words spoken
- Maintains a rolling history of last 20 dialogue entries
- Auto-scrolls to show latest speech
- Responsive design adapts to mobile/tablet/desktop

### Integration with Rendering

The `renderPartial()` function now calls the dialogue update:

```javascript
function renderPartial(data) {
  updateHeader(data);
  if (data.humans)  updateHumans(data.humans, lastState.relationship);
  if (data.fauna)   updateStats(lastState);
  if (data.history) updateLog(data.history);
  if (data.dialogue) updateDialoguePanel(data.dialogue);  // NEW
  if (lastState && lastState.map) {
    drawEntitiesOnly(data.humans, data.animals || []);
  }
}
```

## 4. Future Enhancements

### Speech Bubbles on Canvas

The `main_enhanced.js` file includes a prototype for rendering speech bubbles directly on the map canvas:

```javascript
// Draw speech bubble above character
function drawSpeechBubble(x, y, text) {
  const padding = 5;
  const fontSize = 10;
  ctx.font = `${fontSize}px Arial`;
  const metrics = ctx.measureText(text);
  const width = metrics.width + padding * 2;
  const height = fontSize + padding * 2;
  
  // Draw bubble background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(x - width/2, y - height, width, height);
  
  // Draw bubble border
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - width/2, y - height, width, height);
  
  // Draw text
  ctx.fillStyle = '#000';
  ctx.fillText(text, x - metrics.width/2, y - padding - 2);
}
```

This can be integrated into the main rendering pipeline to show dialogue directly above characters on the map.

### Real-time Interpolation

The `main_enhanced.js` also includes a framework for smooth interpolation between server updates:

```javascript
// Real-time Interpolation
let lastUpdateTime = Date.now();
let entityInterpolationData = {}; // Store previous positions for interpolation

// Animation loop for smooth rendering
function animationLoop() {
  if (lastState && lastState.map) {
    drawEntitiesOnly(lastState.humans || [], lastState.animals || []);
  }
  requestAnimationFrame(animationLoop);
}
```

This can be extended to interpolate character positions between server updates for even smoother movement.

## 5. Testing Checklist

- [ ] Simulation runs 2x faster (1 day in 30 minutes)
- [ ] Dialogue tab appears in the sidebar UI
- [ ] Dialogue entries show speaker name and words
- [ ] Dialogue panel auto-scrolls to show latest entries
- [ ] Dialogue history maintains last 20 entries
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] No console errors related to dialogue updates
- [ ] Performance is not degraded by dialogue tracking

## 6. Deployment Instructions

### On AWS EC2

1. **Pull the latest changes:**
   ```bash
   cd ~/pangea-world
   git pull origin main
   ```

2. **Verify the changes:**
   ```bash
   # Check that server.py has SIM_STEP_INTERVAL = 75.0
   grep "SIM_STEP_INTERVAL" server.py
   
   # Check that main_responsive.js has updateDialoguePanel function
   grep "updateDialoguePanel" static/main_responsive.js
   
   # Check that index.html has dialogue tab
   grep "dialogue" static/index.html
   ```

3. **Restart the server:**
   ```bash
   # If using systemd or supervisor, restart the service
   # Or manually restart with Ctrl+C and rerun
   ```

4. **Test in browser:**
   - Open the Pangea Simulation
   - Click the 💬 (Dialogue) tab
   - Watch for speech entries to appear
   - Verify simulation runs faster

## 7. Performance Notes

- **Simulation Speed:** 2x faster means higher CPU usage during simulation steps
- **Memory:** Dialogue tracking adds minimal overhead (storing recent utterances only)
- **Network:** Dialogue data is included in existing state updates, no additional bandwidth
- **Rendering:** No change to rendering performance; dialogue is text-only in sidebar

## 8. Known Limitations

1. **Speech Bubbles on Map:** Not yet implemented; dialogue only appears in sidebar panel
2. **Interpolation:** Smooth movement between server updates not yet implemented
3. **Speech Frequency:** Depends on human AI behavior; may be sparse during certain activities
4. **Language Complexity:** Currently shows raw words; semantic meaning not displayed

## References

- **Simulation Time Scale:** `server.py` lines 55-64
- **Dialogue Collection:** `server.py` lines 231-242
- **Frontend UI:** `static/index.html` lines 270-273, 572, 639-645
- **Dialogue Update:** `static/main_responsive.js` lines 60-77, 85
- **Enhanced Features:** `static/main_enhanced.js` (prototype, not yet in use)
