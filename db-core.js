function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CONFIG.DB.NAME, CONFIG.DB.VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      const oldVersion = e.oldVersion;
      
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(CONFIG.STORE_GUIDES)) {
          db.createObjectStore(CONFIG.STORE_GUIDES, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(CONFIG.STORE_STEPS)) {
          const store = db.createObjectStore(CONFIG.STORE_STEPS, { keyPath: "id" });
          store.createIndex("guideId", "guideId", { unique: false });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveGuide(guide) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONFIG.STORE_GUIDES, "readwrite");
    tx.objectStore(CONFIG.STORE_GUIDES).put(guide);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getGuide(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONFIG.STORE_GUIDES, "readonly");
    const req = tx.objectStore(CONFIG.STORE_GUIDES).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveStep(step) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONFIG.STORE_STEPS, "readwrite");
    tx.objectStore(CONFIG.STORE_STEPS).put(step);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getStepsForGuide(guideId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONFIG.STORE_STEPS, "readonly");
    const index = tx.objectStore(CONFIG.STORE_STEPS).index("guideId");
    const req = index.getAll(guideId);
    req.onsuccess = () => resolve(req.result.sort((a, b) => a.order - b.order));
    req.onerror = () => reject(req.error);
  });
}

async function deleteStep(stepId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONFIG.STORE_STEPS, "readwrite");
    tx.objectStore(CONFIG.STORE_STEPS).delete(stepId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllGuides() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONFIG.STORE_GUIDES, "readonly");
    const req = tx.objectStore(CONFIG.STORE_GUIDES).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteGuide(guideId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([CONFIG.STORE_GUIDES, CONFIG.STORE_STEPS], "readwrite");
    tx.objectStore(CONFIG.STORE_GUIDES).delete(guideId);
    
    // Also delete all steps for this guide
    const stepsStore = tx.objectStore(CONFIG.STORE_STEPS);
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

async function getAllGuidesWithStepCounts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([CONFIG.STORE_GUIDES, CONFIG.STORE_STEPS], "readonly");
    
    const guidesReq = tx.objectStore(CONFIG.STORE_GUIDES).getAll();
    guidesReq.onsuccess = () => {
      const guides = guidesReq.result;
      
      const stepsReq = tx.objectStore(CONFIG.STORE_STEPS).getAll();
      stepsReq.onsuccess = () => {
        const steps = stepsReq.result;
        const stepCounts = {};
        for (let i = 0; i < steps.length; i++) {
          const gId = steps[i].guideId;
          stepCounts[gId] = (stepCounts[gId] || 0) + 1;
        }
        
        const results = guides.map(g => ({
          id: g.id,
          title: g.title,
          lastActivityAt: g.updatedAt ?? g.createdAt ?? 0,
          stepCount: stepCounts[g.id] || 0
        }));
        
        results.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
        resolve(results);
      };
      stepsReq.onerror = () => reject(stepsReq.error);
    };
    guidesReq.onerror = () => reject(guidesReq.error);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    openDB, saveGuide, getGuide, saveStep, getStepsForGuide, deleteStep, getAllGuides, deleteGuide, getAllGuidesWithStepCounts
  };
}
