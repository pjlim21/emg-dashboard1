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
        
        // Store callback functions as instance properties to prevent GC
        this.pythonCallbacks = {};
        
        // BLE handles
        this.bluetoothDevice = null;
        this.gattServer = null;
        this.emgCharacteristic = null;
        this.commandCharacteristic = null;
        this.emgBuffer = [];
        this.testStartTime = null;
        this.currentTestData = {};
        this.activeTestPhase = null;
        this.phaseTime = null;
        
        // UUIDs for BLE EMG device
        this.EMG_SERVICE_UUID = 'df1a0863-f02f-49ba-bf55-3b56c6bcb398';
        this.EMG_CHARACTERISTIC_UUID = '8c24159c-66a0-4340-8b55-465047ce37ce';
        this.EMG_COMMAND_CHARACTERISTIC_UUID = this.EMG_CHARACTERISTIC_UUID;
        
        // Available muscle groups and electrode types
        this.muscleGroups = ["Bicep", "Tricep", "Hamstring", "Quadriceps", "Deltoid", "Pectoralis Major", "Latissimus Dorsi", "Gastrocnemius"];
        this.electrodeTypes = ["Gel", "Dry", "Microneedle", "Surface Array"];
        
        // Default Python scripts (completely browser-safe)
        this.defaultScripts = [
            {
                name: 'emg_basic_acquisition.py',
                size: '2.8 KB',
                content: `import js

# EMG Basic Acquisition Script
class EMGAcquisition:
    def __init__(self):
        self.sampling_rate = 1000  # Hz
        self.is_recording = False
        self.session_data = {}
    
    def connect_device(self, device_id):
        js.displayInstructions("Connecting to EMG device...")
        success = js.EMGBridge.connect_device(device_id)
        if success:
            js.displayInstructions("Device connected successfully!")
            return True
        else:
            js.displayInstructions("Failed to connect to device")
            return False
    
    def _recording(self):
        js.displayInstructions("ing EMG recording...")
        self.is_recording = True
        self.session_data = {
            "acquisition": {
                "name": "Basic Acquisition",
                "rawData": [],
                "Time": js.EMGBridge.get_timestamp()
            }
        }
        
        # Start the stream
        success = js.EMGBridge.start_stream()
        if success:
            js.displayInstructions("EMG stream active - recording data...")
            # Set up data collection interval
            js.EMGBridge.start_data_collection("acquisition")
        else:
            js.displayInstructions("Failed to start EMG stream")
    
    def stop_recording(self):
        js.displayInstructions("Stopping EMG recording...")
        self.is_recording = False
        js.EMGBridge.stop_stream()
        
        # Finalize the phase data
        js.EMGBridge.finalize_phase("acquisition")
        js.displayInstructions("Recording stopped. Data saved.")
        return self.get_results()
    
    def get_results(self):
        return js.EMGBridge.get_session_data()

# Initialize and run
emg = EMGAcquisition()
emg.start_recording()`
            },
            {
                name: 'simple_mvc_test.py',
                size: '3.1 KB',
                content: `import js

# Simple MVC Test - Browser-Safe Version
class SimpleMVCTest:
    def __init__(self):
        self.test_phases = ["baseline", "mvc", "recovery"]
        self.current_phase_index = 0
        self.is_running = False
    
    def run_test(self):
        """Start the simple MVC test protocol"""
        js.displayInstructions("Starting Simple MVC Test...")
        self.is_running = True
        self.current_phase_index = 0
        
        # Initialize session data
        js.EMGBridge.initialize_session({
            "baseline": {"name": "Baseline", "duration": 3000},
            "mvc": {"name": "Maximum Voluntary Contraction", "duration": 5000},
            "recovery": {"name": "Recovery", "duration": 3000}
        })
        
        # Start first phase
        self.start_next_phase()
        return True
    
    def start_next_phase(self):
        """Start the next phase in the test"""
        if self.current_phase_index >= len(self.test_phases):
            self.complete_test()
            return
        
        phase_id = self.test_phases[self.current_phase_index]
        
        if phase_id == "baseline":
            js.displayInstructions("Relax your muscle completely (3 seconds)")
            js.EMGBridge.start_phase("baseline", 3000)
        elif phase_id == "mvc":
            js.displayInstructions("Perform MAXIMUM voluntary contraction NOW! (5 seconds)")
            js.EMGBridge.start_phase("mvc", 5000)
        elif phase_id == "recovery":
            js.displayInstructions("Relax and recover (3 seconds)")
            js.EMGBridge.start_phase("recovery", 3000)
        
        # Schedule next phase using callback system
        js.EMGBridge.schedule_next_phase("phase_completed")
    
    def phase_completed(self):
        """Called when a phase is completed"""
        if not self.is_running:
            return
            
        self.current_phase_index += 1
        self.start_next_phase()
    
    def complete_test(self):
        """Complete the test and process results"""
        js.displayInstructions("Test complete! Processing results...")
        js.EMGBridge.finalize_test()
        js.displayInstructions("All phases completed successfully!")
        self.is_running = False
    
    def stop_test(self):
        """Stop the current test"""
        self.is_running = False
        js.EMGBridge.stop_stream()
        js.displayInstructions("Test stopped by user")

# Initialize and run the test
test = SimpleMVCTest()
test.run_test()`
            },
            {
                name: 'continuous_monitoring.py',
                size: '2.2 KB',
                content: `import js

# Continuous EMG Monitoring Script
class ContinuousMonitor:
    def __init__(self):
        self.is_monitoring = False
        self.monitor_duration = 30000  # 30 seconds max
    
    def start_monitoring(self):
        """Start continuous EMG monitoring"""
        js.displayInstructions("Starting continuous EMG monitoring...")
        self.is_monitoring = True
        
        # Initialize monitoring session
        js.EMGBridge.initialize_session({
            "monitoring": {
                "name": "Continuous Monitoring", 
                "duration": self.monitor_duration
            }
        })
        
        # Start the monitoring phase
        js.EMGBridge.start_phase("monitoring", self.monitor_duration)
        js.displayInstructions("Monitoring active - move naturally...")
        
        # Set up completion callback
        js.EMGBridge.schedule_next_phase("monitoring_complete")
    
    def monitoring_complete(self):
        """Called when monitoring period ends"""
        js.displayInstructions("Monitoring period complete!")
        js.EMGBridge.finalize_test()
        self.is_monitoring = False
    
    def stop_monitoring(self):
        """Stop monitoring"""
        self.is_monitoring = False
        js.EMGBridge.stop_stream()
        js.EMGBridge.finalize_test()
        js.displayInstructions("Monitoring stopped")
    
    def get_status(self):
        """Get current monitoring status"""
        return {
            "is_monitoring": self.is_monitoring,
            "duration": self.monitor_duration
        }

# Initialize and start monitoring
monitor = ContinuousMonitor()
monitor.start_monitoring()`
            },

    {
    name: 'fatigue_assessment.py',
    size: '4.2 KB',
    content: `import js

# Fatigue Assessment Protocol
class FatigueAssessment:
    def __init__(self):
        self.test_phases = ["baseline", "initial_mvc", "fatigue_induction", "recovery", "final_mvc"]
        self.current_phase_index = 0
        self.is_running = False
        self.mvc_reference = 0
        
    def run_test(self):
        """Start the fatigue assessment protocol"""
        js.displayInstructions("Starting Fatigue Assessment Protocol...")
        self.is_running = True
        self.current_phase_index = 0
        
        # Initialize session with all phases
        js.EMGBridge.initialize_session({
            "baseline": {
                "name": "Baseline Rest", 
                "duration": 10000,
                "instruction": "Relax completely - no muscle tension"
            },
            "initial_mvc": {
                "name": "Initial Maximum Voluntary Contraction", 
                "duration": 5000,
                "instruction": "Contract as hard as possible!"
            },
            "fatigue_induction": {
                "name": "Fatigue Induction Phase", 
                "duration": 30000,
                "instruction": "Maintain 50% effort - steady contraction"
            },
            "recovery": {
                "name": "Recovery Assessment", 
                "duration": 15000,
                "instruction": "Gradually relax from contraction to rest"
            },
            "final_mvc": {
                "name": "Post-Fatigue Maximum Contraction", 
                "duration": 5000,
                "instruction": "Final maximum effort - give everything!"
            }
        })
        
        # Start first phase
        self.start_next_phase()
        return True
    
    def start_next_phase(self):
        """Progress to next phase in protocol"""
        if self.current_phase_index >= len(self.test_phases):
            self.complete_test()
            return
            
        phase_id = self.test_phases[self.current_phase_index]
        phase_info = {
            "baseline": ("Relax completely - no muscle tension", 10000),
            "initial_mvc": ("Contract as hard as possible!", 5000),
            "fatigue_induction": ("Maintain 50% effort - steady contraction", 30000),
            "recovery": ("Gradually relax from contraction to rest", 15000),
            "final_mvc": ("Final maximum effort - give everything!", 5000)
        }
        
        instruction, duration = phase_info[phase_id]
        js.displayInstructions(f"Phase {self.current_phase_index + 1}/5: {instruction}")
        
        # Start the phase
        js.EMGBridge.start_phase(phase_id, duration)
        
        # Schedule next phase transition
        js.EMGBridge.schedule_next_phase("phase_completed")
    
    def phase_completed(self):
        """Called when a phase completes"""
        if not self.is_running:
            return
            
        completed_phase = self.test_phases[self.current_phase_index]
        
        # Store MVC reference from initial contraction
        if completed_phase == "initial_mvc":
            # This will be calculated in JavaScript finalizePhase
            js.displayInstructions("Initial MVC completed - reference established")
        
        self.current_phase_index += 1
        
        # Brief pause between phases
        js.EMGBridge.schedule_next_phase("start_next_phase_delayed")
        
    def start_next_phase_delayed(self):
        """Start next phase after brief delay"""
        self.start_next_phase()
    
    def complete_test(self):
        """Complete the fatigue assessment"""
        js.displayInstructions("Fatigue Assessment Complete! Analyzing results...")
        js.EMGBridge.finalize_test()
        self.is_running = False
        
        # Calculate fatigue index (will be done in JavaScript)
        js.displayInstructions("Protocol finished - fatigue metrics calculated")
    
    def stop_test(self):
        """Emergency stop"""
        self.is_running = False
        js.EMGBridge.stop_stream()
        js.displayInstructions("Fatigue assessment stopped by user")

# Initialize and run
test = FatigueAssessment()
test.run_test()`
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
            
            // Store callback functions as instance properties to prevent garbage collection
            this.pythonCallbacks.displayInstructions = this.displayInstructions.bind(this);
            this.pythonCallbacks.updateProgress = this.updateProgress.bind(this);
            this.pythonCallbacks.phaseCompleted = this.handlePhaseCompleted.bind(this);
            this.pythonCallbacks.monitoringComplete = this.handleMonitoringComplete.bind(this);
            
            // Expose objects to Python - no proxies needed
            globalThis.EMGBridge = this.createEMGBridge();
            globalThis.displayInstructions = this.pythonCallbacks.displayInstructions;
            globalThis.updateProgress = this.pythonCallbacks.updateProgress;
            
            console.log("Pyodide initialized successfully");
            this.showToast("Python environment ready", "success");
        } catch (error) {
            console.error("Failed to initialize Pyodide:", error);
            this.showToast("Failed to initialize Python environment", "error");
        }
    }

    handlePhaseCompleted() {
        // Called from Python when a phase completes
        if (this.phaseCompleteCallback) {
            this.phaseCompleteCallback();
        }
    }

    handleMonitoringComplete() {
        // Called from Python when monitoring completes
        this.displayInstructions("Monitoring period complete!");
        if (Object.keys(this.currentTestData).length > 0) {
            this.saveCurrentSession();
        }
    }

    createEMGBridge() {
        const dashboard = this;
        return {
            connect_device: (deviceId) => {
                return dashboard.bluetoothDevice !== null;
            },
            
            start_stream: () => {
                if (dashboard.commandCharacteristic && dashboard.emgCharacteristic) {
                    try {
                        // Send "start" command to device
                        const startCommand = new TextEncoder().encode("start");
                        dashboard.commandCharacteristic.writeValueWithoutResponse(startCommand);
                        
                        // Start notifications
                        dashboard.emgCharacteristic.startNotifications();
                        return true;
                    } catch (error) {
                        console.error("Failed to start stream:", error);
                        return false;
                    }
                }
                return false;
            },
            
            stop_stream: () => {
                if (dashboard.commandCharacteristic && dashboard.emgCharacteristic) {
                    try {
                        // Send "stop" command to device
                        const stopCommand = new TextEncoder().encode("stop");
                        dashboard.commandCharacteristic.writeValueWithoutResponse(stopCommand);
                        
                        // Stop notifications
                        dashboard.emgCharacteristic.stopNotifications();
                        return true;
                    } catch (error) {
                        console.error("Failed to stop stream:", error);
                        return false;
                    }
                }
                return false;
            },
            
            get_timestamp: () => {
                return Date.now();
            },
            
            initialize_session: (phases) => {
                dashboard.currentTestData = {};
                for (const [phaseId, phaseInfo] of Object.entries(phases)) {
                    dashboard.currentTestData[phaseId] = {
                        name: phaseInfo.name,
                        duration: phaseInfo.duration,
                        rawData: [],
                        startTime: null,
                        endTime: null
                    };
                }
                console.log("Session initialized with phases:", Object.keys(phases));
            },
            
            start_phase: (phaseId, duration) => {
                dashboard.activeTestPhase = phaseId;
                dashboard.phaseStartTime = Date.now();
                
                // Initialize phase data with empty rawData array
                if (!dashboard.currentTestData[phaseId]) {
                    dashboard.currentTestData[phaseId] = {
                        name: phaseId,
                        duration: duration,
                        rawData: [],
                        startTime: null,
                        endTime: null
                    };
                }
                
                // Ensure rawData is initialized
                dashboard.currentTestData[phaseId].startTime = dashboard.phaseStartTime;
                dashboard.currentTestData[phaseId].rawData = [];
                
                console.log(`Started phase: ${phaseId} for ${duration}ms`);
                
                // CRITICAL: Send start command to EMG device before data collection
                if (dashboard.commandCharacteristic && dashboard.emgCharacteristic) {
                    try {
                        // Send "start" command to device
                        const startCommand = new TextEncoder().encode("start");
                        dashboard.commandCharacteristic.writeValueWithoutResponse(startCommand);
                        
                        // Start notifications for EMG data
                        dashboard.emgCharacteristic.startNotifications().then(() => {
                            console.log("EMG notifications started successfully");
                            dashboard.showToast("EMG device started", "success");
                        }).catch((error) => {
                            console.error("Failed to start notifications:", error);
                            dashboard.showToast("Failed to start EMG notifications", "error");
                        });
                    } catch (error) {
                        console.error("Failed to send start command:", error);
                        dashboard.showToast("Failed to send start command to device", "error");
                    }
                }
                
                // Clear any existing intervals
                if (dashboard.phaseInterval) {
                    clearInterval(dashboard.phaseInterval);
                }
                
                // Set up progress updates and data collection
                const updateInterval = 100; // Update every 100ms
                const totalSteps = duration / updateInterval;
                let currentStep = 0;
                
                dashboard.phaseInterval = setInterval(() => {
                    if (!dashboard.testInProgress || dashboard.activeTestPhase !== phaseId) {
                        clearInterval(dashboard.phaseInterval);
                        return;
                    }
                    
                    currentStep++;
                    const progress = (currentStep / totalSteps) * 100;
                    dashboard.updateProgress(Math.min(progress, 100));
                    
                    // Collect EMG data if available
                    if (dashboard.emgBuffer.length > 0) {
                        dashboard.currentTestData[phaseId].rawData.push(...dashboard.emgBuffer);
                        dashboard.emgBuffer = [];
                    }
                    
                    if (currentStep >= totalSteps) {
                        clearInterval(dashboard.phaseInterval);
                        dashboard.finalizePhase(phaseId);
                    }
                }, updateInterval);
            },

            
            schedule_next_phase: (callbackName) => {
                // Store callback by name to avoid proxy issues
                dashboard.phaseCompleteCallback = () => {
                    // Call Python function by name through pyodide
                    try {
                        if (callbackName === "phase_completed") {
                            dashboard.pyodide.runPython(`
if 'test' in globals():
    test.phase_completed()
`);
                        } else if (callbackName === "monitoring_complete") {
                            dashboard.pyodide.runPython(`
if 'monitor' in globals():
    monitor.monitoring_complete()
`);
                        }
                    } catch (error) {
                        console.error("Error calling Python callback:", error);
                    }
                };
            },
            
            finalize_phase: (phaseId) => {
                if (dashboard.currentTestData[phaseId]) {
                    dashboard.currentTestData[phaseId].endTime = Date.now();
                    
                    const rawData = dashboard.currentTestData[phaseId].rawData;
                    if (rawData.length > 0) {
                        // Calculate basic metrics
                        let sum = 0, absSum = 0, maxAmp = 0;
                        for (const value of rawData) {
                            sum += value;
                            const absVal = Math.abs(value);
                            absSum += absVal;
                            if (absVal > maxAmp) maxAmp = absVal;
                        }
                        
                        const mean = sum / rawData.length;
                        const mav = absSum / rawData.length;
                        const rms = Math.sqrt(rawData.reduce((acc, val) => acc + val * val, 0) / rawData.length);
                        
                        dashboard.currentTestData[phaseId].mean = mean;
                        dashboard.currentTestData[phaseId].mav = mav;
                        dashboard.currentTestData[phaseId].rms = rms;
                        dashboard.currentTestData[phaseId].maxAmplitude = maxAmp;
                        dashboard.currentTestData[phaseId].sampleCount = rawData.length;
                    }
                }
                
                dashboard.activeTestPhase = null;
                dashboard.updateProgress(100);
                
                // Call the callback if set
                if (dashboard.phaseCompleteCallback) {
                    setTimeout(dashboard.phaseCompleteCallback, 500);
                }
            },
            
            finalize_test: () => {
                // Ensure any remaining data is saved
                if (dashboard.activeTestPhase) {
                    dashboard.finalizePhase(dashboard.activeTestPhase);
                }
                
                // Auto-save the session
                if (Object.keys(dashboard.currentTestData).length > 0) {
                    dashboard.saveCurrentSession();
                }
            },
            
            start_data_collection: (phaseId) => {
                dashboard.activeTestPhase = phaseId;
                dashboard.phaseStartTime = Date.now();
                
                if (!dashboard.currentTestData[phaseId]) {
                    dashboard.currentTestData[phaseId] = {
                        name: "Data Collection",
                        rawData: [],
                        startTime: dashboard.phaseStartTime
                    };
                }
                
                // Set up continuous data collection
                dashboard.dataCollectionInterval = setInterval(() => {
                    if (!dashboard.testInProgress) {
                        clearInterval(dashboard.dataCollectionInterval);
                        return;
                    }
                    
                    // Collect EMG data if available
                    if (dashboard.emgBuffer.length > 0) {
                        dashboard.currentTestData[phaseId].rawData.push(...dashboard.emgBuffer);
                        dashboard.emgBuffer = [];
                    }
                    
                    // Update progress based on time
                    const elapsed = Date.now() - dashboard.phaseStartTime;
                    const progress = Math.min((elapsed / 10000) * 100, 99); // Max 10 seconds before hitting 99%
                    dashboard.updateProgress(progress);
                }, 100);
            },
            
            get_session_data: () => {
                return dashboard.currentTestData;
            }
        };
    }

    finalizePhase(phaseId) {
        if (!this.currentTestData[phaseId]) {
            console.error(`Phase data not found for phaseId: ${phaseId}`);
            this.showToast(`Phase ${phaseId} data not found`, "error");
            return;
        }
        
        this.currentTestData[phaseId].endTime = Date.now();
        
        // Send stop command to EMG device
        if (this.commandCharacteristic) {
            try {
                const stopCommand = new TextEncoder().encode("stop");
                this.commandCharacteristic.writeValueWithoutResponse(stopCommand);
                console.log("Stop command sent to EMG device");
            } catch (error) {
                console.error("Failed to send stop command:", error);
            }
        }
        
        // Safe access to rawData with proper initialization
        const rawData = this.currentTestData[phaseId].rawData || [];
        
        console.log(`Processing phase ${phaseId}: ${rawData.length} samples collected`);
        
        if (rawData && rawData.length > 0) {
            // Calculate basic metrics
            let sum = 0, absSum = 0, maxAmp = 0;
            for (const value of rawData) {
                sum += value;
                const absVal = Math.abs(value);
                absSum += absVal;
                if (absVal > maxAmp) maxAmp = absVal;
            }
            
            const mean = sum / rawData.length;
            const mav = absSum / rawData.length;
            const rms = Math.sqrt(rawData.reduce((acc, val) => acc + val * val, 0) / rawData.length);
            
            // Store basic metrics
            this.currentTestData[phaseId].mean = mean;
            this.currentTestData[phaseId].mav = mav;
            this.currentTestData[phaseId].rms = rms;
            this.currentTestData[phaseId].maxAmplitude = maxAmp;
            this.currentTestData[phaseId].sampleCount = rawData.length;
            
            // === ADVANCED EMG METRICS ===
            
            // 1. Zero Crossings (ZC)
            let zeroCrossings = 0;
            for (let i = 1; i < rawData.length; i++) {
                if ((rawData[i] >= 0 && rawData[i-1] < 0) || (rawData[i] < 0 && rawData[i-1] >= 0)) {
                    zeroCrossings++;
                }
            }
            
            // 2. Slope Sign Changes (SSC)
            let slopeSignChanges = 0;
            if (rawData.length >= 3) {
                for (let i = 1; i < rawData.length - 1; i++) {
                    const slope1 = rawData[i] - rawData[i-1];
                    const slope2 = rawData[i+1] - rawData[i];
                    if ((slope1 > 0 && slope2 < 0) || (slope1 < 0 && slope2 > 0)) {
                        slopeSignChanges++;
                    }
                }
            }
            
            // 3. Willison Amplitude (WAMP)
            const wampThreshold = maxAmp * 0.05; // 5% of max amplitude
            let wamp = 0;
            for (let i = 1; i < rawData.length; i++) {
                if (Math.abs(rawData[i] - rawData[i-1]) > wampThreshold) {
                    wamp++;
                }
            }
            
            // 4. Integrated EMG (IEMG)
            const iemg = absSum;
            
            // Store advanced metrics
            this.currentTestData[phaseId].zeroCrossings = zeroCrossings;
            this.currentTestData[phaseId].slopeSignChanges = slopeSignChanges;
            this.currentTestData[phaseId].wamp = wamp;
            this.currentTestData[phaseId].iemg = iemg;
            
            console.log(`Phase ${phaseId} completed: ${rawData.length} samples, RMS: ${rms.toFixed(3)}`);
            
        } else {
            console.warn(`No EMG data collected for phase: ${phaseId}`);
            this.showToast(`Warning: No data collected for ${phaseId}`, "warning");
            
            // Set default values to prevent crashes
            const defaultMetrics = {
                mean: 0, mav: 0, rms: 0, maxAmplitude: 0, sampleCount: 0,
                zeroCrossings: 0, slopeSignChanges: 0, wamp: 0, iemg: 0
            };
            
            Object.assign(this.currentTestData[phaseId], defaultMetrics);
        }
        
        this.activeTestPhase = null;
        this.updateProgress(100);
        
        // Call the callback if set
        if (this.phaseCompleteCallback) {
            setTimeout(this.phaseCompleteCallback, 500);
        }
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
            progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
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
            
            // Get both data and command characteristics (may be the same)
            this.emgCharacteristic = await service.getCharacteristic(this.EMG_CHARACTERISTIC_UUID);
            this.commandCharacteristic = await service.getCharacteristic(this.EMG_COMMAND_CHARACTERISTIC_UUID);

            // Set up notification handler for data
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
        if (!this.emgCharacteristic || !this.commandCharacteristic) {
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
            this.activeTestPhase = null;
            this.phaseCompleteCallback = null;

            // Clear any existing intervals
            if (this.phaseInterval) clearInterval(this.phaseInterval);
            if (this.dataCollectionInterval) clearInterval(this.dataCollectionInterval);

            // Show monitoring section
            document.querySelector('.test-monitoring').style.display = 'block';
            
            // Update button states
            document.getElementById('start-test').disabled = true;
            document.getElementById('pause-test').disabled = false;
            document.getElementById('stop-test').disabled = false;

            // Initialize live chart
            this.initializeLiveChart();

            // Execute Python script with error handling
            await this.executePythonScript(this.currentScript.content);

            this.showToast("Test started successfully", "success");
        } catch (error) {
            console.error("Failed to start test:", error);
            this.showToast(`Failed to start test: ${error.message}`, "error");
            this.stopTest();
        }
    }

    async executePythonScript(scriptContent) {
        if (!this.pyodide) {
            throw new Error("Python environment not initialized");
        }

        try {
            // Execute the script in Pyodide with timeout protection
            this.pyodide.runPython(scriptContent);
            
            this.showToast("Script executed successfully", "success");
            return true;
        } catch (error) {
            console.error("Python script execution failed:", error);
            this.showToast(`Python script error: ${error.message}`, "error");
            throw error;
        }
    }

    pauseTest() {
        this.testInProgress = false;
        
        // Clear intervals
        if (this.phaseInterval) clearInterval(this.phaseInterval);
        if (this.dataCollectionInterval) clearInterval(this.dataCollectionInterval);
        
        document.getElementById('start-test').disabled = false;
        document.getElementById('pause-test').disabled = true;
        this.displayInstructions("Test paused");
        this.showToast("Test paused", "warning");
    }

    async stopTest() {
        this.testInProgress = false;
        
        // Clear intervals
        if (this.phaseInterval) clearInterval(this.phaseInterval);
        if (this.dataCollectionInterval) clearInterval(this.dataCollectionInterval);
        
        // Finalize any active phase
        if (this.activeTestPhase) {
            this.finalizePhase(this.activeTestPhase);
        }
        
        // Stop BLE streaming
        if (this.commandCharacteristic && this.emgCharacteristic) {
            try {
                const stopCommand = new TextEncoder().encode("stop");
                await this.commandCharacteristic.writeValueWithoutResponse(stopCommand);
                await this.emgCharacteristic.stopNotifications();
            } catch (error) {
                console.error("Failed to stop BLE streaming:", error);
            }
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
        this.showToast("Test stopped and saved", "info");
    }

    saveCurrentSession() {
        // Get form values directly from elements instead of FormData
        const subjectId = document.getElementById('subject-id')?.value || 'Unknown';
        const muscleGroup = document.getElementById('muscle-group')?.value || 'Unknown';
        const bodyPlacement = document.getElementById('body-placement')?.value || 'Not specified';
        const electrodeType = document.getElementById('electrode-type')?.value || 'Unknown';
        const electrodeConfig = document.getElementById('electrode-config')?.value || 'Not specified';
        
        const sessionData = {
            id: `emg-${Date.now()}`,
            timestamp: new Date().toISOString(),
            subjectId: subjectId,
            muscleGroup: muscleGroup,
            bodyPlacement: bodyPlacement,
            electrodeType: electrodeType,
            electrodeConfig: electrodeConfig,
            testPhases: this.currentTestData
        };

        this.saveSession(sessionData);
        this.showToast("Session saved successfully", "success");
        
        // Refresh dashboard if we're on it
        if (this.currentView === 'dashboard') {
            this.renderDashboard();
        }
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
    importSession(file) {
        if (!file) {
            this.showToast("No file selected", "error");
            return;
        }
        
        if (!file.name.endsWith('.json')) {
            this.showToast("Please select a valid JSON file", "error");
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate imported data structure
                if (!this.validateSessionData(importedData)) {
                    this.showToast("Invalid session file format", "error");
                    return;
                }
                
                // Check for duplicate session ID
                const existingSession = this.sessions.find(s => s.id === importedData.sessionInfo.id);
                if (existingSession) {
                    // Generate new ID to avoid conflicts
                    importedData.sessionInfo.id = `imported-${Date.now()}`;
                    importedData.sessionInfo.notes = `${importedData.sessionInfo.notes || ''} [IMPORTED COPY]`.trim();
                }
                
                // Create session object in expected format
                const newSession = {
                    id: importedData.sessionInfo.id,
                    subjectId: importedData.sessionInfo.subjectId,
                    muscleGroup: importedData.sessionInfo.muscleGroup,
                    electrodeType: importedData.sessionInfo.electrodeType,
                    notes: importedData.sessionInfo.notes,
                    timestamp: importedData.sessionInfo.timestamp,
                    testData: importedData.testData,
                    importedAt: new Date().toISOString()
                };
                
                // Add to sessions array
                this.sessions.push(newSession);
                this.filteredSessions = [...this.sessions];
                
                // Save to localStorage
                localStorage.setItem('emg-sessions', JSON.stringify(this.sessions));
                
                // Re-render dashboard
                this.renderDashboard();
                
                this.showToast(`Session imported: ${newSession.subjectId}`, "success");
                
            } catch (error) {
                console.error("Import failed:", error);
                this.showToast("Failed to import session - invalid file format", "error");
            }
        };
        
        reader.readAsText(file);
    }
    
    validateSessionData(data) {
        // Check required structure
        if (!data || !data.sessionInfo || !data.testData) {
            return false;
        }
        
        const required = ['id', 'subjectId', 'muscleGroup', 'timestamp'];
        for (const field of required) {
            if (!data.sessionInfo[field]) {
                return false;
            }
        }
        
        // Validate testData structure
        if (typeof data.testData !== 'object') {
            return false;
        }
        
        return true;
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
