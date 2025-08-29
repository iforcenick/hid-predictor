function setupRuntimeId(runtimeId) {
  const runtimeElementId = 'chrome-runtime-id'
  let runtimeElement = document.getElementById(runtimeElementId)
  if(!runtimeElement) {
    runtimeElement = document.createElement('div')
    runtimeElement.setAttribute('id', runtimeElementId)
    runtimeElement.setAttribute('data-runtime-id', runtimeId)
    document.body.appendChild(runtimeElement)
  }
}

const detectResolution = () => {
  const streamResolutionSelector = document.getElementById('stream-resolution-selector')
  if(!streamResolutionSelector) {
    return
  }
  const streamResolution = streamResolutionSelector.value.split('x').map(Number)
  chrome.runtime.sendMessage({
    message_type: 'setResolution',
    resolution: {
      width: streamResolution[0],
      height: streamResolution[1]
    }
  })
}
const detectViewport = () => {
  const viewport = document.getElementById('stream-video')
    if(!viewport) {
      return
    }
  chrome.runtime.sendMessage({
    message_type: 'setViewport',
    viewport: {
      width: viewport.clientWidth,
      height: viewport.clientHeight
    }
  })
}

let isPickMode = false

window.onload = async () => {
  const runtimeId = await chrome.runtime.sendMessage({ message_type: 'runtimeId' });
  setupRuntimeId(runtimeId);

  document.getElementById('stream-video').addEventListener('mousedown', (e) => {
    if(!isPickMode) {
      return
    }
    const target = e.target;
    // Get the element's bounding box (position and size)
    const rect = target.getBoundingClientRect();

    // Mouse coordinates relative to the element
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    chrome.runtime.sendMessage({
      message_type: 'setInitialPosition',
      position: { x, y },
    })
    isPickMode = false
  })
  setInterval(() => {
    detectResolution()
    detectViewport()
  }, 1000)
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if(request.message_type === 'setInitialPickMode') {
    isPickMode = true
  }
});