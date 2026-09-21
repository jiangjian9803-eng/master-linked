(() => {
  const originalStart = document.querySelector('#recordStartBtn');
  const originalStop = document.querySelector('#recordStopBtn');
  const panel = document.querySelector('.meeting-panel');
  const transcriptBox = document.querySelector('#meetingTranscript');
  if (!originalStart || !originalStop || !panel || !transcriptBox) return;

  // Replace the two buttons so the earlier experimental handlers cannot run.
  const startButton = originalStart.cloneNode(true);
  const stopButton = originalStop.cloneNode(true);
  originalStart.replaceWith(startButton);
  originalStop.replaceWith(stopButton);

  const controls = document.createElement('section');
  controls.className = 'meeting-reliable-controls';
  controls.innerHTML = `
    <div class="meeting-control-grid">
      <label>转写语言
        <select id="meetingRecognitionLanguage">
          <option value="zh-CN">普通话</option>
          <option value="en-CA">English (Canada)</option>
          <option value="en-US">English (US)</option>
        </select>
      </label>
      <div><span>录音时间</span><strong id="meetingElapsed">00:00:00</strong></div>
      <div><span>本地保存</span><strong id="meetingSaveHealth">等待开始</strong></div>
      <div><span>实时转写</span><strong id="meetingSpeechHealth">等待开始</strong></div>
    </div>
    <div id="meetingRecovery" class="meeting-recovery hidden">
      <strong>发现上次未正常结束的录音</strong>
      <span id="meetingRecoveryDetail"></span>
      <div class="actions">
        <button id="meetingRecoverAudio" type="button" class="secondary">恢复并下载录音</button>
        <button id="meetingDiscardRecovery" type="button" class="secondary">删除恢复数据</button>
      </div>
    </div>
    <p class="meeting-reliability-note">录音每 5 秒分段保存到本机。实时文字仅作预览；完整录音是正式原始记录。</p>`;
  panel.insertBefore(controls, startButton.parentElement);

  const status = document.querySelector('#recordStatus');
  const download = document.querySelector('#downloadRecording');
  const waveform = document.querySelector('#meetingWaveform');
  const language = document.querySelector('#meetingRecognitionLanguage');
  const elapsed = document.querySelector('#meetingElapsed');
  const saveHealth = document.querySelector('#meetingSaveHealth');
  const speechHealth = document.querySelector('#meetingSpeechHealth');
  const recovery = document.querySelector('#meetingRecovery');
  const recoveryDetail = document.querySelector('#meetingRecoveryDetail');

  const DB_NAME = 'master-linked-recordings';
  const DB_VERSION = 1;
  const LAST_SESSION_KEY = 'master-linked-active-recording';
  const TRANSCRIPT_DRAFT_KEY = 'master-linked-meeting-transcript-draft';
  let dbPromise;
  let recorder = null;
  let stream = null;
  let sessionId = '';
  let sequence = 0;
  let chunks = [];
  let recognition = null;
  let recognitionWanted = false;
  let recognitionRetry = 0;
  let recognitionTimer = null;
  let recordingStartedAt = 0;
  let elapsedTimer = null;
  let wakeLock = null;
  let audioContext = null;
  let analyser = null;
  let animationFrame = 0;
  let finalTranscript = '';
  let lastFinalLine = '';

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('chunks')) {
          const store = db.createObjectStore('chunks', { keyPath: 'id' });
          store.createIndex('sessionId', 'sessionId');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function put(storeName, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getSession(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction('sessions').objectStore('sessions').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getChunks(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction('chunks').objectStore('chunks').index('sessionId').getAll(id);
      request.onsuccess = () => resolve(request.result.sort((a, b) => a.sequence - b.sequence));
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteSession(id) {
    const db = await openDb();
    const rows = await getChunks(id);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['sessions', 'chunks'], 'readwrite');
      tx.objectStore('sessions').delete(id);
      rows.forEach(row => tx.objectStore('chunks').delete(row.id));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  function formatTime(milliseconds) {
    const total = Math.max(0, Math.floor(milliseconds / 1000));
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function chooseMimeType() {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    return candidates.find(type => MediaRecorder.isTypeSupported?.(type)) || '';
  }

  function setDownload(blob, startedAt = Date.now()) {
    if (download.dataset.objectUrl) URL.revokeObjectURL(download.dataset.objectUrl);
    const url = URL.createObjectURL(blob);
    download.href = url;
    download.dataset.objectUrl = url;
    download.download = `meeting-${new Date(startedAt).toISOString().replace(/[:.]/g, '-')}.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`;
    download.classList.remove('hidden');
  }

  async function saveSessionPatch(patch) {
    if (!sessionId) return;
    const existing = await getSession(sessionId) || { id: sessionId };
    await put('sessions', { ...existing, ...patch, updatedAt: Date.now() });
  }

  function saveTranscriptDraft() {
    localStorage.setItem(TRANSCRIPT_DRAFT_KEY, transcriptBox.value);
    saveSessionPatch({ transcript: transcriptBox.value }).catch(() => {});
  }

  function appendFinalTranscript(text) {
    const clean = text.trim();
    if (!clean || clean === lastFinalLine) return;
    lastFinalLine = clean;
    finalTranscript += `${clean}\n`;
    transcriptBox.value = finalTranscript;
    saveTranscriptDraft();
  }

  function scheduleRecognitionRestart() {
    if (!recognitionWanted || recorder?.state !== 'recording') return;
    clearTimeout(recognitionTimer);
    const delay = Math.min(8000, 400 * (2 ** recognitionRetry));
    recognitionRetry = Math.min(recognitionRetry + 1, 5);
    speechHealth.textContent = `正在重连（${Math.ceil(delay / 1000)} 秒）`;
    speechHealth.dataset.state = 'warning';
    recognitionTimer = setTimeout(startRecognition, delay);
  }

  function startRecognition() {
    if (!recognitionWanted || recorder?.state !== 'recording') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speechHealth.textContent = '浏览器不支持';
      speechHealth.dataset.state = 'error';
      return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = language.value;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      recognitionRetry = 0;
      speechHealth.textContent = '识别正常';
      speechHealth.dataset.state = 'ok';
    };
    recognition.onresult = event => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) appendFinalTranscript(text);
        else interim += text;
      }
      transcriptBox.value = finalTranscript + (interim ? `\n${interim}` : '');
    };
    recognition.onerror = event => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        recognitionWanted = false;
        speechHealth.textContent = '权限被拒绝';
        speechHealth.dataset.state = 'error';
      } else if (event.error !== 'aborted') {
        speechHealth.textContent = `识别中断：${event.error}`;
        speechHealth.dataset.state = 'warning';
      }
    };
    recognition.onend = scheduleRecognitionRestart;
    try { recognition.start(); } catch { scheduleRecognitionRestart(); }
  }

  function startWaveform() {
    if (!waveform || !stream) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    const context = waveform.getContext('2d');
    const data = new Uint8Array(analyser.fftSize);
    const draw = () => {
      analyser.getByteTimeDomainData(data);
      context.clearRect(0, 0, waveform.width, waveform.height);
      context.strokeStyle = '#0a66c2';
      context.lineWidth = 3;
      context.beginPath();
      data.forEach((value, index) => {
        const x = index / (data.length - 1) * waveform.width;
        const y = waveform.height / 2 + (value - 128) * .32;
        index ? context.lineTo(x, y) : context.moveTo(x, y);
      });
      context.stroke();
      animationFrame = requestAnimationFrame(draw);
    };
    draw();
  }

  async function requestWakeLock() {
    try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { wakeLock = null; }
  }

  async function beginRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      alert('当前浏览器不支持可靠录音，请使用最新版 Chrome 并通过 HTTPS 打开。');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const mimeType = chooseMimeType();
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      sessionId = crypto.randomUUID();
      sequence = 0;
      chunks = [];
      finalTranscript = transcriptBox.value.trim() ? `${transcriptBox.value.trim()}\n` : '';
      lastFinalLine = '';
      recordingStartedAt = Date.now();
      localStorage.setItem(LAST_SESSION_KEY, sessionId);
      await put('sessions', { id: sessionId, active: true, startedAt: recordingStartedAt, mimeType: recorder.mimeType, transcript: finalTranscript, updatedAt: Date.now() });
      recorder.ondataavailable = async event => {
        if (!event.data?.size) return;
        const currentSequence = sequence++;
        chunks.push(event.data);
        try {
          await put('chunks', { id: `${sessionId}:${String(currentSequence).padStart(8, '0')}`, sessionId, sequence: currentSequence, blob: event.data, savedAt: Date.now() });
          saveHealth.textContent = `${chunks.length} 段已保存`;
          saveHealth.dataset.state = 'ok';
          await saveSessionPatch({ chunkCount: chunks.length, duration: Date.now() - recordingStartedAt });
        } catch {
          saveHealth.textContent = '保存失败，请停止并下载';
          saveHealth.dataset.state = 'error';
        }
      };
      recorder.onstop = async () => {
        recognitionWanted = false;
        clearTimeout(recognitionTimer);
        try { recognition?.stop(); } catch {}
        recognition = null;
        stream?.getTracks().forEach(track => track.stop());
        stream = null;
        cancelAnimationFrame(animationFrame);
        await audioContext?.close().catch(() => {});
        audioContext = null;
        clearInterval(elapsedTimer);
        await new Promise(resolve => setTimeout(resolve, 150));
        const saved = await getChunks(sessionId).catch(() => []);
        const blobs = saved.length ? saved.map(item => item.blob) : chunks;
        const blob = new Blob(blobs, { type: recorder.mimeType || 'audio/webm' });
        setDownload(blob, recordingStartedAt);
        await saveSessionPatch({ active: false, stoppedAt: Date.now(), transcript: transcriptBox.value });
        localStorage.removeItem(LAST_SESSION_KEY);
        wakeLock?.release().catch(() => {});
        wakeLock = null;
        startButton.disabled = false;
        stopButton.disabled = true;
        saveHealth.textContent = `${blobs.length} 段完整保存`;
        speechHealth.textContent = '已停止';
        status.textContent = '录音已安全保存。请立即下载录音；实时文字仅供预览和校对。';
      };
      recorder.start(5000);
      startWaveform();
      requestWakeLock();
      recognitionWanted = true;
      startRecognition();
      elapsed.textContent = '00:00:00';
      elapsedTimer = setInterval(() => { elapsed.textContent = formatTime(Date.now() - recordingStartedAt); }, 1000);
      startButton.disabled = true;
      stopButton.disabled = false;
      download.classList.add('hidden');
      saveHealth.textContent = '等待首段保存';
      saveHealth.dataset.state = 'warning';
      status.textContent = '正在可靠录音：每 5 秒保存一段到本机。请保持此页面打开。';
    } catch (error) {
      const message = error?.name === 'NotAllowedError' ? '麦克风权限被拒绝，请在浏览器和系统设置中允许麦克风。' : '录音启动失败，请确认使用 HTTPS、最新版 Chrome 和可用麦克风。';
      status.textContent = message;
      alert(message);
    }
  }

  function stopRecording() {
    if (recorder?.state === 'recording') {
      status.textContent = '正在完成最后一段并生成录音文件，请稍候…';
      recorder.stop();
      stopButton.disabled = true;
    }
  }

  async function showRecoveryIfNeeded() {
    const id = localStorage.getItem(LAST_SESSION_KEY);
    if (!id) return;
    const session = await getSession(id).catch(() => null);
    const saved = session ? await getChunks(id).catch(() => []) : [];
    if (!session || !saved.length) {
      localStorage.removeItem(LAST_SESSION_KEY);
      return;
    }
    recovery.classList.remove('hidden');
    recoveryDetail.textContent = `已找回 ${saved.length} 个本地片段，开始时间 ${new Date(session.startedAt).toLocaleString()}。`;
    document.querySelector('#meetingRecoverAudio').onclick = () => {
      const blob = new Blob(saved.map(item => item.blob), { type: session.mimeType || 'audio/webm' });
      setDownload(blob, session.startedAt);
      if (session.transcript && !transcriptBox.value.trim()) transcriptBox.value = session.transcript;
      status.textContent = '已恢复录音，请点击“下载录音”保存文件。';
    };
    document.querySelector('#meetingDiscardRecovery').onclick = async () => {
      await deleteSession(id);
      localStorage.removeItem(LAST_SESSION_KEY);
      recovery.classList.add('hidden');
    };
  }

  startButton.addEventListener('click', beginRecording);
  stopButton.addEventListener('click', stopRecording);
  transcriptBox.addEventListener('input', () => localStorage.setItem(TRANSCRIPT_DRAFT_KEY, transcriptBox.value));
  const draft = localStorage.getItem(TRANSCRIPT_DRAFT_KEY);
  if (draft && !transcriptBox.value) transcriptBox.value = draft;
  language.value = localStorage.getItem('master-linked-meeting-language') || 'zh-CN';
  language.addEventListener('change', () => localStorage.setItem('master-linked-meeting-language', language.value));
  window.addEventListener('beforeunload', event => {
    if (recorder?.state !== 'recording') return;
    event.preventDefault();
    event.returnValue = '';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && recorder?.state === 'recording' && !wakeLock) requestWakeLock();
  });
  showRecoveryIfNeeded();
})();
