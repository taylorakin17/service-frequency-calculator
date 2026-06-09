// ============================================================
// Defaults
// ============================================================

const DEFAULTS = {
  nozzleCount:          15,
  spraysPerDay:         5,
  secondsPerSpray:      60,
  selectedBarrelSize:   55,
  effectiveGallons55:   52,
  effectiveGallons30:   28,
  sprayRateOzPerMinute: 1.6,
  theme:                'light',
};

// ============================================================
// State (loaded from localStorage, falls back to defaults)
// ============================================================

const state = {
  nozzleCount:          loadNumber('nozzleCount',          DEFAULTS.nozzleCount),
  spraysPerDay:         loadNumber('spraysPerDay',         DEFAULTS.spraysPerDay),
  secondsPerSpray:      loadNumber('secondsPerSpray',      DEFAULTS.secondsPerSpray),
  selectedBarrelSize:   loadNumber('selectedBarrelSize',   DEFAULTS.selectedBarrelSize),
  effectiveGallonsMap:  {
    55: loadNumber('effectiveGallons55', DEFAULTS.effectiveGallons55),
    30: loadNumber('effectiveGallons30', DEFAULTS.effectiveGallons30),
  },
  sprayRateOzPerMinute: loadNumber('sprayRateOzPerMinute', DEFAULTS.sprayRateOzPerMinute),
  theme:                localStorage.getItem('theme') || DEFAULTS.theme,
};

function loadNumber(key, fallback) {
  const stored = parseFloat(localStorage.getItem(key));
  return isNaN(stored) ? fallback : stored;
}

// ============================================================
// Calculation
// ============================================================

function calculateServiceFrequencyDays(nozzleCount, spraysPerDay, secondsPerSpray, sprayRateOzPerMinute, effectiveGallons) {
  const dailyUsageOz = nozzleCount * spraysPerDay * (secondsPerSpray / 60) * sprayRateOzPerMinute;
  if (dailyUsageOz <= 0) return null;
  return Math.floor((effectiveGallons * 128) / dailyUsageOz);
}

// ============================================================
// Result display
// ============================================================

const resultNumberEl = document.getElementById('resultNumber');

function refreshResult() {
  const effectiveGallons = state.effectiveGallonsMap[state.selectedBarrelSize];
  const days = calculateServiceFrequencyDays(
    state.nozzleCount,
    state.spraysPerDay,
    state.secondsPerSpray,
    state.sprayRateOzPerMinute,
    effectiveGallons
  );

  const displayText = (days !== null && days > 0) ? String(days) : '–';

  if (resultNumberEl.textContent !== displayText) {
    resultNumberEl.classList.remove('pop');
    void resultNumberEl.offsetWidth; // trigger reflow to restart animation
    resultNumberEl.textContent = displayText;
    resultNumberEl.classList.add('pop');
  }
}

// ============================================================
// Theme
// ============================================================

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  const themeColor = theme === 'dark' ? '#1c1c1e' : '#f2f2f7';
  document.getElementById('themeColorMeta').setAttribute('content', themeColor);
}

document.getElementById('themeBtn').addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(state.theme);
  localStorage.setItem('theme', state.theme);
});

// ============================================================
// Barrel chip selector
// ============================================================

document.getElementById('barrelChips').addEventListener('click', (event) => {
  const chip = event.target.closest('.chip');
  if (!chip) return;

  const selectedSize = parseInt(chip.dataset.value, 10);
  state.selectedBarrelSize = selectedSize;
  localStorage.setItem('selectedBarrelSize', selectedSize);

  document.querySelectorAll('#barrelChips .chip').forEach((c) => {
    c.classList.toggle('chip--selected', parseInt(c.dataset.value, 10) === selectedSize);
  });

  refreshResult();
});

// ============================================================
// Number input factory
// ============================================================

function attachNumberInput(inputEl, { get, set, storageKey, min = 0.001, defaultValue }) {
  inputEl.value = get();
  inputEl.placeholder = String(defaultValue);

  let valueBeforeFocus = get();

  inputEl.addEventListener('focus', () => {
    valueBeforeFocus = inputEl.value;
    inputEl.value = '';
  });

  inputEl.addEventListener('blur', () => {
    const parsed = parseFloat(inputEl.value);
    if (isNaN(parsed) || parsed < min) {
      inputEl.value = valueBeforeFocus;
    } else {
      set(parsed);
      localStorage.setItem(storageKey, parsed);
      inputEl.value = parsed;
    }
    refreshResult();
  });

  inputEl.addEventListener('input', () => {
    const parsed = parseFloat(inputEl.value);
    if (!isNaN(parsed) && parsed >= min) {
      set(parsed);
      refreshResult();
    }
  });
}

