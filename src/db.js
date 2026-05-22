const DB_NAME = 'localguide';
const DB_VERSION = 1;
const STORE_GUIDES = 'guides';
const STORE_STEPS = 'steps';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_GUIDES)) {
        const guides = db.createObjectStore(STORE_GUIDES, { keyPath: 'id' });
        guides.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(STORE_STEPS)) {
        const steps = db.createObjectStore(STORE_STEPS, { keyPath: 'id' });
        steps.createIndex('guideId', 'guideId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function tx(db, storeNames, mode) {
  return db.transaction(storeNames, mode);
}

function awaitTx(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

function reqAsPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + '-' + Date.now();
}

async function createGuide({ title = 'Untitled Guide', description = '' } = {}) {
  const db = await openDb();
  const now = Date.now();
  const guide = {
    id: newId(),
    title,
    description,
    stepIds: [],
    createdAt: now,
    updatedAt: now,
  };
  const transaction = tx(db, [STORE_GUIDES], 'readwrite');
  transaction.objectStore(STORE_GUIDES).put(guide);
  await awaitTx(transaction);
  return guide;
}

async function getGuide(id) {
  const db = await openDb();
  const transaction = tx(db, [STORE_GUIDES], 'readonly');
  const result = await reqAsPromise(transaction.objectStore(STORE_GUIDES).get(id));
  return result || null;
}

async function addStep(guideId, { description = '', screenshotBlob, elementMetadata = {} }) {
  const db = await openDb();
  const transaction = tx(db, [STORE_GUIDES, STORE_STEPS], 'readwrite');
  const guidesStore = transaction.objectStore(STORE_GUIDES);
  const stepsStore = transaction.objectStore(STORE_STEPS);

  const guide = await reqAsPromise(guidesStore.get(guideId));
  if (!guide) {
    transaction.abort();
    throw new Error(`Guide not found: ${guideId}`);
  }

  const step = {
    id: newId(),
    guideId,
    order: guide.stepIds.length,
    description,
    screenshotBlob,
    elementMetadata,
    timestamp: Date.now(),
  };

  guide.stepIds = [...guide.stepIds, step.id];
  guide.updatedAt = Date.now();

  stepsStore.put(step);
  guidesStore.put(guide);

  await awaitTx(transaction);
  return step;
}

async function getStepsForGuide(guideId) {
  const db = await openDb();
  const guide = await getGuide(guideId);
  if (!guide) return [];

  const transaction = tx(db, [STORE_STEPS], 'readonly');
  const store = transaction.objectStore(STORE_STEPS);
  const steps = await Promise.all(guide.stepIds.map(id => reqAsPromise(store.get(id))));
  return steps.filter(Boolean).sort((a, b) => a.order - b.order);
}

async function listGuides() {
  const db = await openDb();
  const transaction = tx(db, [STORE_GUIDES], 'readonly');
  const all = await reqAsPromise(transaction.objectStore(STORE_GUIDES).getAll());
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function closeDb() {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  dbPromise = null;
}

async function resetDbForTests() {
  await closeDb();
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

const __api = {
  createGuide,
  getGuide,
  addStep,
  getStepsForGuide,
  listGuides,
  closeDb,
  resetDbForTests,
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = __api;
}
if (typeof self !== 'undefined') {
  self.LocalGuide = Object.assign(self.LocalGuide || {}, __api);
}
