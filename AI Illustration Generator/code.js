figma.showUI(__html__, { width: 540, height: 280 });

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

(async function initUserId() {
  var userId = await figma.clientStorage.getAsync('user_id');
  if (!userId) {
    userId = generateUUID();
    await figma.clientStorage.setAsync('user_id', userId);
  }
  var deletedIds = (await figma.clientStorage.getAsync('deletedHistoryIds')) || [];
  figma.ui.postMessage({ type: 'user-id', userId: userId, deletedIds: deletedIds });
})();

figma.ui.onmessage = async (msg) => {
  console.log('[code.js] received message type:', msg.type);

  if (msg.type === 'insert-image') {
    const { bytes, width, height } = msg;
    console.log('[code.js] bytes type:', typeof bytes, Array.isArray(bytes) ? 'isArray' : 'notArray');
    console.log('[code.js] bytes length:', bytes.length !== undefined ? bytes.length : (bytes.byteLength !== undefined ? bytes.byteLength : 'unknown'));
    console.log('[code.js] dimensions:', width, 'x', height);

    const uint8 = new Uint8Array(bytes);
    console.log('[code.js] Uint8Array byteLength:', uint8.byteLength, 'first 4 bytes:', uint8[0], uint8[1], uint8[2], uint8[3]);

    console.log('[code.js] calling figma.createImage...');
    const image = figma.createImage(uint8);
    console.log('[code.js] figma.createImage succeeded, hash:', image.hash);

    const rect = figma.createRectangle();
    rect.resize(width, height);

    const center = figma.viewport.center;
    rect.x = center.x - width / 2;
    rect.y = center.y - height / 2;

    rect.fills = [
      {
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: 'FILL',
      },
    ];

    figma.currentPage.appendChild(rect);
    figma.currentPage.selection = [rect];
    figma.viewport.scrollAndZoomIntoView([rect]);
    console.log('[code.js] rectangle inserted and zoomed into view');
  }

  if (msg.type === 'resize') {
    figma.ui.resize(msg.width || 360, msg.height);
  }

  if (msg.type === 'delete-history-id') {
    var ids = (await figma.clientStorage.getAsync('deletedHistoryIds')) || [];
    if (!ids.includes(msg.id)) ids.push(msg.id);
    await figma.clientStorage.setAsync('deletedHistoryIds', ids);
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