attachNumberInput(document.getElementById('nozzleCountInput'), {
  get: ()  => state.nozzleCount,
  set: (v) => { state.nozzleCount = v; },
  storageKey:   'nozzleCount',
  min:          1,
  defaultValue: DEFAULTS.nozzleCount,
});

attachNumberInput(document.getElementById('spraysPerDayInput'), {
  get: ()  => state.spraysPerDay,
  set: (v) => { state.spraysPerDay = v; },
  storageKey:   'spraysPerDay',
  min:          1,
  defaultValue: DEFAULTS.spraysPerDay,
});

attachNumberInput(document.getElementById('secondsPerSprayInput'), {
  get: ()  => state.secondsPerSpray,
  set: (v) => { state.secondsPerSpray = v; },
  storageKey:   'secondsPerSpray',
  min:          1,
  defaultValue: DEFAULTS.secondsPerSpray,
});

// ============================================================
// Settings sheet
// ============================================================

const settingsSheet  = document.getElementById('settingsSheet');
const sheetOverlay   = document.getElementById('sheetOverlay');

function openSettings() {
  settingsSheet.classList.add('sheet--open');
  sheetOverlay.classList.add('overlay--visible');
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  settingsSheet.classList.remove('sheet--open');
  sheetOverlay.classList.remove('overlay--visible');
  document.body.style.overflow = '';
}

document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
sheetOverlay.addEventListener('click', closeSettings);

// ============================================================
// Settings inputs — barrel effective volume
// ============================================================

function attachSettingsInput(inputEl, { mapKey, storageKey, defaultValue }) {
  inputEl.value = state.effectiveGallonsMap[mapKey];

  let valueBeforeFocus = inputEl.value;

  inputEl.addEventListener('focus', () => {
    valueBeforeFocus = inputEl.value;
    inputEl.value = '';
  });

  inputEl.addEventListener('blur', () => {
    const parsed = parseFloat(inputEl.value);
    if (isNaN(parsed) || parsed <= 0) {
      inputEl.value = valueBeforeFocus;
    } else {
      state.effectiveGallonsMap[mapKey] = parsed;
      localStorage.setItem(storageKey, parsed);
      inputEl.value = parsed;
      refreshResult();
    }
  });
}

attachSettingsInput(document.getElementById('effectiveGallons55Input'), {
  mapKey:       55,
  storageKey:   'effectiveGallons55',
  defaultValue: DEFAULTS.effectiveGallons55,
});

attachSettingsInput(document.getElementById('effectiveGallons30Input'), {
  mapKey:       30,
  storageKey:   'effectiveGallons30',
  defaultValue: DEFAULTS.effectiveGallons30,
});

// ============================================================
// Settings input — spray rate
// ============================================================

attachNumberInput(document.getElementById('sprayRateInput'), {
  get: ()  => state.sprayRateOzPerMinute,
  set: (v) => { state.sprayRateOzPerMinute = v; },
  storageKey:   'sprayRateOzPerMinute',
  min:          0.01,
  defaultValue: DEFAULTS.sprayRateOzPerMinute,
});

// ============================================================
// Init
// ============================================================

applyTheme(state.theme);

// Sync barrel chip to loaded state
document.querySelectorAll('#barrelChips .chip').forEach((c) => {
  c.classList.toggle('chip--selected', parseInt(c.dataset.value, 10) === state.selectedBarrelSize);
});

refreshResult();

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch((err) => {
    console.warn('Service worker registration failed:', err);
  });
}

// ============================================================
// Install banner
// ============================================================

const installBanner = document.getElementById('installBanner');
const installBannerDismiss = document.getElementById('installBannerDismiss');

const isRunningInstalled =
  window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

const hasDismissedBanner = localStorage.getItem('installBannerDismissed') === 'true';

function dismissInstallBanner() {
  installBanner.classList.remove('install-banner--visible');
  localStorage.setItem('installBannerDismissed', 'true');
}

if (!isRunningInstalled && !hasDismissedBanner) {
  setTimeout(() => installBanner.classList.add('install-banner--visible'), 1200);
}

installBannerDismiss.addEventListener('click', dismissInstallBanner);
