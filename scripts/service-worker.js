const TRACKING_SPEED = 0.688

let cursorPosition = { x: 0, y: 0 }
let resolution = { width: 0, height: 0 }
let viewport = { width: 0, height: 0 }

function saveToLocalStorage(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({[key]: value}, function() {
      if(chrome.runtime.lastError) {
        throw Error(chrome.runtime.lastError);
      } else {
        resolve(value)
      }
    });
  })
}
function getFromLocalStorage(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], function(data) {
      let value = null
      if(data?.[key] === undefined) {
        value = null
      } else {
        value = data[key];
      }
      resolve(value)
    })
  })
}


async function getPredictedPosition(data) {
  const numArr = data.split(',').map(Number)
  if(numArr[0] === 4) {
    const squash = numArr[1] === 1

    console.log(numArr)

    for(let i = 2; i < numArr.length; i += 2) {
      cursorPosition.x += TRACKING_SPEED * numArr[i]
      cursorPosition.y += TRACKING_SPEED * numArr[i + 1]

      if(cursorPosition.x < 0) {
        cursorPosition.x = 0
      }
      if(cursorPosition.y < 0) {
        cursorPosition.y = 0
      }
      if(cursorPosition.x > resolution.width) {
        cursorPosition.x = resolution.width
      }
      if(cursorPosition.y > resolution.height) {
        cursorPosition.y = resolution.height
      }
    }
    if(resolution.width > 0 && resolution.height > 0 && viewport.width > 0 && viewport.height > 0) {
      return {
        x: cursorPosition.x / resolution.width * viewport.width,
        y: cursorPosition.y / resolution.height * viewport.height
      }
    }
    return null
  }
  return null
}

async function fixPosition() {
  if(resolution.width > 0 && resolution.height > 0) {
    return {
      x: cursorPosition.x / TRACKING_SPEED,
      y: cursorPosition.y / TRACKING_SPEED,
      width: resolution.width / TRACKING_SPEED,
      height: resolution.height / TRACKING_SPEED,
    }
  }
}

chrome.runtime.onMessageExternal.addListener(async (request, sender, sendResponse) => {
  const messageType = request.message_type
  if(messageType === 'getPredictedPosition') {
    const predictedPosition = await getPredictedPosition(request.data)
    sendResponse(predictedPosition)
  } else if(messageType === 'patchPosition') {
    const fixture = await fixPosition()
    sendResponse(fixture)
  }
  return true
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const messageType = request.message_type
  if(messageType === 'runtimeId') {
    sendResponse(chrome.runtime.id);
    return false
  } else if(messageType === 'setInitialPosition') {
    if(viewport.width > 0 && viewport.height > 0 && resolution.width > 0 && resolution.height > 0) {
      const cursorPosition = {
        x: request.position.x / viewport.width * resolution.width,
        y: request.position.y / viewport.height * resolution.height
      }
      saveToLocalStorage('cursorPosition', cursorPosition)
      console.log("Initial position:", cursorPosition)
    }
    return false
  } else if(messageType === 'setResolution') {
    resolution = request.resolution
    saveToLocalStorage('resolution', resolution)
    return false
  } else if(messageType === 'setViewport') {
    viewport = request.viewport
    saveToLocalStorage('viewport', viewport)
    return false
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'set_initial_position',
    title: 'Set Initial Position',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'set_initial_position') {
    await chrome.tabs.sendMessage(tab.id, {
      message_type: 'setInitialPickMode',
    });
  }
});

(async () => {
  cursorPosition = await getFromLocalStorage('cursorPosition') || { x: 0, y: 0 }
  resolution = await getFromLocalStorage('resolution') || { width: 0, height: 0 }
  viewport = await getFromLocalStorage('viewport') || { width: 0, height: 0 }

  setInterval(() => {
    saveToLocalStorage('cursorPosition', cursorPosition)
  }, 500)
})()