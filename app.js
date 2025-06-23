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

        /* NEW: which Python file is chosen for a test */
        this.currentScript    = null;
        /* BLE handles */
        this.bluetoothDevice   = null;
        this.gattServer        = null;
        this.emgCharacteristic = null;
        this.emgBuffer         = [];          // live sample buffer

        /* UUIDs used by many commercial BLE EMG boards (Nordic-UART-like)  
           Adapt if your hardware advertises different values. */
        this.EMG_SERVICE_UUID        = 'df1a0863-f02f-49ba-bf55-3b56c6bcb398';
        this.EMG_CHARACTERISTIC_UUID = '8c24159c-66a0-4340-8b55-465047ce37ce';
        /* If the same UUID is used for both data and commands,
        just point to EMG_CHARACTERISTIC_UUID again.           */
        this.EMG_COMMAND_CHARACTERISTIC_UUID = this.EMG_CHARACTERISTIC_UUID;   // <-- NEW

        
        // Sample data from application_data
        this.sampleData = {
            sessions: [
                {
                    id: "emg-001",
                    timestamp: "2025-06-20T14:30:00Z",
                    subjectId: "SUB001",
                    muscleGroup: "Bicep",
                    bodyPlacement: "Right arm, bicep brachii muscle belly, 2cm superior to elbow joint",
                    electrodeType: "Gel",
                    electrodeConfig: "Bipolar surface electrodes, 2cm inter-electrode distance, reference on wrist",
                    testPhases: {
                        mvc1: {
                            name: "MVC 1",
                            duration: 5000,
                            rawData: this.generateSampleEMGData(5000, 0.8, 50),
                            rms: 0.847,
                            mav: 0.723,
                            snr: 24.5,
                            maxAmplitude: 2.1
                        },
                        mvc2: {
                            name: "MVC 2",
                            duration: 5000,
                            rawData: this.generateSampleEMGData(5000, 0.8, 45),
                            rms: 0.839,
                            mav: 0.718,
                            snr: 23.8,
                            maxAmplitude: 2.05
                        },
                        submaximal: {
                            name: "Sub-maximal (50%)",
                            duration: 10000,
                            rawData: this.generateSampleEMGData(10000, 0.4, 30),
                            rms: 0.423,
                            mav: 0.361,
                            snr: 18.2,
                            maxAmplitude: 1.05
                        },
                        walking: {
                            name: "Walking",
                            duration: 15000,
                            rawData: this.generateSampleEMGData(15000, 0.2, 20),
                            rms: 0.234,
                            mav: 0.198,
                            snr: 15.1,
                            maxAmplitude: 0.78
                        }
                    }
                },
                {
                    id: "emg-002",
                    timestamp: "2025-06-21T09:15:00Z",
                    subjectId: "SUB002",
                    muscleGroup: "Quadriceps",
                    bodyPlacement: "Right thigh, vastus lateralis, middle of muscle belly",
                    electrodeType: "Dry",
                    electrodeConfig: "Dry surface electrodes, 3cm spacing, ground electrode on patella",
                    testPhases: {
                        mvc1: {
                            name: "MVC 1",
                            duration: 5000,
                            rawData: this.generateSampleEMGData(5000, 1.2, 60),
                            rms: 1.234,
                            mav: 1.056,
                            snr: 22.1,
                            maxAmplitude: 3.2
                        },
                        mvc2: {
                            name: "MVC 2",
                            duration: 5000,
                            rawData: this.generateSampleEMGData(5000, 1.1, 55),
                            rms: 1.198,
                            mav: 1.034,
                            snr: 21.8,
                            maxAmplitude: 3.15
                        },
                        submaximal: {
                            name: "Sub-maximal (50%)",
                            duration: 10000,
                            rawData: this.generateSampleEMGData(10000, 0.6, 35),
                            rms: 0.617,
                            mav: 0.528,
                            snr: 16.9,
                            maxAmplitude: 1.58
                        }
                    }
                },
                {
                    id: "emg-003",
                    timestamp: "2025-06-22T11:45:00Z",
                    subjectId: "SUB001",
                    muscleGroup: "Hamstring",
                    bodyPlacement: "Left thigh, biceps femoris, proximal third of muscle",
                    electrodeType: "Surface Array",
                    electrodeConfig: "4-electrode linear array, 1cm spacing, reference on fibular head",
                    testPhases: {
                        mvc1: {
                            name: "MVC 1",
                            duration: 5000,
                            rawData: this.generateSampleEMGData(5000, 0.9, 55),
                            rms: 0.956,
                            mav: 0.821,
                            snr: 26.3,
                            maxAmplitude: 2.45
                        },
                        mvc2: {
                            name: "MVC 2",
                            duration: 5000,
                            rawData: this.generateSampleEMGData(5000, 0.9, 50),
                            rms: 0.942,
                            mav: 0.809,
                            snr: 25.7,
                            maxAmplitude: 2.38
                        },
                        walking: {
                            name: "Walking",
                            duration: 15000,
                            rawData: this.generateSampleEMGData(15000, 0.25, 25),
                            rms: 0.287,
                            mav: 0.245,
                            snr: 14.8,
                            maxAmplitude: 0.92
                        }
                    }
                }
            ],
            muscleGroups: ["Bicep", "Tricep", "Hamstring", "Quadriceps", "Deltoid", "Pectoralis Major", "Latissimus Dorsi", "Gastrocnemius"],
            electrodeTypes: ["Gel", "Dry", "Microneedle", "Surface Array"]
        };

        // Sample Python Scripts
        this.sampleScripts = [
            {
                name: 'emg_basic_acquisition.py',
                size: '3.2 KB',
                content: `
import pyodide
from js import EMGBridge
import numpy as np
import time

# EMG Data Acquisition Script
# For use with Web Bluetooth EMG devices

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
        
        # This would call the JavaScript bridge function
        EMGBridge.start_stream(self.on_data_received)
        
    def on_data_received(self, data):
        # Process incoming EMG data from JS bridge
        self.data_buffer.append(data)
        
    def stop_recording(self):
        print("Stopping EMG recording...")
        self.is_recording = False
        EMGBridge.stop_stream()
        
    def analyze_data(self):
        if len(self.data_buffer) == 0:
            print("No data to analyze")
            return {}
        
        # Convert to numpy array for analysis
        data_array = np.array(self.data_buffer)
        
        # Calculate basic metrics
        rms = np.sqrt(np.mean(np.square(data_array)))
        mav = np.mean(np.abs(data_array))
        max_amp = np.max(np.abs(data_array))
        
        # Calculate SNR (simplified)
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

# Example usage (would be executed by the dashboard)
emg = EMGAcquisition()
`
            },
            {
                name: 'dynamic_contraction_test.py',
                size: '4.5 KB',
                content: `
import pyodide
from js import EMGBridge, displayInstructions, updateProgress
import numpy as np
import time

# Dynamic Contraction Test Protocol
# For EMG Dashboard Web Application

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
            "rest1": {},
            "mvc2": {},
            "rest2": {},
            "submaximal": {},
            "walking": {}
        }
        
        # First MVC
        if not self._run_mvc_phase("mvc1", "Perform maximum voluntary contraction"):
            return False
            
        # Rest period
        if not self._run_rest_phase("rest1", "Rest for 30 seconds"):
            return False
            
        # Second MVC
        if not self._run_mvc_phase("mvc2", "Perform second maximum voluntary contraction"):
            return False
            
        # Rest period
        if not self._run_rest_phase("rest2", "Rest for 30 seconds"):
            return False
            
        # 50% Sub-maximal contraction
        if not self._run_submaximal_phase("submaximal", "Perform 50% of maximum contraction"):
            return False
            
        # Walking test
        if not self._run_walking_phase("walking", "Walk at a comfortable pace"):
            return False
            
        displayInstructions("Test complete! Processing results...")
        self._process_results()
        return True
    
    def _run_mvc_phase(self, phase_id, instruction, duration=5):
        """Run a maximum voluntary contraction phase"""
        displayInstructions(f"{instruction} for {duration} seconds")
        EMGBridge.start_stream()
        
        # Simulated data collection for the specified duration
        start_time = time.time()
        while time.time() - start_time < duration and self.is_running:
            # Update progress (0-100%)
            progress = ((time.time() - start_time) / duration) * 100
            updateProgress(progress)
            time.sleep(0.1)
            
        # If test was canceled
        if not self.is_running:
            EMGBridge.stop_stream()
            return False
            
        # Get data from bridge
        self.emg_data[phase_id]["rawData"] = EMGBridge.get_current_data()
        EMGBridge.stop_stream()
        return True
    
    def _run_rest_phase(self, phase_id, instruction, duration=30):
        """Run a rest phase"""
        displayInstructions(f"{instruction}")
        EMGBridge.start_stream()
        
        start_time = time.time()
        while time.time() - start_time < duration and self.is_running:
            progress = ((time.time() - start_time) / duration) * 100
            updateProgress(progress)
            time.sleep(0.1)
            
        if not self.is_running:
            EMGBridge.stop_stream()
            return False
            
        self.emg_data[phase_id]["rawData"] = EMGBridge.get_current_data()
        EMGBridge.stop_stream()
        return True
    
    def _run_submaximal_phase(self, phase_id, instruction, duration=10):
        """Run a submaximal contraction phase"""
        displayInstructions(f"{instruction} for {duration} seconds")
        EMGBridge.start_stream()
        
        start_time = time.time()
        while time.time() - start_time < duration and self.is_running:
            progress = ((time.time() - start_time) / duration) * 100
            updateProgress(progress)
            time.sleep(0.1)
            
        if not self.is_running:
            EMGBridge.stop_stream()
            return False
            
        self.emg_data[phase_id]["rawData"] = EMGBridge.get_current_data()
        EMGBridge.stop_stream()
        return True
    
    def _run_walking_phase(self, phase_id, instruction, duration=15):
        """Run a walking test phase"""
        displayInstructions(f"{instruction} for {duration} seconds")
        EMGBridge.start_stream()
        
        start_time = time.time()
        while time.time() - start_time < duration and self.is_running:
            progress = ((time.time() - start_time) / duration) * 100
            updateProgress(progress)
            time.sleep(0.1)
            
        if not self.is_running:
            EMGBridge.stop_stream()
            return False
            
        self.emg_data[phase_id]["rawData"] = EMGBridge.get_current_data()
        EMGBridge.stop_stream()
        return True
    
    def _process_results(self):
        """Process all collected data and calculate metrics"""
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
                
                # Add duration
                phase_data["duration"] = len(data_array)
    
    def stop_test(self):
        """Stop the current test"""
        self.is_running = False
        EMGBridge.stop_stream()
        displayInstructions("Test stopped")
        
    def get_results(self):
        """Return processed test results"""
        return self.emg_data

# Example usage
test = DynamicContractionTest()
`
            },
            {
                name: 'emg_signal_processing.py',
                size: '2.8 KB',
                content: `
import numpy as np
from scipy.signal import butter, filtfilt, iirnotch

# EMG Signal Processing Functions
# For EMG Dashboard Web Application

def butter_bandpass(lowcut, highcut, fs, order=4):
    """Design a butterworth bandpass filter"""
    nyq = 0.5 * fs
    low = lowcut / nyq
    high = highcut / nyq
    b, a = butter(order, [low, high], btype='band')
    return b, a

def apply_bandpass_filter(data, lowcut=20, highcut=450, fs=1000, order=4):
    """Apply a bandpass filter to EMG data"""
    b, a = butter_bandpass(lowcut, highcut, fs, order=order)
    return filtfilt(b, a, data)

def apply_notch_filter(data, notch_freq=50, fs=1000, quality_factor=30):
    """Apply a notch filter to remove power line interference"""
    b, a = iirnotch(notch_freq, quality_factor, fs)
    return filtfilt(b, a, data)

def remove_baseline(data, window_size=100):
    """Remove baseline drift from EMG data"""
    return data - np.convolve(data, np.ones(window_size)/window_size, mode='same')

def rectify_signal(data):
    """Full-wave rectification of EMG signal"""
    return np.abs(data)

def calculate_envelope(data, window_size=100):
    """Calculate the EMG envelope using moving average"""
    return np.convolve(rectify_signal(data), np.ones(window_size)/window_size, mode='same')

def calculate_rms(data, window_size=100):
    """Calculate RMS value with sliding window"""
    return np.sqrt(np.convolve(np.square(data), np.ones(window_size)/window_size, mode='same'))

def calculate_mav(data, window_size=100):
    """Calculate MAV (Mean Absolute Value) with sliding window"""
    return np.convolve(np.abs(data), np.ones(window_size)/window_size, mode='same')

def calculate_snr(data):
    """Calculate Signal-to-Noise Ratio"""
    signal_power = np.mean(np.square(data))
    noise_power = np.var(data)
    if noise_power == 0:
        return float('inf')
    return 10 * np.log10(signal_power / noise_power)

def process_emg_signal(data, fs=1000):
    """Complete EMG signal processing pipeline"""
    # Apply filters
    filtered_data = apply_bandpass_filter(data, fs=fs)
    filtered_data = apply_notch_filter(filtered_data, fs=fs)
    filtered_data = remove_baseline(filtered_data)
    
    # Calculate metrics
    rms_values = calculate_rms(filtered_data)
    mav_values = calculate_mav(filtered_data)
    envelope = calculate_envelope(filtered_data)
    snr = calculate_snr(filtered_data)
    
    return {
        'filtered_data': filtered_data,
        'rms_values': rms_values,
        'mav_values': mav_values,
        'envelope': envelope,
        'snr': snr,
        'max_amplitude': np.max(np.abs(filtered_data))
    }
`
            }
        ];

        this.init();
    }

    generateSampleEMGData(length, amplitude, frequency) {
        const data = [];
        const sampleRate = 1000; // 1000 Hz
        const noiseLevel = amplitude * 0.1;
        
        for (let i = 0; i < length; i++) {
            const time = i / sampleRate;
            // Generate EMG-like signal with multiple frequency components and noise
            let signal = 0;
            signal += amplitude * Math.sin(2 * Math.PI * frequency * time);
            signal += amplitude * 0.3 * Math.sin(2 * Math.PI * frequency * 2 * time);
            signal += amplitude * 0.1 * Math.sin(2 * Math.PI * frequency * 3 * time);
            // Add random noise
            signal += (Math.random() - 0.5) * noiseLevel;
            // Add some random spikes to simulate muscle activity
            if (Math.random() < 0.01) {
                signal += (Math.random() - 0.5) * amplitude * 0.5;
            }
            data.push(signal);
        }
        return data;
    }

    init() {
        this.loadSampleData();
        this.setupEventListeners();
        this.populateFormOptions();
        this.renderDashboard();
        this.updateBodyMap();
        this.populateScriptsList();
    }

    loadSampleData() {
        const stored = this.loadStoredSessions();     // NEW
        this.sessions = stored ?? [...this.sampleData.sessions];
        this.filteredSessions = [...this.sessions];
        this.scripts = [...this.sampleScripts];
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
        document.getElementById('search-sessions').addEventListener('input', (e) => {
            this.filterSessions();
        });
        
        document.getElementById('filter-muscle').addEventListener('change', (e) => {
            this.filterSessions();
        });
        
        document.getElementById('filter-electrode').addEventListener('change', (e) => {
            this.filterSessions();
        });

        // New test form
        document.getElementById('new-test-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNewTestSubmit();
        });

        document.getElementById('script-file').addEventListener('change', (e) => {
            this.handleScriptUpload(e.target.files[0]);
        });
        
        document.getElementById('script-select').addEventListener('change', () => {
            this.previewSelectedScript();          // live preview when user picks a file
        });


        document.getElementById('scan-devices').addEventListener('click', () => {
            this.scanForDevices();
        });

        document.getElementById('connect-device').addEventListener('click', () => {
            this.connectDevice();
        });

        document.getElementById('start-test').addEventListener('click', () => {
            this.startTest();
        });

        document.getElementById('pause-test').addEventListener('click', () => {
            this.pauseTest();
        });

        document.getElementById('stop-test').addEventListener('click', () => {
            this.stopTest();
        });

        // Session detail navigation
        document.getElementById('back-to-dashboard').addEventListener('click', () => {
            this.navigateTo('dashboard');
        });

        document.getElementById('export-session').addEventListener('click', () => {
            this.exportSession();
        });

        document.getElementById('delete-session').addEventListener('click', () => {
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

        // Body map legend items
        document.getElementById('muscle-legend').addEventListener('click', (e) => {
            const legendItem = e.target.closest('.legend-item');
            if (legendItem) {
                const muscle = legendItem.dataset.muscle;
                if (muscle) {
                    this.selectMuscle(muscle);
                }
            }
        });

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Modal controls
        document.getElementById('modal-close').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modal-cancel').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modal-confirm').addEventListener('click', () => {
            this.handleModalConfirm();
        });

        // Export all
        document.getElementById('export-all').addEventListener('click', () => {
            this.exportAllSessions();
        });

        // Scripts management
        document.getElementById('script-manager-file').addEventListener('change', (e) => {
            this.handleScriptManagerUpload(e.target.files);
        });

        document.getElementById('close-editor').addEventListener('click', () => {
            document.getElementById('script-editor').style.display = 'none';
        });

        document.getElementById('save-script').addEventListener('click', () => {
            this.saveCurrentScript();
        });

        document.getElementById('test-script').addEventListener('click', () => {
            this.testCurrentScript();
        });
    }

    populateFormOptions() {
        const muscleSelect          = document.getElementById('muscle-group');
        const electrodeSelect       = document.getElementById('electrode-type');
        const filterMuscleSelect    = document.getElementById('filter-muscle');
        const filterElectrodeSelect = document.getElementById('filter-electrode');
        const scriptSelect          = document.getElementById('script-select');   // NEW
    
        /* muscle groups */
        this.sampleData.muscleGroups.forEach(muscle => {
            const opt = document.createElement('option');
            opt.value = muscle;
            opt.textContent = muscle;
            muscleSelect.appendChild(opt.cloneNode(true));
            filterMuscleSelect.appendChild(opt.cloneNode(true));
        });
    
        /* electrode types */
        this.sampleData.electrodeTypes.forEach(type => {
            const opt = document.createElement('option');
            opt.value = type;
            opt.textContent = type;
            electrodeSelect.appendChild(opt.cloneNode(true));
            filterElectrodeSelect.appendChild(opt.cloneNode(true));
        });
    
        /* scripts */
        if (scriptSelect) {                                   // ← scripts list
            scriptSelect.innerHTML =
                '<option value="">-- choose script --</option>';
            this.scripts.forEach((s, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = s.name;
                scriptSelect.appendChild(opt);
            });
        }
        this.previewSelectedScript();
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

        document.getElementById('page-title').textContent = titles[view] || 'Dashboard';
        document.getElementById('breadcrumb').innerHTML = `<span>Home</span> > <span>${titles[view] || 'Dashboard'}</span>`;

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
        const searchTerm = document.getElementById('search-sessions').value.toLowerCase();
        const muscleFilter = document.getElementById('filter-muscle').value;
        const electrodeFilter = document.getElementById('filter-electrode').value;

        this.filteredSessions = this.sessions.filter(session => {
            const matchesSearch = !searchTerm || 
                session.subjectId.toLowerCase().includes(searchTerm) ||
                session.muscleGroup.toLowerCase().includes(searchTerm);
            
            const matchesMuscle = !muscleFilter || session.muscleGroup === muscleFilter;
            const matchesElectrode = !electrodeFilter || session.electrodeType === electrodeFilter;

            return matchesSearch && matchesMuscle && matchesElectrode;
        });

        this.renderDashboard();
    }

    renderDashboard() {
        const grid = document.getElementById('sessions-grid');
        grid.innerHTML = '';

        if (this.filteredSessions.length === 0) {
            grid.innerHTML = '<div class="text-center text-muted">No sessions found matching your criteria.</div>';
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
        card.addEventListener('click', () => this.viewSession(session.id));

        const date = new Date(session.timestamp).toLocaleDateString();
        const phases = Object.keys(session.testPhases);
        
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
                    <div class="session-info-value">${phases.length}</div>
                </div>
            </div>
            <div class="session-metrics">
                ${phases.map(phase => `<div class="metric-chip">${session.testPhases[phase].name}</div>`).join('')}
            </div>
        `;

        return card;
    }

    viewSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        this.currentSession = session;
        this.renderSessionDetail(session);
        this.navigateTo('session-detail');
    }

    renderSessionDetail(session) {
        const sessionInfo = document.getElementById('session-info');
        const date = new Date(session.timestamp).toLocaleDateString();

        sessionInfo.innerHTML = `
            <div class="session-metadata">
                <div class="metadata-item">
                    <div class="metadata-label">Session ID</div>
                    <div class="metadata-value">${session.id}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Date</div>
                    <div class="metadata-value">${date}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Subject ID</div>
                    <div class="metadata-value">${session.subjectId}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Muscle Group</div>
                    <div class="metadata-value">${session.muscleGroup}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Electrode Type</div>
                    <div class="metadata-value">${session.electrodeType}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Body Placement</div>
                    <div class="metadata-value">${session.bodyPlacement}</div>
                </div>
                <div class="metadata-item" style="grid-column: 1 / -1;">
                    <div class="metadata-label">Electrode Configuration</div>
                    <div class="metadata-value">${session.electrodeConfig}</div>
                </div>
            </div>
        `;

        // Initialize charts
        setTimeout(() => {
            this.renderSessionCharts(session);
        }, 100);
    }

    renderSessionCharts(session) {
        // Raw signals chart
        this.renderRawSignalChart(session);
        
        // Metrics chart
        this.renderMetricsChart(session);
        
        // Phases table
        this.renderPhasesTable(session);
    }

    renderRawSignalChart(session) {
        const canvas = document.getElementById('session-signal-chart');
        const ctx = canvas.getContext('2d');

        if (this.charts.sessionSignal) {
            this.charts.sessionSignal.destroy();
        }

        const datasets = [];
        const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F'];
        let colorIndex = 0;

        Object.values(session.testPhases).forEach(phase => {
            const timePoints = phase.rawData.map((_, index) => index);
            datasets.push({
                label: phase.name,
                data: phase.rawData.map((value, index) => ({ x: index, y: value })),
                borderColor: colors[colorIndex % colors.length],
                backgroundColor: colors[colorIndex % colors.length] + '20',
                fill: false,
                tension: 0.1,
                pointRadius: 0
            });
            colorIndex++;
        });

        this.charts.sessionSignal = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Raw EMG Signals'
                    },
                    legend: {
                        display: true
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        display: true,
                        title: {
                            display: true,
                            text: 'Time (ms)'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Amplitude (mV)'
                        }
                    }
                }
            }
        });
    }

    renderMetricsChart(session) {
        const canvas = document.getElementById('session-metrics-chart');
        const ctx = canvas.getContext('2d');

        if (this.charts.sessionMetrics) {
            this.charts.sessionMetrics.destroy();
        }

        const phases = Object.keys(session.testPhases);
        const metrics = ['rms', 'mav', 'snr', 'maxAmplitude'];
        const datasets = [];
        const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5'];

        metrics.forEach((metric, index) => {
            datasets.push({
                label: metric.toUpperCase(),
                data: phases.map(phase => session.testPhases[phase][metric]),
                backgroundColor: colors[index],
                borderColor: colors[index],
                borderWidth: 1
            });
        });

        this.charts.sessionMetrics = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: phases.map(phase => session.testPhases[phase].name),
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'EMG Metrics Comparison'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    }
                }
            }
        });
    }

    renderPhasesTable(session) {
        const container = document.getElementById('phases-table');
        const phases = Object.values(session.testPhases);

        container.innerHTML = `
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
                    ${phases.map(phase => `
                        <tr>
                            <td>${phase.name}</td>
                            <td>${phase.duration}</td>
                            <td>${phase.rms.toFixed(3)}</td>
                            <td>${phase.mav.toFixed(3)}</td>
                            <td>${phase.snr.toFixed(1)}</td>
                            <td>${phase.maxAmplitude.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });
    }

    handleScriptUpload(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const preview = document.getElementById('script-preview');
            const contentEl = document.getElementById('script-content');
            
            contentEl.textContent = content.substring(0, 500) + (content.length > 500 ? '...' : '');
            preview.classList.remove('hidden');
            
            this.showToast('Script uploaded successfully', 'success');
        };
        reader.readAsText(file);
    }

        // =================== 2.  SCAN FOR DEVICES  ===================
    // Replace the entire old scanForDevices() with the real BLE version.
    async scanForDevices() {
        const scanBtn    = document.getElementById('scan-devices');
        const deviceList = document.getElementById('device-list');
        const connectBtn = document.getElementById('connect-device');
    
        scanBtn.textContent = 'Scanning…';
        scanBtn.disabled    = true;
        deviceList.innerHTML = '';
        connectBtn.disabled = true;
    
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [this.EMG_SERVICE_UUID] }],
                optionalServices: [this.EMG_SERVICE_UUID]
            });
    
            // Populate single-select list with the chosen device
            const opt       = document.createElement('option');
            opt.value       = device.id;
            opt.textContent = `${device.name || 'Unnamed'} (${device.id})`;
            deviceList.appendChild(opt);
            deviceList.disabled = false;
    
            this.bluetoothDevice = device;
            connectBtn.disabled  = false;
            this.showToast('Device selected – click “Connect”', 'success');
        } catch (err) {
            this.showToast(`Scan cancelled: ${err.message}`, 'warning');
        } finally {
            scanBtn.textContent = 'Scan for Devices';
            scanBtn.disabled    = false;
        }
    }
    
    
        // =================== 3.  CONNECT TO DEVICE  ===================
    async connectDevice() {
        const connectBtn = document.getElementById('connect-device');
        const startBtn   = document.getElementById('start-test');
    
        if (!this.bluetoothDevice) return;
    
        connectBtn.textContent = 'Connecting…';
        connectBtn.disabled    = true;
    
        try {
            this.gattServer = await this.bluetoothDevice.gatt.connect();
            const service   = await this.gattServer.getPrimaryService(this.EMG_SERVICE_UUID);
            this.emgCharacteristic = await service.getCharacteristic(this.EMG_CHARACTERISTIC_UUID);
    
            connectBtn.textContent = 'Connected';
            connectBtn.classList.add('btn--success');
            startBtn.disabled = false;

            this.commandCharacteristic = await service.getCharacteristic(
                this.EMG_COMMAND_CHARACTERISTIC_UUID
            );
            this.showToast('BLE device connected', 'success');
        } catch (err) {
            connectBtn.textContent = 'Connect Device';
            connectBtn.disabled    = false;
            this.showToast(`Connection failed: ${err.message}`, 'error');
        }
        /* Already have:  this.emgCharacteristic = …  */
        /* NEW — also obtain the characteristic used for commands */
        

    }
    /* ---------------------------------------------------------
   Send a UTF-8 string (or Uint8Array) to the command handle
    --------------------------------------------------------- */
    async writeCommand(cmd) {
        if (!this.commandCharacteristic) {
            this.showToast('Command characteristic not available', 'error');
            return;
        }
        const data = (cmd instanceof Uint8Array) ? cmd
                   : new TextEncoder().encode(cmd);   // convert string → bytes
        await this.commandCharacteristic.writeValue(data);          // ← [3]
    }

    
    
        // =================== 4.  START / STOP TEST ===================
    // --- replace the startTest() body ---
    /* ========== 3.  startTest()  (now async) ========== */
    async startTest() {
        const form = document.getElementById('new-test-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
    
        /* ensure a script was picked */
        const sel = document.getElementById('script-select').value;
        if (sel === '') {
            this.showToast('Please pick an acquisition script first', 'error');
            return;
        }
        this.currentScript = this.scripts[parseInt(sel, 10)];
    
        /* run that Python file in Pyodide */
        await this.runPythonScript(this.currentScript);
    
        /* existing BLE start-up */
        this.testInProgress = true;
        document.getElementById('test-monitoring').style.display = 'block';
        document.getElementById('start-test').disabled = true;
        document.getElementById('pause-test').disabled = false;
        document.getElementById('stop-test').disabled  = false;
    
        this.initializeLiveChart();
        this.startBLEStream();
        this.showToast('Test started', 'success');
    }

    /* ========== 4.  Helper added just below startTest() ========== */
    /*  runPythonScript – replace the whole method */
    // inside EMGDashboard, replace the first lines of runPythonScript()
    async runPythonScript(script) {
        try {
            if (!window.pyodide) {
                const VER = '0.27.1';                                    // ← ONE source of truth
                this.showToast('Loading Python…', 'info');
                window.pyodide = await loadPyodide({
                    indexURL: `https://cdn.jsdelivr.net/pyodide/v${VER}/full/`
                });
            }
            /* ── NEW ── make BLE_DEVICE_ID visible to Python */
            if (this.bluetoothDevice) {
              window.pyodide.globals.set(
                'BLE_DEVICE_ID',                // variable name in Python
                this.bluetoothDevice.id         // value
              );                                // ← pyodide.globals example[5]
            }
    
            await window.pyodide.loadPackagesFromImports(script.content);

            if (this.bluetoothDevice) {
              /* make BLE_DEVICE_ID visible to Python */
              window.pyodide.globals.set('BLE_DEVICE_ID', this.bluetoothDevice.id);
            }
            
            /* execute the user’s file */
            await window.pyodide.runPythonAsync(script.content);
            
            /* ── NEW: if the script created a global called “test”, run it now ── */
            await window.pyodide.runPythonAsync(`
            import asyncio, inspect, js
            
            if "test" in globals():
                tgt = globals()["test"]
            
                # connect if a connect_device() method exists
                if hasattr(tgt, "connect_device") and "BLE_DEVICE_ID" in globals():
                    tgt.connect_device(BLE_DEVICE_ID)
            
                # run the test in a background task so the browser stays responsive
                if hasattr(tgt, "run_test") and inspect.isroutine(tgt.run_test):
                    asyncio.create_task(
                        asyncio.to_thread(tgt.run_test)   # off-load the blocking loop
                    )
            `);

        
    
            this.showToast(`Script “${script.name}” running`, 'success');
        } catch (err) {
            console.error(err);
            this.showToast(`Script error: ${err.message}`, 'error');
        }
    }


    /* ---------- persistence helpers ---------- */
    saveSessions() {
        try {
            localStorage.setItem('emg_sessions', JSON.stringify(this.sessions));
        } catch (e) {
            this.showToast('Failed to save sessions: ' + e.message, 'error');
        }
    }
    
    loadStoredSessions() {
        const raw = localStorage.getItem('emg_sessions');
        return raw ? JSON.parse(raw) : null;
    }


    /* 3 ▸ NEW helper (place it anywhere in the class) */
    previewSelectedScript() {
        const sel       = document.getElementById('script-select').value;
        const preview   = document.getElementById('script-preview');   // already in HTML[1]
        const contentEl = document.getElementById('script-content');   // already in HTML[1]
    
        if (sel === '') {                  // nothing chosen → hide box
            preview.classList.add('hidden');
            contentEl.textContent = '';
            return;
        }
    
        const script  = this.scripts[parseInt(sel, 10)];
        const snippet = script.content.slice(0, 1000) +
                       (script.content.length > 500 ? ' …' : '');
    
        contentEl.textContent = snippet;
        preview.classList.remove('hidden');
    }


    // --- NEW helpers ---
    async startBLEStream() {
        if (!this.emgCharacteristic) {
            this.showToast('No characteristic – connect first', 'error');
            return;
        }
        /* ── NEW ── send the command that tells the sensor to begin streaming */
        try {
            await this.writeCommand('start');          // ASCII 0x73 0x74 0x61 0x72 0x74
            this.showToast('“start” command sent', 'info');
        } catch(err) {
            this.showToast('Failed to send start command: ' + err.message, 'error');
            return;
        }
    
        this.emgBuffer = [];
        await this.emgCharacteristic.startNotifications();
        this.emgCharacteristic.addEventListener(
            'characteristicvaluechanged', this.onBLEData.bind(this)
        );
    }
    
    onBLEData(event) {
        // Example: little-endian signed 16-bit samples
        const dv = event.target.value;
        for (let i = 0; i < dv.byteLength; i += 2) {
            const sample = dv.getInt16(i, true) / 1000; // scale to mV
            this.emgBuffer.push(sample);
    
            // Push into chart
            const data = this.liveChart.data;
            data.labels.push(data.labels.length);
            data.datasets[0].data.push(sample);
            if (data.labels.length > 1000) {    // keep last 1000 pts
                data.labels.shift();
                data.datasets[0].data.shift();
            }
        }
        this.liveChart.update('none');
    }
    
    // --- replace stopTest() so it turns the stream off ---
    async stopTest() {
        this.testInProgress = false;
        document.getElementById('test-monitoring').style.display = 'none';
        document.getElementById('start-test').disabled = false;
        document.getElementById('pause-test').disabled = true;
        document.getElementById('stop-test').disabled  = true;
    
        if (this.emgCharacteristic) {
            try { await this.emgCharacteristic.stopNotifications(); } catch {}
            this.emgCharacteristic.removeEventListener(
                'characteristicvaluechanged', this.onBLEData.bind(this)
            );
        }
        this.showToast('Test stopped', 'warning');
    }

    initializeLiveChart() {
        const canvas = document.getElementById('live-chart');
        const ctx = canvas.getContext('2d');

        if (this.liveChart) {
            this.liveChart.destroy();
        }

        this.liveChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Live EMG Signal',
                    data: [],
                    borderColor: '#1FB8CD',
                    backgroundColor: '#1FB8CD20',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        type: 'linear',
                        display: true,
                        title: {
                            display: true,
                            text: 'Time (ms)'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Amplitude (mV)'
                        },
                        min: -2,
                        max: 2
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Live EMG Signal Monitoring'
                    }
                }
            }
        });
    }


    completeTest() {
        this.testInProgress = false;
        document.getElementById('test-status').textContent = 'Test Completed';
        document.getElementById('start-test').disabled = false;
        document.getElementById('pause-test').disabled = true;
        document.getElementById('stop-test').disabled = true;

        // ----------  REPLACE everything from “// Create new session …” down ----------
        /* 1.  Pull live data that was collected since startBLEStream() */
        const rawData = this.emgBuffer.slice();      // deep copy
        
        /* 2.  Basic metrics in JS – keep it if you don’t rely on Python */
        const metrics = this.calculateMetrics(rawData);
        
        /* 3.  If your Python script stored richer results in the global
               namespace, merge them in (they win on key collisions):     */
        let pyMetrics = {};
        try {
            pyMetrics = window.pyodide ?
                window.pyodide.globals.get('RESULTS').toJs() : {};
        } catch { /* RESULTS not set – ignore */ }
        
        const newSession = {
            id: `emg-${String(this.sessions.length + 1).padStart(3, '0')}`,
            timestamp: new Date().toISOString(),
            subjectId: formData.get('subject-id') || document.getElementById('subject-id').value,
            muscleGroup: document.getElementById('muscle-group').value,
            bodyPlacement: document.getElementById('body-placement').value,
            electrodeType: document.getElementById('electrode-type').value,
            electrodeConfig: document.getElementById('electrode-config').value,
        
            /* one-phase example; expand if your acquisition script splits phases */
            testPhases: {
                main: Object.assign(
                    {
                        name: 'Full Recording',
                        duration: rawData.length      // samples (1 kHz = ms)
                    },
                    metrics,
                    pyMetrics,
                    { rawData }
                )
            }
        };
        
        this.sessions.push(newSession);
        this.filteredSessions = [...this.sessions];
        this.updateBodyMap();
        this.saveSessions();             // persists to localStorage
        
        this.showToast('Test completed and saved', 'success');
        
        /* optional: clear the buffer so the next test starts clean */
        this.emgBuffer = [];
        
        /* jump to the detail page */
        setTimeout(() => this.viewSession(newSession.id), 800);

    }

    pauseTest() {
        this.testInProgress = false;
        document.getElementById('start-test').disabled = false;
        document.getElementById('pause-test').disabled = true;
        this.showToast('Test paused', 'info');
    }

    stopTest() {
        this.testInProgress = false;
        document.getElementById('test-monitoring').style.display = 'none';
        document.getElementById('start-test').disabled = false;
        document.getElementById('pause-test').disabled = true;
        document.getElementById('stop-test').disabled = true;
        this.showToast('Test stopped', 'warning');
    }
    calculateMetrics(samples) {
        if (!samples.length) return { rms: 0, mav: 0, snr: 0, maxAmplitude: 0 };
    
        const n   = samples.length;
        const abs = samples.map(Math.abs);
    
        const rms = Math.sqrt(samples.reduce((s, v) => s + v * v, 0) / n);
        const mav = abs.reduce((s, v) => s + v, 0) / n;
        const max = Math.max(...abs);
    
        const mean  = samples.reduce((s, v) => s + v, 0) / n;
        const std   = Math.sqrt(samples.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
        const snr   = std ? 20 * Math.log10(Math.abs(mean / std)) : 0;
    
        return { rms, mav, snr, maxAmplitude: max };
    }

    renderComparisonView() {
        const selector = document.getElementById('comparison-selector');
        selector.innerHTML = '';

        this.sessions.forEach(session => {
            const checkbox = document.createElement('div');
            checkbox.className = 'session-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" id="compare-${session.id}" value="${session.id}">
                <label for="compare-${session.id}">
                    <strong>${session.id}</strong> - ${session.subjectId} (${session.muscleGroup})
                    <br><small>${new Date(session.timestamp).toLocaleDateString()}</small>
                </label>
            `;
            
            const input = checkbox.querySelector('input');
            input.addEventListener('change', () => this.updateComparison());
            
            selector.appendChild(checkbox);
        });
    }

    updateComparison() {
        const selectedIds = Array.from(document.querySelectorAll('#comparison-selector input:checked')).map(cb => cb.value);
        const chartsContainer = document.getElementById('comparison-charts');
        
        if (selectedIds.length < 2) {
            chartsContainer.style.display = 'none';
            return;
        }

        chartsContainer.style.display = 'block';
        this.renderComparisonCharts(selectedIds);
    }

    renderComparisonCharts(sessionIds) {
        const sessions = sessionIds.map(id => this.sessions.find(s => s.id === id));
        
        // Signal comparison
        this.renderComparisonSignalChart(sessions);
        
        // Metrics comparison
        this.renderComparisonMetricsChart(sessions);
    }

    renderComparisonSignalChart(sessions) {
        const canvas = document.getElementById('comparison-signal-chart');
        const ctx = canvas.getContext('2d');

        if (this.charts.comparisonSignal) {
            this.charts.comparisonSignal.destroy();
        }

        const datasets = [];
        const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F'];
        
        sessions.forEach((session, sessionIndex) => {
            // Use MVC1 data for comparison
            if (session.testPhases.mvc1) {
                const phase = session.testPhases.mvc1;
                datasets.push({
                    label: `${session.id} - ${phase.name}`,
                    data: phase.rawData.slice(0, 1000).map((value, index) => ({ x: index, y: value })),
                    borderColor: colors[sessionIndex % colors.length],
                    backgroundColor: colors[sessionIndex % colors.length] + '20',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                });
            }
        });

        this.charts.comparisonSignal = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Signal Comparison (MVC 1 - First 1000ms)'
                    }
                },
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
                }
            }
        });
    }

    renderComparisonMetricsChart(sessions) {
        const canvas = document.getElementById('comparison-metrics-chart');
        const ctx = canvas.getContext('2d');

        if (this.charts.comparisonMetrics) {
            this.charts.comparisonMetrics.destroy();
        }

        const metrics = ['rms', 'mav', 'snr', 'maxAmplitude'];
        const datasets = [];
        const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5'];

        metrics.forEach((metric, index) => {
            datasets.push({
                label: metric.toUpperCase(),
                data: sessions.map(session => 
                    session.testPhases.mvc1 ? session.testPhases.mvc1[metric] : 0
                ),
                backgroundColor: colors[index],
                borderColor: colors[index],
                borderWidth: 1
            });
        });

        this.charts.comparisonMetrics = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sessions.map(session => session.id),
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Metrics Comparison (MVC 1)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    }
                }
            }
        });
    }

    selectMuscle(muscle) {
        // Update body map selection
        document.querySelectorAll('.muscle-region').forEach(region => {
            region.classList.toggle('selected', region.dataset.muscle === muscle);
        });

        this.selectedMuscle = muscle;
        
        // Filter dashboard by selected muscle
        document.getElementById('filter-muscle').value = muscle;
        this.filterSessions();
        
        // Switch to dashboard view
        this.navigateTo('dashboard');
        
        this.showToast(`Filtered by ${muscle}`, 'info');
    }

    updateBodyMap() {
        const musclesWithData = [...new Set(this.sessions.map(s => s.muscleGroup))];
        const legendContainer = document.getElementById('muscle-legend');
        
        // Update muscle regions
        document.querySelectorAll('.muscle-region').forEach(region => {
            const muscle = region.dataset.muscle;
            region.classList.toggle('has-data', musclesWithData.includes(muscle));
        });

        // Update legend
        legendContainer.innerHTML = '';
        this.sampleData.muscleGroups.forEach(muscle => {
            const hasData = musclesWithData.includes(muscle);
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.dataset.muscle = muscle;
            item.innerHTML = `
                <div class="legend-color" style="background-color: ${hasData ? '#21808D' : '#ccc'}"></div>
                <span>${muscle} ${hasData ? `(${this.sessions.filter(s => s.muscleGroup === muscle).length})` : ''}</span>
            `;
            legendContainer.appendChild(item);
        });
    }

    exportSession() {
        if (!this.currentSession) return;

        const data = JSON.stringify(this.currentSession, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `emg-session-${this.currentSession.id}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Session exported', 'success');
    }

    exportAllSessions() {
        const data = JSON.stringify(this.sessions, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'emg-all-sessions.json';
        a.click();
        
        URL.revokeObjectURL(url);
        this.showToast('All sessions exported', 'success');
    }

    showDeleteConfirmation() {
        this.showModal(
            'Delete Session',
            `Are you sure you want to delete session ${this.currentSession.id}? This action cannot be undone.`,
            () => this.deleteCurrentSession()
        );
    }

    deleteCurrentSession() {
        if (!this.currentSession) return;

        const index = this.sessions.findIndex(s => s.id === this.currentSession.id);
        if (index > -1) {
            this.sessions.splice(index, 1);
            this.filteredSessions = [...this.sessions];
            this.updateBodyMap();
            this.showToast('Session deleted', 'success');
            this.navigateTo('dashboard');
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-color-scheme', newTheme);
        
        const icon = document.querySelector('#theme-toggle i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    showModal(title, message, onConfirm) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = `<p>${message}</p>`;
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

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    handleNewTestSubmit() {
        // Form validation is handled by HTML5 required attributes
        this.showToast('Test metadata saved. Connect device to start test.', 'success');
    }

    populateScriptsList() {
        const scriptsList = document.getElementById('scripts-list');
        scriptsList.innerHTML = '';

        if (this.scripts.length === 0) {
            scriptsList.innerHTML = '<div class="text-center text-muted">No Python scripts uploaded yet.</div>';
            return;
        }

        this.scripts.forEach((script, index) => {
            const item = document.createElement('div');
            item.className = 'script-item';
            item.innerHTML = `
                <div class="script-info">
                    <div class="script-name">${script.name}</div>
                    <div class="script-size">${script.size}</div>
                </div>
                <div class="script-actions">
                    <button class="btn btn--outline" data-action="edit" data-index="${index}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn--outline" data-action="delete" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            const editBtn = item.querySelector('[data-action="edit"]');
            editBtn.addEventListener('click', () => this.editScript(index));

            const deleteBtn = item.querySelector('[data-action="delete"]');
            deleteBtn.addEventListener('click', () => this.confirmDeleteScript(index));

            scriptsList.appendChild(item);
        });
    }

    handleScriptManagerUpload(files) {
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            // Add script to list
            this.scripts.push({
                name: file.name,
                size: this.formatFileSize(file.size),
                content: 'Loading...'
            });

            // Read file content
            const reader = new FileReader();
            reader.onload = (e) => {
                const index = this.scripts.findIndex(s => s.name === file.name && s.content === 'Loading...');
                if (index > -1) {
                    this.scripts[index].content = e.target.result;
                }
            };
            reader.readAsText(file);
        });

        this.populateScriptsList();
        this.populateFormOptions();   // keep the dropdown in sync
        this.showToast(`${files.length} script(s) uploaded`, 'success');
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    editScript(index) {
        const script = this.scripts[index];
        const editor = document.getElementById('script-editor');
        const codeArea = document.getElementById('script-code');

        editor.style.display = 'block';
        editor.dataset.scriptIndex = index;
        codeArea.value = script.content;
    }

    saveCurrentScript() {
        const editor = document.getElementById('script-editor');
        const codeArea = document.getElementById('script-code');
        const index = parseInt(editor.dataset.scriptIndex);

        if (!isNaN(index) && index >= 0 && index < this.scripts.length) {
            this.scripts[index].content = codeArea.value;
            this.showToast('Script saved', 'success');
        }
    }

    testCurrentScript() {
        this.showToast('Script test simulation started', 'info');
        
        // Simulate script testing with a timeout
        setTimeout(() => {
            this.showToast('Script executed successfully', 'success');
        }, 1500);
    }

    confirmDeleteScript(index) {
        const script = this.scripts[index];
        this.showModal(
            'Delete Script',
            `Are you sure you want to delete "${script.name}"? This action cannot be undone.`,
            () => this.deleteScript(index)
        );
    }

    deleteScript(index) {
        this.scripts.splice(index, 1);
        this.populateScriptsList();
        document.getElementById('script-editor').style.display = 'none';
        this.showToast('Script deleted', 'success');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new EMGDashboard();  
});


// =================== 6.  OPTIONAL – PYODIDE BRIDGE  ===================
//  (Add after the class so Python scripts keep working)
window.EMGBridge = {
    start_stream: (cb) => {
        if (!dashboard.emgCharacteristic) return;
        const handler = (e) => {
            const arr = new Int16Array(e.target.value.buffer);
            cb(arr);
        };
        dashboard.emgCharacteristic.addEventListener(
            'characteristicvaluechanged', handler);
        dashboard.emgCharacteristic.startNotifications();
        window._pyHandler = handler;
    },
    stop_stream: () => {
        if (dashboard.emgCharacteristic && window._pyHandler) {
            dashboard.emgCharacteristic.stopNotifications();
            dashboard.emgCharacteristic.removeEventListener(
                'characteristicvaluechanged', window._pyHandler);
        }
    },
    connect_device: async (device_id) => {
      /* if script passes an empty string, fall back to the device we already connected */
        const wanted = device_id || (dashboard.bluetoothDevice && dashboard.bluetoothDevice.id);
    
      /* simple check – return True only if the requested id matches the current one */
        if (!wanted) return false;
        return dashboard.bluetoothDevice && dashboard.bluetoothDevice.id === wanted;
    },

    get_current_data: () => dashboard.emgBuffer.slice()

    
};
/* =====  Instruction & progress helpers visible to Pyodide ===== */
window.displayInstructions = (msg) => {
  const box = document.getElementById('test-instructions');
  if (box) box.textContent = msg;
};


window.updateProgress = (percent) => {
    const bar = document.getElementById('test-progress');
    if (bar)  bar.value = Math.min(Math.max(percent, 0), 100);
};


