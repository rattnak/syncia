// Service worker — opens the side panel when the extension action is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error)

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_AUTH_TOKEN') {
    // The panel will read the session token from storage (set by the web app via postMessage or shared cookie domain)
    chrome.storage.local.get('syncia_session', (result) => {
      sendResponse({ token: result.syncia_session ?? null })
    })
    return true // keep channel open for async response
  }
})
