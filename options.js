const DEFAULTS = {
  defaultPosition: 'last-fourth',
  focusNewWindow: true
};

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(DEFAULTS, (items) => {
    const positionRadio = document.querySelector(
      `input[name="defaultPosition"][value="${items.defaultPosition}"]`
    );
    if (positionRadio) positionRadio.checked = true;
    document.getElementById('focusNewWindow').checked = items.focusNewWindow;
  });

  document.getElementById('save').addEventListener('click', () => {
    const settings = {
      defaultPosition:
        (document.querySelector('input[name="defaultPosition"]:checked') || {}).value || 'last-fourth',
      focusNewWindow: document.getElementById('focusNewWindow').checked
    };

    chrome.storage.sync.set(settings, () => {
      const status = document.getElementById('status');
      status.textContent = 'Settings saved.';
      setTimeout(() => { status.textContent = ''; }, 2000);
    });
  });
});
