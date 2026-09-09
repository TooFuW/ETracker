document.addEventListener('DOMContentLoaded', async () => {
    const apiUrlInput = document.getElementById('apiUrl');
    const apiKeyInput = document.getElementById('apiKey');
    const status = document.getElementById('status');

    const config = await chrome.storage.local.get(['apiUrl', 'apiKey']);
    if (config.apiUrl) apiUrlInput.value = config.apiUrl;
    if (config.apiKey) apiKeyInput.value = config.apiKey;

    document.getElementById('save').addEventListener('click', async () => {
        await chrome.storage.local.set({
            apiUrl: apiUrlInput.value.trim(),
            apiKey: apiKeyInput.value.trim()
        });
        status.textContent = 'Saved.';
        setTimeout(() => { status.textContent = ''; }, 2000);
    });
});
