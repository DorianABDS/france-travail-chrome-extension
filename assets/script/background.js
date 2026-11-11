// Service worker : affiche un badge sur l'icône quand l'actualisation du mois reste à faire.
importScripts('shared.js');

async function updateBadge() {
    const { run, lastDone, siteStatus } = await FT.getState();
    const { state } = FT.statusInfo(run, lastDone, siteStatus);

    let text = '';
    let color = '#283276';
    if (state === 'error') {
        text = '!';
        color = '#b3261e';
    } else if (state === 'todo') {
        text = '1';
        color = '#b3261e';
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
