const DEFAULTS = {
  defaultPosition: 'last-fourth',
  focusNewWindow: true
};

// Toolbar icon click (and Alt+Shift+X): detach the active tab to the
// default position.
chrome.action.onClicked.addListener(() => {
  detachActiveTab();
});

async function detachActiveTab() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) return;

  const currentWin = await chrome.windows.get(activeTab.windowId);
  const options = await chrome.storage.sync.get(DEFAULTS);

  const displays = await chrome.system.display.getInfo();
  const targetDisplay = findDisplayForWindow(currentWin, displays) || displays[0];
  const area = targetDisplay.workArea || targetDisplay.bounds;
  const bounds = positionBounds(options.defaultPosition, area);

  // If a window already sits at the target position, dock the tab into it
  // instead of opening another window.
  const existing = await findWindowAtBounds(bounds);
  if (existing) {
    await chrome.tabs.move(activeTab.id, { windowId: existing.id, index: -1 });
    await chrome.tabs.update(activeTab.id, { active: true });
    if (options.focusNewWindow) {
      await chrome.windows.update(existing.id, { focused: true });
    }
    return;
  }

  await chrome.windows.create({
    tabId: activeTab.id,
    type: 'normal',
    focused: options.focusNewWindow,
    ...bounds
  });
}

/**
 * Pixel bounds for one vertical slice of the work area.
 * @param {'first-fourth'|'first-third'|'center-third'|'last-third'|'last-fourth'} position
 */
function positionBounds(position, area) {
  const fractions = {
    'first-fourth': [0, 1 / 4],
    'first-third': [0, 1 / 3],
    'center-third': [1 / 3, 2 / 3],
    'last-third': [2 / 3, 1],
    'last-fourth': [3 / 4, 1]
  };
  const [start, end] = fractions[position] || fractions['last-fourth'];
  return {
    left: Math.round(area.left + start * area.width),
    top: Math.round(area.top),
    width: Math.round((end - start) * area.width),
    height: Math.round(area.height)
  };
}

const POSITION_TOLERANCE_PX = 12;

function boundsMatch(a, b) {
  return (
    Math.abs(a.left - b.left) <= POSITION_TOLERANCE_PX &&
    Math.abs(a.top - b.top) <= POSITION_TOLERANCE_PX &&
    Math.abs(a.width - b.width) <= POSITION_TOLERANCE_PX &&
    Math.abs(a.height - b.height) <= POSITION_TOLERANCE_PX
  );
}

/** Finds a normal window already sitting at the given bounds, if any. */
async function findWindowAtBounds(bounds) {
  const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
  return windows.find((w) => boundsMatch(w, bounds)) || null;
}

function findDisplayForWindow(win, displays) {
  const winCenterX = win.left + (win.width / 2);
  const winCenterY = win.top + (win.height / 2);

  return displays.find(d => {
    const b = d.bounds;
    return winCenterX >= b.left && winCenterX <= (b.left + b.width) &&
           winCenterY >= b.top && winCenterY <= (b.top + b.height);
  });
}
