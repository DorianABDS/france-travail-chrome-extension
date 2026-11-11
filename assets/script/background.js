// Service worker : affiche un badge sur l'icône quand l'actualisation du mois reste à faire.
importScripts('shared.js');

async function updateBadge() {
    const { run, lastDone } = await FT.getState();
    const period = FT.currentPeriod();

    let text = '';
    let color = '#283276';
    if (run.status === 'error') {
        text = '!';
        color = '#b3261e';
    } else if (period.open && lastDone?.period !== period.key) {
        text = '1';
    }
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('badge', { periodInMinutes: 60 });
    updateBadge();
});
chrome.runtime.onStartup.addListener(updateBadge);
chrome.alarms.onAlarm.addListener(updateBadge);
chrome.storage.onChanged.addListener(updateBadge);
