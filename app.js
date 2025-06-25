// EMG Test Analysis Dashboard Application
class EMGDashboard {
    constructor() {
        this.currentView = 'dashboard';
        this.sessions = [];
        this.scripts = [];
        this.filteredSessions = [];
        this.selectedMuscle = null;
        this.currentSession = null;
        this.charts = {};
        this.testInProgress = false;
        this.liveChart = null;
        this.currentScript = null;
        this.pyodide = null;
        
        // BLE handles
        this.bluetoothDevice = null;
        this.gattServer = null;
        this.emgCharacteristic = null;
        this.emgBuffer = [];
        this.testStartTime = null;
        this.currentTestData = {};
        
        // UUIDs for BLE EMG device
        this.EMG_SERVICE_UUID = 'df1a0863-f02f-49ba-bf55-3b56c6bcb398';
        this.EMG_CHARACTERISTIC_UUID = '8c24159c-66a0-4340-8b55-465047ce37ce';
        this.EMG_COMMAND_CHARACTERISTIC_UUID = this.EMG_CHARACTERISTIC_UUID;
        
        // Available muscle groups and electrode types
        this.muscleGroups = ["Bicep", "Tricep", "Hamstring", "Quadriceps", "Deltoid", "Pectoralis Major", "Latissimus Dorsi", "Gastrocnemius"];
        this.electrodeTypes = ["Gel", "Dry", "Microneedle", "Surface Array"];
        
        // Default Python scripts (simulation-free)
        this.defaultScripts = [
            {
                name: 'emg_basic_acquisition.py',
                size: '3.2 KB',
                content: `import pyodide
from js import EMGBridge
import numpy as np

# EMG Data Acquisition Script
class EMGAcquisition:
    def __init__(self):
        self.sampling_rate = 1000  # Hz
        self.is_recording = False
        self.data_buffer = []
    
    def connect_device(self, device_id):
        print("Connecting to device:", device_id)
        return EMGBridge.connect_device(device_id)
    
    def start_recording(self):
        print("Starting EMG recording...")
        self.is_recording = True
        self.data_buffer = []
        EMGBridge.start_stream(self.on_data_received)
    
    def on_data_received(self, data):
        if self.is_recording:
            self.data_buffer.extend(data)
    
    def stop_recording(self):
        print("Stopping EMG recording...")
        self.is_recording = False
        EMGBridge.stop_stream()
    
    def analyze_data(self):
        if len(self.data_buffer) == 0:
            print("No data to analyze")
            return {}
        
        data_array = np.array(self.data_buffer)
        
        # Calculate basic metrics
        rms = np.sqrt(np.mean(np.square(data_array)))
        mav = np.mean(np.abs(data_array))
        max_amp = np.max(np.abs(data_array))
        
        # Calculate SNR
        signal = np.mean(data_array)
        noise = np.std(data_array)
        snr = 20 * np.log10(abs(signal/noise)) if noise > 0 else 0
        
        results = {
            "rms": float(rms),
            "mav": float(mav),
            "maxAmplitude": float(max_amp),
            "snr": float(snr),
            "rawData": self.data_buffer
        }
        
        return results

# Usage
emg = EMGAcquisition()`
            },
            {
                name: 'dynamic_contraction_test.py',
                size: '4.5 KB',
                content: `import pyodide
from js import EMGBridge, displayInstructions, updateProgress
import numpy as np

# Dynamic Contraction Test Protocol
class DynamicContractionTest:
    def __init__(self):
        self.emg_data = {}
        self.sampling_rate = 1000  # Hz
        self.is_running = False
    
    def connect_device(self, device_id):
        displayInstructions("Connecting to device...")
        success = EMGBridge.connect_device(device_id)
        if success:
            displayInstructions("Device connected successfully")
            return True
        else:
            displayInstructions("Failed to connect to device")
            return False
    
    def run_test(self):
        """Run the complete dynamic contraction protocol"""
        self.is_running = True
        self.emg_data = {
            "mvc1": {},
            "mvc2": {},
            "submaximal": {},
            "walking": {}
        }
        
        # First MVC
        if not self._run_mvc_phase("mvc1", "Perform maximum voluntary contraction for 5 seconds"):
            return False
        
        # Rest period
        if not self._run_rest_phase("Rest for 30 seconds before next phase"):
            return False
        
        # Second MVC
        if not self._run_mvc_phase("mvc2", "Perform second maximum voluntary contraction for 5 seconds"):
            return False
        
        # Rest period
        if not self._run_rest_phase("Rest for 30 seconds before submaximal test"):
            return False
        
        # 50% Sub-maximal contraction
        if not self._run_submaximal_phase("submaximal", "Perform 50% of maximum contraction for 10 seconds"):
            return False
        
        # Walking test
        if not self._run_walking_phase("walking", "Walk at a comfortable pace for 15 seconds"):
            return False
        
        displayInstructions("Test complete! Processing results...")
        self._process_results()
        return True
    
    def _run_mvc_phase(self, phase_id, instruction):
        displayInstructions(instruction)
        updateProgress(0)
        
        # Start data collection
        EMGBridge.start_stream()
        
        # Wait for data from device (event-driven, not timer-based)
        phase_data = EMGBridge.collect_phase_data(phase_id, 5000)  # 5 seconds
        
        if not self.is_running:
            EMGBridge.stop_stream()
            return False
        
        self.emg_data[phase_id] = phase_data
        EMGBridge.stop_stream()
        updateProgress(100)
        return True
    
    def _run_rest_phase(self, instruction):
        displayInstructions(instruction)
        # Use device feedback to determine when rest is complete
        return EMGBridge.wait_for_rest_completion()
    
    def _run_submaximal_phase(self, phase_id, instruction):
        displayInstructions(instruction)
        updateProgress(0)
        
        EMGBridge.start_stream()
        phase_data = EMGBridge.collect_phase_data(phase_id, 10000)  # 10 seconds
        
        if not self.is_running:
            EMGBridge.stop_stream()
            return False
        
        self.emg_data[phase_id] = phase_data
        EMGBridge.stop_stream()
        updateProgress(100)
        return True
    
    def _run_walking_phase(self, phase_id, instruction):
        displayInstructions(instruction)
        updateProgress(0)
        
        EMGBridge.start_stream()
        phase_data = EMGBridge.collect_phase_data(phase_id, 15000)  # 15 seconds
        
        if not self.is_running:
            EMGBridge.stop_stream()
            return False
        
        self.emg_data[phase_id] = phase_data
        EMGBridge.stop_stream()
        updateProgress(100)
        return True
    
    def _process_results(self):
        for phase_id, phase_data in self.emg_data.items():
            if "rawData" in phase_data and phase_data["rawData"]:
                data_array = np.array(phase_data["rawData"])
                
                # Calculate metrics
                phase_data["rms"] = float(np.sqrt(np.mean(np.square(data_array))))
                phase_data["mav"] = float(np.mean(np.abs(data_array)))
                phase_data["maxAmplitude"] = float(np.max(np.abs(data_array)))
                
                # Calculate SNR
                signal = np.mean(data_array)
                noise = np.std(data_array)
                phase_data["snr"] = float(20 * np.log10(abs(signal/noise)) if noise > 0 else 0)
                
                phase_data["duration"] = len(data_array)
    
    def stop_test(self):
        self.is_running = False
        EMGBridge.stop_stream()
        displayInstructions("Test stopped")
    
    def get_results(self):
        return self.emg_data

# Usage
test = DynamicContractionTest()`
            }
        ];
        
        this.init();
    }

