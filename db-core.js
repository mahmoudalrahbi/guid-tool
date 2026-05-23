const DB_NAME = "localguide";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("guides")) {
        db.createObjectStore("guides", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("steps")) {
        const store = db.createObjectStore("steps", { keyPath: "id" });
        store.createIndex("guideId", "guideId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveGuide(guide) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("guides", "readwrite");
    tx.objectStore("guides").put(guide);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getGuide(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("guides", "readonly");
    const req = tx.objectStore("guides").get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveStep(step) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("steps", "readwrite");
    tx.objectStore("steps").put(step);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getStepsForGuide(guideId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("steps", "readonly");
    const index = tx.objectStore("steps").index("guideId");
    const req = index.getAll(guideId);
    req.onsuccess = () => resolve(req.result.sort((a, b) => a.order - b.order));
    req.onerror = () => reject(req.error);
  });
}

async function deleteStep(stepId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("steps", "readwrite");
    tx.objectStore("steps").delete(stepId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllGuides() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("guides", "readonly");
    const req = tx.objectStore("guides").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteGuide(guideId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["guides", "steps"], "readwrite");
    tx.objectStore("guides").delete(guideId);
    
    // Also delete all steps for this guide
    const stepsStore = tx.objectStore("steps");
    const index = stepsStore.index("guideId");
    const req = index.getAllKeys(guideId);
    req.onsuccess = () => {
      req.result.forEach(stepId => {
        stepsStore.delete(stepId);
      });
    };
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    openDB, saveGuide, getGuide, saveStep, getStepsForGuide, deleteStep, getAllGuides, deleteGuide
  };
}
