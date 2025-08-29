let runtimeId = null

function sleep(duration) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, duration)
  })
}

(async () => {
  while(true) {
    const runtimeElementId = 'chrome-runtime-id'
    let runtimeElement = document.getElementById(runtimeElementId)
    if(runtimeElement) {
      const dataRuntimeId = runtimeElement.getAttribute('data-runtime-id')
      if(dataRuntimeId) {
        runtimeId = dataRuntimeId
      }
    }
    await sleep(1000)
  }
})();

const placeIndicator = (pos) => {
  const viewport = document.getElementById('stream-box')
  if(!viewport) {
    return
  }
  let indicatorElement = document.getElementById('prediction-indicator')
  if(!indicatorElement) {
    indicatorElement = document.createElement('div')
    indicatorElement.style.position = 'absolute'
    indicatorElement.style.width = '8px'
    indicatorElement.style.height = '8px'
    indicatorElement.style.backgroundColor = 'rgba(220, 0, 0, 0.6)'
    indicatorElement.style.borderRadius = '50%'
    indicatorElement.style.border = '1px solid rgba(255, 255, 255, 0.8)'
    indicatorElement.id = 'prediction-indicator'
    viewport.appendChild(indicatorElement)
  }
  indicatorElement.style.display = 'block'
  indicatorElement.style.left = `${pos.x - 4}px`
  indicatorElement.style.top = `${pos.y - 4}px`
}

const _send = WebSocket.prototype.send;
let mouseEventSocket = null
WebSocket.prototype.send = function (data) {
  const _socket = this
  if(runtimeId) {
    if(data instanceof Uint8Array || data instanceof Int8Array) {
      mouseEventSocket = _socket
      chrome.runtime.sendMessage(
        runtimeId,
        {
          message_type: 'getPredictedPosition',
          unsigned: data instanceof Uint8Array,
          data: data.map(byte => byte.toString()).join(','),
        }
      ).then(predictedPosition => {
        if(predictedPosition) {
          placeIndicator(predictedPosition)
        }
      })
    }
  }
  _send.apply(this, arguments);
};

async function moveByOffset(offset) {
  const MAX_MOVE_PER_STEP = 127
  if(mouseEventSocket) {
    const commandArray = [0x04, 0x01]
    const direction = {
      x: offset.x > 0 ? 1 : -1,
      y: offset.y > 0 ? 1 : -1,
    }
    const currentOffset = {
      x: Math.abs(offset.x),
      y: Math.abs(offset.y),
    }
    while(currentOffset.x > 0 || currentOffset.y > 0) {
      const moveX = Math.min(currentOffset.x, MAX_MOVE_PER_STEP)
      const moveY = Math.min(currentOffset.y, MAX_MOVE_PER_STEP)
      commandArray.push(moveX * direction.x, moveY * direction.y)
      currentOffset.x -= moveX
      currentOffset.y -= moveY
    }
    mouseEventSocket.send(new Int8Array(commandArray))
  }
}

document.addEventListener('keydown', async (e) => {
  if(e.key === 'F9') {
    const fixture = await chrome.runtime.sendMessage(runtimeId, {
      message_type: 'patchPosition',
    })
    if(fixture && mouseEventSocket) {
      await moveByOffset({
        x: fixture.width,
        y: fixture.height,
      })
      await sleep(50)
      await moveByOffset({
        x: -fixture.width,
        y: -fixture.height,
      })
      await sleep(50)
      await moveByOffset({
        x: fixture.x,
        y: fixture.y,
      })
    }
  }
})