    async init() {
        await this.initializePyodide();
        this.loadStoredSessions();
        this.setupEventListeners();
        this.populateFormOptions();
        this.renderDashboard();
        this.updateBodyMap();
        this.populateScriptsList();
    }

    async initializePyodide() {
        try {
            this.pyodide = await loadPyodide();
            await this.pyodide.loadPackage(["numpy", "micropip"]);
            
            // Set up the EMGBridge object for Python-JavaScript communication
            this.pyodide.globals.set("EMGBridge", this.createEMGBridge());
            this.pyodide.globals.set("displayInstructions", this.displayInstructions.bind(this));
            this.pyodide.globals.set("updateProgress", this.updateProgress.bind(this));
            
            console.log("Pyodide initialized successfully");
        } catch (error) {
            console.error("Failed to initialize Pyodide:", error);
            this.showToast("Failed to initialize Python environment", "error");
        }
    }

    createEMGBridge() {
        return {
            connect_device: (deviceId) => {
                return this.bluetoothDevice !== null;
            },
            start_stream: () => {
                if (this.emgCharacteristic) {
                    this.emgCharacteristic.startNotifications();
                    return true;
                }
                return false;
            },
            stop_stream: () => {
                if (this.emgCharacteristic) {
                    this.emgCharacteristic.stopNotifications();
                    return true;
                }
                return false;
            },
            collect_phase_data: (phaseId, duration) => {
                return new Promise((resolve) => {
                    const startTime = Date.now();
                    const phaseData = [];
                    
                    const collectData = () => {
                        const elapsed = Date.now() - startTime;
                        if (elapsed >= duration || !this.testInProgress) {
                            resolve({
                                rawData: [...phaseData],
                                duration: elapsed,
                                phase: phaseId
                            });
                            return;
                        }
                        
                        // Collect current buffer data
                        if (this.emgBuffer.length > 0) {
                            phaseData.push(...this.emgBuffer);
                            this.emgBuffer = [];
                        }
                        
                        // Update progress
                        const progress = (elapsed / duration) * 100;
                        this.updateProgress(progress);
                        
                        setTimeout(collectData, 100);
                    };
                    
                    collectData();
                });
            },
            wait_for_rest_completion: () => {
                // In a real implementation, this would monitor EMG signals
                // to determine when the muscle is sufficiently relaxed
                return new Promise((resolve) => {
                    setTimeout(() => resolve(true), 5000); // Simplified 5-second rest
                });
            },
            get_current_data: () => {
                const data = [...this.emgBuffer];
                this.emgBuffer = [];
                return data;
            }
        };
    }

    displayInstructions(instruction) {
        const instructionElement = document.getElementById('current-instruction');
        if (instructionElement) {
            instructionElement.textContent = instruction;
        }
        console.log("Instruction:", instruction);
    }

    updateProgress(percentage) {
        const progressFill = document.getElementById('test-progress-fill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        const statusElement = document.getElementById('test-status');
        if (statusElement) {
            statusElement.textContent = `${Math.round(percentage)}% Complete`;
        }
    }

    loadStoredSessions() {
        try {
            const stored = localStorage.getItem('emg-sessions');
            this.sessions = stored ? JSON.parse(stored) : [];
            this.filteredSessions = [...this.sessions];
        } catch (error) {
            console.error("Failed to load stored sessions:", error);
            this.sessions = [];
            this.filteredSessions = [];
        }
    }

    saveSession(sessionData) {
        try {
            this.sessions.push(sessionData);
            localStorage.setItem('emg-sessions', JSON.stringify(this.sessions));
            this.filteredSessions = [...this.sessions];
        } catch (error) {
            console.error("Failed to save session:", error);
            this.showToast("Failed to save session", "error");
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.navigateTo(view);
            });
        });

        // Dashboard search and filters
        document.getElementById('search-sessions')?.addEventListener('input', () => {
            this.filterSessions();
        });

        document.getElementById('filter-muscle')?.addEventListener('change', () => {
            this.filterSessions();
        });

        document.getElementById('filter-electrode')?.addEventListener('change', () => {
            this.filterSessions();
        });

        // New test form
        document.getElementById('new-test-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNewTestSubmit();
        });

        document.getElementById('script-file')?.addEventListener('change', (e) => {
            this.handleScriptUpload(e.target.files[0]);
        });

        document.getElementById('script-select')?.addEventListener('change', () => {
            this.previewSelectedScript();
        });

        // BLE device management
        document.getElementById('scan-devices')?.addEventListener('click', () => {
            this.scanForDevices();
        });

        document.getElementById('connect-device')?.addEventListener('click', () => {
            this.connectDevice();
        });

        // Test controls
        document.getElementById('start-test')?.addEventListener('click', () => {
            this.startTest();
        });

        document.getElementById('pause-test')?.addEventListener('click', () => {
            this.pauseTest();
        });

        document.getElementById('stop-test')?.addEventListener('click', () => {
            this.stopTest();
        });

        // Session detail navigation
        document.getElementById('back-to-dashboard')?.addEventListener('click', () => {
            this.navigateTo('dashboard');
        });

        document.getElementById('export-session')?.addEventListener('click', () => {
            this.exportSession();
        });

        document.getElementById('delete-session')?.addEventListener('click', () => {
            this.showDeleteConfirmation();
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Body map interactions
        document.querySelectorAll('.muscle-region').forEach(region => {
            region.addEventListener('click', (e) => {
                const muscle = e.target.dataset.muscle;
                this.selectMuscle(muscle);
            });
        });

        // Theme toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Modal controls
        document.getElementById('modal-close')?.addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modal-cancel')?.addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modal-confirm')?.addEventListener('click', () => {
            this.handleModalConfirm();
        });

        // Export all
        document.getElementById('export-all')?.addEventListener('click', () => {
            this.exportAllSessions();
        });

        // Scripts management
        document.getElementById('script-manager-file')?.addEventListener('change', (e) => {
            this.handleScriptManagerUpload(e.target.files);
        });

        document.getElementById('close-editor')?.addEventListener('click', () => {
            document.getElementById('script-editor').style.display = 'none';
        });

        document.getElementById('save-script')?.addEventListener('click', () => {
            this.saveCurrentScript();
        });

        document.getElementById('test-script')?.addEventListener('click', () => {
            this.testCurrentScript();
        });
    }

    populateFormOptions() {
        const muscleSelect = document.getElementById('muscle-group');
        const electrodeSelect = document.getElementById('electrode-type');
        const filterMuscleSelect = document.getElementById('filter-muscle');
        const filterElectrodeSelect = document.getElementById('filter-electrode');
        const scriptSelect = document.getElementById('script-select');

        // Clear existing options except first default option
        [muscleSelect, filterMuscleSelect].forEach(select => {
            if (select) {
                while (select.children.length > 1) {
                    select.removeChild(select.lastChild);
                }
            }
        });

        [electrodeSelect, filterElectrodeSelect].forEach(select => {
            if (select) {
                while (select.children.length > 1) {
                    select.removeChild(select.lastChild);
                }
            }
        });

        // Populate muscle groups
        this.muscleGroups.forEach(muscle => {
            const opt = document.createElement('option');
            opt.value = muscle;
            opt.textContent = muscle;
            
            if (muscleSelect) muscleSelect.appendChild(opt.cloneNode(true));
            if (filterMuscleSelect) filterMuscleSelect.appendChild(opt.cloneNode(true));
        });

        // Populate electrode types
        this.electrodeTypes.forEach(type => {
            const opt = document.createElement('option');
            opt.value = type;
            opt.textContent = type;
            
            if (electrodeSelect) electrodeSelect.appendChild(opt.cloneNode(true));
            if (filterElectrodeSelect) filterElectrodeSelect.appendChild(opt.cloneNode(true));
        });

        // Populate scripts
        if (scriptSelect) {
            scriptSelect.innerHTML = '<option value="">-- choose script --</option>';
            [...this.defaultScripts, ...this.scripts].forEach((script, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = script.name;
                scriptSelect.appendChild(opt);
            });
        }

        this.previewSelectedScript();
    }

    previewSelectedScript() {
        const scriptSelect = document.getElementById('script-select');
        const scriptContent = document.getElementById('script-content');
        
        if (!scriptSelect || !scriptContent) return;
        
        const selectedIndex = scriptSelect.value;
        if (selectedIndex === "") {
            scriptContent.textContent = "Select a script to preview...";
            return;
        }
        
        const allScripts = [...this.defaultScripts, ...this.scripts];
        const selectedScript = allScripts[parseInt(selectedIndex)];
        
        if (selectedScript) {
            this.currentScript = selectedScript;
            scriptContent.textContent = selectedScript.content;
        }
    }

    navigateTo(view) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // Update views
        document.querySelectorAll('.view').forEach(viewEl => {
            viewEl.classList.toggle('active', viewEl.id === `${view}-view`);
        });

        // Update page title and breadcrumb
        const titles = {
            'dashboard': 'Dashboard',
            'new-test': 'New Test',
            'comparison': 'Compare Tests',
            'body-map': 'Body Map',
            'scripts': 'Python Scripts',
            'session-detail': 'Session Details'
        };

        const titleElement = document.getElementById('page-title');
        const breadcrumbElement = document.getElementById('breadcrumb');
        
        if (titleElement) titleElement.textContent = titles[view] || 'Dashboard';
        if (breadcrumbElement) breadcrumbElement.innerHTML = `Home > ${titles[view] || 'Dashboard'}`;

        this.currentView = view;

        // View-specific initialization
        if (view === 'comparison') {
            this.renderComparisonView();
        } else if (view === 'body-map') {
            this.updateBodyMap();
        } else if (view === 'scripts') {
            this.populateScriptsList();
        }
    }

    filterSessions() {
        const searchTerm = document.getElementById('search-sessions')?.value.toLowerCase() || '';
        const muscleFilter = document.getElementById('filter-muscle')?.value || '';
        const electrodeFilter = document.getElementById('filter-electrode')?.value || '';

        this.filteredSessions = this.sessions.filter(session => {
            const matchesSearch = !searchTerm || 
                session.subjectId?.toLowerCase().includes(searchTerm) ||
                session.muscleGroup?.toLowerCase().includes(searchTerm);
            const matchesMuscle = !muscleFilter || session.muscleGroup === muscleFilter;
            const matchesElectrode = !electrodeFilter || session.electrodeType === electrodeFilter;

            return matchesSearch && matchesMuscle && matchesElectrode;
        });

        this.renderDashboard();
    }

    renderDashboard() {
        const grid = document.getElementById('sessions-grid');
        if (!grid) return;

        grid.innerHTML = '';

        if (this.filteredSessions.length === 0) {
            grid.innerHTML = '<div class="text-center text-muted">No sessions found. Start by creating a new test session.</div>';
            return;
        }

        this.filteredSessions.forEach(session => {
            const card = this.createSessionCard(session);
            grid.appendChild(card);
        });
    }

    createSessionCard(session) {
        const card = document.createElement('div');
        card.className = 'session-card';
        card.addEventListener('click', () => this.viewSession(session));

        const date = new Date(session.timestamp).toLocaleDateString();
        const phaseCount = Object.keys(session.testPhases || {}).length;

        card.innerHTML = `
            <div class="session-card-header">
                <div class="session-id">${session.id}</div>
                <div class="session-date">${date}</div>
            </div>
            <div class="session-info">
                <div class="session-info-item">
                    <div class="session-info-label">Subject</div>
                    <div class="session-info-value">${session.subjectId}</div>
                </div>
                <div class="session-info-item">
                    <div class="session-info-label">Muscle Group</div>
                    <div class="session-info-value">${session.muscleGroup}</div>
                </div>
                <div class="session-info-item">
                    <div class="session-info-label">Electrode Type</div>
                    <div class="session-info-value">${session.electrodeType}</div>
                </div>
                <div class="session-info-item">
                    <div class="session-info-label">Test Phases</div>
                    <div class="session-info-value">${phaseCount}</div>
                </div>
            </div>
        `;

        return card;
    }

    async scanForDevices() {
        try {
            this.showToast("Scanning for BLE devices...", "info");
            
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [this.EMG_SERVICE_UUID] }],
                optionalServices: [this.EMG_SERVICE_UUID]
            });

            const deviceList = document.getElementById('device-list');
            if (deviceList) {
                deviceList.innerHTML = `<option value="${device.id}">${device.name || 'EMG Device'}</option>`;
                document.getElementById('connect-device').disabled = false;
            }

            this.bluetoothDevice = device;
            this.showToast("Device found successfully", "success");
        } catch (error) {
            console.error("Device scan failed:", error);
            this.showToast("Failed to scan for devices", "error");
        }
    }

    async connectDevice() {
        if (!this.bluetoothDevice) {
            this.showToast("No device selected", "error");
            return;
        }

        try {
            this.showToast("Connecting to device...", "info");
            
            this.gattServer = await this.bluetoothDevice.gatt.connect();
            const service = await this.gattServer.getPrimaryService(this.EMG_SERVICE_UUID);
            this.emgCharacteristic = await service.getCharacteristic(this.EMG_CHARACTERISTIC_UUID);

            // Set up notification handler
            await this.emgCharacteristic.startNotifications();
            this.emgCharacteristic.addEventListener('characteristicvaluechanged', this.handleNotifications.bind(this));

            document.getElementById('start-test').disabled = false;
            this.showToast("Device connected successfully", "success");
        } catch (error) {
            console.error("Device connection failed:", error);
            this.showToast("Failed to connect to device", "error");
        }
    }

    handleNotifications(event) {
        const value = event.target.value;
        const data = new Float32Array(value.buffer);
        
        // Add incoming EMG data to buffer
        this.emgBuffer.push(...data);
        
        // Update live chart if test is in progress
        if (this.testInProgress && this.liveChart) {
            this.updateLiveChart(data);
        }
    }

    async startTest() {
        if (!this.emgCharacteristic) {
            this.showToast("Please connect to a device first", "error");
            return;
        }

        if (!this.currentScript) {
            this.showToast("Please select a test script first", "error");
            return;
        }

        try {
            this.testInProgress = true;
            this.testStartTime = Date.now();
            this.currentTestData = {};
            this.emgBuffer = [];

            // Show monitoring section
            document.querySelector('.test-monitoring').style.display = 'block';
            
            // Update button states
            document.getElementById('start-test').disabled = true;
            document.getElementById('pause-test').disabled = false;
            document.getElementById('stop-test').disabled = false;

            // Initialize live chart
            this.initializeLiveChart();

            // Execute Python script
            await this.executePythonScript(this.currentScript.content);

            this.showToast("Test started successfully", "success");
        } catch (error) {
            console.error("Failed to start test:", error);
            this.showToast("Failed to start test", "error");
            this.stopTest();
        }
    }

    async executePythonScript(scriptContent) {
        if (!this.pyodide) {
            throw new Error("Python environment not initialized");
        }

        try {
            // Execute the script in Pyodide
            this.pyodide.runPython(scriptContent);
            
            // Check if the script defines a test class and run it
            const result = this.pyodide.runPython(`
if 'DynamicContractionTest' in globals():
    test = DynamicContractionTest()
    test.run_test()
elif 'EMGAcquisition' in globals():
    emg = EMGAcquisition()
    emg.start_recording()
else:
    print("No recognized test class found in script")
            `);
            
            return result;
        } catch (error) {
            console.error("Python script execution failed:", error);
            throw error;
        }
    }

    pauseTest() {
        this.testInProgress = false;
        document.getElementById('start-test').disabled = false;
        document.getElementById('pause-test').disabled = true;
        this.displayInstructions("Test paused");
        this.showToast("Test paused", "warning");
    }

    stopTest() {
        this.testInProgress = false;
        
        // Stop BLE notifications
        if (this.emgCharacteristic) {
            this.emgCharacteristic.stopNotifications();
        }

        // Reset UI
        document.getElementById('start-test').disabled = false;
        document.getElementById('pause-test').disabled = true;
        document.getElementById('stop-test').disabled = true;
        document.querySelector('.test-monitoring').style.display = 'none';

        // Save session if we have data
        if (Object.keys(this.currentTestData).length > 0) {
            this.saveCurrentSession();
        }

        this.displayInstructions("Test stopped");
        this.showToast("Test stopped", "info");
    }

    saveCurrentSession() {
        const formData = new FormData(document.getElementById('new-test-form'));
        
        const sessionData = {
            id: `emg-${Date.now()}`,
            timestamp: new Date().toISOString(),
            subjectId: formData.get('subject-id'),
            muscleGroup: formData.get('muscle-group'),
            bodyPlacement: formData.get('body-placement'),
            electrodeType: formData.get('electrode-type'),
            electrodeConfig: formData.get('electrode-config'),
            testPhases: this.currentTestData
        };

        this.saveSession(sessionData);
        this.showToast("Session saved successfully", "success");
    }

    initializeLiveChart() {
        const canvas = document.getElementById('live-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (this.liveChart) {
            this.liveChart.destroy();
        }

        this.liveChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'EMG Signal',
                    data: [],
                    borderColor: 'rgb(33, 128, 141)',
                    backgroundColor: 'rgba(33, 128, 141, 0.1)',
                    tension: 0.1,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Time (ms)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Amplitude (mV)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    updateLiveChart(newData) {
        if (!this.liveChart || !newData.length) return;

        const currentTime = Date.now() - this.testStartTime;
        const dataset = this.liveChart.data.datasets[0];
        
        // Add new data points
        newData.forEach((value, index) => {
            const timePoint = currentTime + (index * (1000 / 1000)); // Assuming 1kHz sampling
            dataset.data.push({ x: timePoint, y: value });
        });

        // Keep only last 1000 points for performance
        if (dataset.data.length > 1000) {
            dataset.data = dataset.data.slice(-1000);
        }

        this.liveChart.update('none');
    }

    viewSession(session) {
        this.currentSession = session;
        this.renderSessionDetail();
        this.navigateTo('session-detail');
    }

    renderSessionDetail() {
        if (!this.currentSession) return;

        // Update session title
        const titleElement = document.getElementById('session-title');
        if (titleElement) {
            titleElement.textContent = `Session ${this.currentSession.id}`;
        }

        // Render metadata
        this.renderSessionMetadata();
        
        // Render charts
        this.renderSessionCharts();
    }

    renderSessionMetadata() {
        const container = document.getElementById('session-metadata');
        if (!container) return;

        const metadata = [
            { label: 'Session ID', value: this.currentSession.id },
            { label: 'Date', value: new Date(this.currentSession.timestamp).toLocaleString() },
            { label: 'Subject ID', value: this.currentSession.subjectId },
            { label: 'Muscle Group', value: this.currentSession.muscleGroup },
            { label: 'Body Placement', value: this.currentSession.bodyPlacement || 'Not specified' },
            { label: 'Electrode Type', value: this.currentSession.electrodeType },
            { label: 'Electrode Configuration', value: this.currentSession.electrodeConfig || 'Not specified' }
        ];

        container.innerHTML = metadata.map(item => `
            <div class="metadata-item">
                <div class="metadata-label">${item.label}</div>
                <div class="metadata-value">${item.value}</div>
            </div>
        `).join('');
    }

    renderSessionCharts() {
        this.renderRawSignalsChart();
        this.renderMetricsChart();
        this.renderPhasesTable();
    }

    renderRawSignalsChart() {
        const canvas = document.getElementById('raw-signals-chart');
        if (!canvas || !this.currentSession.testPhases) return;

        const ctx = canvas.getContext('2d');
        
        if (this.charts.rawSignals) {
            this.charts.rawSignals.destroy();
        }

        const datasets = Object.entries(this.currentSession.testPhases).map(([phaseId, phase], index) => {
            const colors = ['#21808D', '#A84B2F', '#21C05C', '#C0152F'];
            return {
                label: phase.name || phaseId,
                data: phase.rawData ? phase.rawData.map((value, i) => ({ x: i, y: value })) : [],
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '20',
                tension: 0.1,
                pointRadius: 0
            };
        });

        this.charts.rawSignals = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Sample' }
                    },
                    y: {
                        title: { display: true, text: 'Amplitude (mV)' }
                    }
                }
            }
        });
    }

    renderMetricsChart() {
        const canvas = document.getElementById('metrics-chart');
        if (!canvas || !this.currentSession.testPhases) return;

        const ctx = canvas.getContext('2d');
        
        if (this.charts.metrics) {
            this.charts.metrics.destroy();
        }

        const phases = Object.entries(this.currentSession.testPhases);
        const labels = phases.map(([_, phase]) => phase.name);
        
        this.charts.metrics = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'RMS',
                        data: phases.map(([_, phase]) => phase.rms || 0),
                        backgroundColor: 'rgba(33, 128, 141, 0.7)'
                    },
                    {
                        label: 'MAV',
                        data: phases.map(([_, phase]) => phase.mav || 0),
                        backgroundColor: 'rgba(168, 75, 47, 0.7)'
                    },
                    {
                        label: 'Max Amplitude',
                        data: phases.map(([_, phase]) => phase.maxAmplitude || 0),
                        backgroundColor: 'rgba(33, 192, 92, 0.7)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Amplitude' }
                    }
                }
            }
        });
    }

    renderPhasesTable() {
        const container = document.getElementById('phases-table');
        if (!container || !this.currentSession.testPhases) return;

        const phases = Object.entries(this.currentSession.testPhases);
        
        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Phase</th>
                        <th>Duration (ms)</th>
                        <th>RMS</th>
                        <th>MAV</th>
                        <th>SNR</th>
                        <th>Max Amplitude</th>
                    </tr>
                </thead>
                <tbody>
                    ${phases.map(([_, phase]) => `
                        <tr>
                            <td>${phase.name || 'Unknown'}</td>
                            <td>${phase.duration || 0}</td>
                            <td>${(phase.rms || 0).toFixed(3)}</td>
                            <td>${(phase.mav || 0).toFixed(3)}</td>
                            <td>${(phase.snr || 0).toFixed(1)}</td>
                            <td>${(phase.maxAmplitude || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML;
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    selectMuscle(muscle) {
        this.selectedMuscle = muscle;
        
        // Update body map visual state
        document.querySelectorAll('.muscle-region').forEach(region => {
            region.classList.toggle('selected', region.dataset.muscle === muscle);
        });

        // Filter dashboard by selected muscle
        if (this.currentView === 'dashboard') {
            const filterSelect = document.getElementById('filter-muscle');
            if (filterSelect) {
                filterSelect.value = muscle;
                this.filterSessions();
            }
        }

        this.showToast(`Selected muscle: ${muscle}`, "info");
    }

    updateBodyMap() {
        const legend = document.getElementById('muscle-legend');
        if (!legend) return;

        // Count sessions per muscle group
        const muscleCounts = {};
        this.sessions.forEach(session => {
            muscleCounts[session.muscleGroup] = (muscleCounts[session.muscleGroup] || 0) + 1;
        });

        // Update legend
        legend.innerHTML = this.muscleGroups.map(muscle => {
            const count = muscleCounts[muscle] || 0;
            return `
                <div class="legend-item" data-muscle="${muscle}">
                    <div class="legend-color" style="background-color: rgba(33, 128, 141, ${count > 0 ? 0.6 : 0.1})"></div>
                    <span>${muscle} (${count})</span>
                </div>
            `;
        }).join('');

        // Update body map regions
        document.querySelectorAll('.muscle-region').forEach(region => {
            const muscle = region.dataset.muscle;
            const hasData = muscleCounts[muscle] > 0;
            region.classList.toggle('has-data', hasData);
        });
    }

    populateScriptsList() {
        const container = document.getElementById('scripts-list');
        if (!container) return;

        const allScripts = [...this.defaultScripts, ...this.scripts];
        
        container.innerHTML = allScripts.map((script, index) => `
            <div class="script-item">
                <div class="script-info">
                    <div class="script-name">${script.name}</div>
                    <div class="script-size">${script.size}</div>
                </div>
                <div class="script-actions">
                    <button class="btn btn--sm btn--secondary" onclick="emgDashboard.editScript(${index})">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    ${index >= this.defaultScripts.length ? `
                        <button class="btn btn--sm btn--error" onclick="emgDashboard.deleteScript(${index})">
                            <i class="fas fa-trash"></i>
                            Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    handleScriptUpload(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const script = {
                name: file.name,
                size: this.formatFileSize(file.size),
                content: e.target.result
            };
            
            this.scripts.push(script);
            this.populateFormOptions();
            this.showToast(`Script "${file.name}" uploaded successfully`, "success");
        };
        reader.readAsText(file);
    }

    handleScriptManagerUpload(files) {
        Array.from(files).forEach(file => {
            this.handleScriptUpload(file);
        });
        this.populateScriptsList();
    }

    editScript(index) {
        const allScripts = [...this.defaultScripts, ...this.scripts];
        const script = allScripts[index];
        
        if (!script) return;

        const editor = document.getElementById('script-editor');
        const content = document.getElementById('script-editor-content');
        
        if (editor && content) {
            content.value = script.content;
            editor.style.display = 'block';
            this.currentEditingScript = { index, script };
        }
    }

    saveCurrentScript() {
        if (!this.currentEditingScript) return;

        const content = document.getElementById('script-editor-content');
        if (content) {
            this.currentEditingScript.script.content = content.value;
            this.showToast("Script saved successfully", "success");
        }
    }

    testCurrentScript() {
        const content = document.getElementById('script-editor-content');
        if (!content || !this.pyodide) return;

        try {
            this.pyodide.runPython(content.value);
            this.showToast("Script executed successfully", "success");
        } catch (error) {
            console.error("Script test failed:", error);
            this.showToast("Script test failed: " + error.message, "error");
        }
    }

    deleteScript(index) {
        const scriptIndex = index - this.defaultScripts.length;
        if (scriptIndex >= 0 && scriptIndex < this.scripts.length) {
            this.showModal(
                "Delete Script",
                "Are you sure you want to delete this script?",
                () => {
                    this.scripts.splice(scriptIndex, 1);
                    this.populateScriptsList();
                    this.populateFormOptions();
                    this.showToast("Script deleted successfully", "success");
                }
            );
        }
    }

    exportSession() {
        if (!this.currentSession) return;

        const dataStr = JSON.stringify(this.currentSession, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `emg-session-${this.currentSession.id}.json`;
        link.click();
        
        this.showToast("Session exported successfully", "success");
    }

    exportAllSessions() {
        if (this.sessions.length === 0) {
            this.showToast("No sessions to export", "warning");
            return;
        }

        const dataStr = JSON.stringify(this.sessions, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `emg-sessions-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showToast("All sessions exported successfully", "success");
    }

    showDeleteConfirmation() {
        this.showModal(
            "Delete Session",
            "Are you sure you want to delete this session? This action cannot be undone.",
            () => {
                this.deleteCurrentSession();
            }
        );
    }

    deleteCurrentSession() {
        if (!this.currentSession) return;

        const index = this.sessions.findIndex(s => s.id === this.currentSession.id);
        if (index !== -1) {
            this.sessions.splice(index, 1);
            localStorage.setItem('emg-sessions', JSON.stringify(this.sessions));
            this.filteredSessions = [...this.sessions];
            this.showToast("Session deleted successfully", "success");
            this.navigateTo('dashboard');
        }
    }

    renderComparisonView() {
        const container = document.getElementById('session-checkboxes');
        if (!container) return;

        container.innerHTML = this.sessions.map(session => `
            <label class="session-checkbox">
                <input type="checkbox" value="${session.id}">
                <span>${session.id} - ${session.subjectId} (${session.muscleGroup})</span>
            </label>
        `).join('');

        // Add event listeners for comparison
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateComparison();
            });
        });
    }

    updateComparison() {
        const selectedIds = Array.from(document.querySelectorAll('#session-checkboxes input:checked'))
            .map(cb => cb.value);
        
        if (selectedIds.length < 2) return;

        const selectedSessions = this.sessions.filter(s => selectedIds.includes(s.id));
        this.renderComparisonCharts(selectedSessions);
    }

    renderComparisonCharts(sessions) {
        // Implementation for comparison charts
        // This would create side-by-side comparisons of the selected sessions
        console.log("Rendering comparison for sessions:", sessions);
    }

    toggleTheme() {
        const body = document.body;
        const currentScheme = body.getAttribute('data-color-scheme');
        const newScheme = currentScheme === 'dark' ? 'light' : 'dark';
        
        body.setAttribute('data-color-scheme', newScheme);
        localStorage.setItem('color-scheme', newScheme);
        
        const icon = document.querySelector('#theme-toggle i');
        if (icon) {
            icon.className = newScheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    showModal(title, message, onConfirm) {
        const titleElement = document.getElementById('modal-title');
        const messageElement = document.getElementById('modal-message');
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;
        
        document.getElementById('modal-overlay').classList.remove('hidden');
        this.modalConfirmCallback = onConfirm;
    }

    hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        this.modalConfirmCallback = null;
    }

    handleModalConfirm() {
        if (this.modalConfirmCallback) {
            this.modalConfirmCallback();
        }
        this.hideModal();
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <i class="toast-icon ${icons[type]}"></i>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
        `;

        container.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    handleNewTestSubmit() {
        const form = document.getElementById('new-test-form');
        const formData = new FormData(form);
        
        // Validate required fields
        const requiredFields = ['subject-id', 'muscle-group', 'electrode-type'];
        const missingFields = requiredFields.filter(field => !formData.get(field));
        
        if (missingFields.length > 0) {
            this.showToast("Please fill in all required fields", "error");
            return;
        }

        if (!this.currentScript) {
            this.showToast("Please select a test script", "error");
            return;
        }

        this.showToast("Test configuration saved. Connect device and start test.", "success");
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.emgDashboard = new EMGDashboard();
});
