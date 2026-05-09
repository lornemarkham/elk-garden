import type {
  InventoryItem,
  CapabilityCard,
  ProjectCard,
  LearningStep,
  AmbitionModeDef,
} from '../../types/inventory'

// ---------------------------------------------------------------------------
// ELK Garden / Maker Lab Inventory
// Based on actual hardware in the ELK Lab.
// All costs in CAD. estimatedCost is per-unit price.
// capabilityTags describe what the item enables — used for capability analysis.
// ---------------------------------------------------------------------------

export const MOCK_INVENTORY: InventoryItem[] = [

  // ==========================================================================
  // CORE COMPUTE / CONTROLLERS
  // ==========================================================================

  {
    id: 'arduino-mega',
    name: 'Arduino Mega 2560 Board',
    category: 'boards-controllers',
    quantity: 1,
    status: 'owned',
    phase: 'learn',
    priority: 'useful',
    notes: 'High pin-count AVR board. Great for learning digital/analog I/O, included in the Elegoo starter kit. Many tutorials and community resources.',
    estimatedCost: 25,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['electronics-learning', 'GPIO-control', 'sensor-reading', 'relay-control', 'prototyping', 'robotics'],
  },
  {
    id: 'esp32-dev-board',
    name: 'ESP32 Development Board',
    category: 'boards-controllers',
    quantity: 1,
    status: 'owned',
    phase: 'prototype',
    priority: 'critical',
    notes: 'The core of the future sensor network. WiFi + BLE built in. Reads soil sensors and transmits wirelessly to the local dashboard.',
    estimatedCost: 12,
    currency: 'CAD',
    costConfidence: 'estimated',
    purchaseSource: 'Amazon.ca',
    capabilityTags: ['wireless-comms', 'sensor-reading', 'WiFi-IoT', 'soil-sensing', 'automation', 'edge-compute'],
    dependencyIds: ['breadboards', 'dupont-jumper-wires'],
  },

  // ==========================================================================
  // EDGE COMPUTE — Raspberry Pi Systems
  // ==========================================================================

  {
    id: 'raspberry-pi-5',
    name: 'Raspberry Pi 5',
    category: 'edge-compute',
    quantity: 1,
    status: 'owned',
    phase: 'deploy',
    priority: 'useful',
    notes: 'Primary local server candidate. Run a Node/Python dashboard, act as a WiFi hub for ESP32 nodes, or host Home Assistant. Full Linux with GPIO.',
    estimatedCost: 90,
    currency: 'CAD',
    costConfidence: 'estimated',
    purchaseSource: 'PiShop.ca',
    capabilityTags: ['local-server', 'dashboard', 'edge-compute', 'GPIO-control', 'Home-Assistant', 'AI-edge', 'SDR'],
  },
  {
    id: 'raspberry-pi-4',
    name: 'Raspberry Pi 4 Model B',
    category: 'edge-compute',
    quantity: 1,
    status: 'owned',
    phase: 'deploy',
    priority: 'useful',
    notes: 'Secondary Pi — good for dedicated Home Assistant instance, a development server, or a permanent sensor hub leaving the Pi 5 free for other tasks.',
    estimatedCost: 75,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['local-server', 'Home-Assistant', 'edge-compute', 'GPIO-control', 'dashboard'],
  },
  {
    id: 'raspberry-pi-monitor-workstation',
    name: 'Raspberry Pi Monitor Workstation',
    category: 'infrastructure',
    quantity: 1,
    status: 'owned',
    phase: 'deploy',
    priority: 'useful',
    notes: 'Dedicated Pi workstation with display. Use as an embedded kiosk for the garden dashboard, a development station, or a permanent project monitoring screen.',
    estimatedCost: 150,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['dashboard', 'kiosk', 'dev-station', 'monitoring'],
  },
  {
    id: 'raspberry-pi-gpio-breakout',
    name: 'Raspberry Pi GPIO Breakout + Ribbon Cable',
    category: 'wiring-prototyping',
    quantity: 1,
    status: 'owned',
    phase: 'prototype',
    priority: 'useful',
    notes: 'Breaks out 40-pin GPIO to a breadboard-friendly format. Essential for Pi sensor projects on a desk before mounting.',
    estimatedCost: 15,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['GPIO-control', 'prototyping'],
    dependencyIds: ['breadboards'],
  },

  // ==========================================================================
  // VISION / MONITORING
  // ==========================================================================

  {
    id: 'eufy-ai-camera',
    name: 'Eufy AI Security Camera System',
    category: 'vision-monitoring',
    quantity: 1,
    status: 'owned',
    phase: 'deploy',
    priority: 'useful',
    notes: 'AI-capable camera with motion detection and remote access. Candidates for garden monitoring, timelapse, wildlife detection, and future plant health analysis.',
    estimatedCost: 300,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['AI-vision', 'motion-detect', 'remote-monitoring', 'timelapse', 'wildlife-detect', 'garden-monitoring'],
  },

  // ==========================================================================
  // EDUCATION / LEARNING KITS
  // ==========================================================================

  {
    id: 'elegoo-starter-kit',
    name: 'Elegoo Arduino Mega Starter Kit',
    category: 'education-references',
    quantity: 1,
    status: 'owned',
    phase: 'learn',
    priority: 'useful',
    notes: 'Complete electronics learning kit with structured tutorials, 50+ components, and guided projects. The fastest path from zero to working sensor circuits.',
    estimatedCost: 120,
    currency: 'CAD',
    costConfidence: 'estimated',
    purchaseSource: 'Amazon.ca',
    capabilityTags: ['electronics-learning', 'prototyping', 'sensor-reading', 'relay-control', 'automation'],
  },
  {
    id: 'freenove-rpi-car-kit',
    name: 'Freenove Raspberry Pi Robot Car Kit',
    category: 'robotics',
    quantity: 1,
    status: 'owned',
    phase: 'learn',
    priority: 'optional',
    notes: 'Hands-on Pi robotics platform. Motor control, camera integration, autonomous navigation patterns, and real Python GPIO practice.',
    estimatedCost: 120,
    currency: 'CAD',
    costConfidence: 'estimated',
    purchaseSource: 'Amazon.ca',
    capabilityTags: ['robotics', 'motor-control', 'autonomous-nav', 'AI-robotics', 'GPIO-control', 'electronics-learning'],
  },

  // ==========================================================================
  // ROBOTICS / MOTION CONTROL
  // ==========================================================================

  {
    id: 'servo-motors',
    name: 'Servo Motors (SG90)',
    category: 'motion-control',
    quantity: 2,
    status: 'owned',
    phase: 'prototype',
    priority: 'optional',
    notes: 'Small positional motors. Vent control, selective covers, valve mechanisms, or trigger systems. 180-degree range with PWM control.',
    estimatedCost: 20,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['motor-control', 'robotics', 'valve-control', 'automation'],
  },
  {
    id: 'dc-motors-fans',
    name: 'DC Motors + Fan Components',
    category: 'motion-control',
    quantity: 1,
    status: 'owned',
    phase: 'prototype',
    priority: 'optional',
    notes: 'Assorted DC motors and fan components. Ventilation systems, cooling, small conveyors, or airflow control in greenhouse/grow setups.',
    estimatedCost: 25,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['motor-control', 'airflow', 'ventilation', 'robotics', 'cooling'],
  },

  // ==========================================================================
  // SENSORS
  // ==========================================================================

  {
    id: 'capacitive-soil-moisture-sensors',
    name: 'Capacitive Soil Moisture Sensors v1.2',
    category: 'sensors',
    quantity: 3,
    status: 'owned',
    phase: 'prototype',
    priority: 'critical',
    notes: 'The core garden sensor. Capacitive type prevents corrosion. Reads 0–100% analog signal. One per zone planned.',
    relatedGoals: ['soil-monitoring'],
    estimatedCost: 6,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['soil-sensing', 'environmental-monitoring', 'irrigation-control', 'automation'],
    dependencyIds: ['esp32-dev-board'],
  },
  {
    id: 'waterproof-temp-probe',
    name: 'Waterproof Temperature Probe (DS18B20)',
    category: 'sensors',
    quantity: 1,
    status: 'owned',
    phase: 'prototype',
    priority: 'useful',
    notes: 'Digital 1-Wire sensor accurate to ±0.5°C. Bury in soil, place in water tank, or monitor ambient bed temperature.',
    estimatedCost: 8,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['temperature-monitoring', 'soil-sensing', 'environmental-monitoring'],
  },
  {
    id: 'hc-sr04-ultrasonic',
    name: 'HC-SR04 Ultrasonic Distance Sensors',
    category: 'sensors',
    quantity: 2,
    status: 'owned',
    phase: 'prototype',
    priority: 'useful',
    notes: 'Measures distance via ultrasound (2cm–400cm). Tank level monitoring, obstacle detection for robotics, proximity triggers.',
    estimatedCost: 10,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['distance-sensing', 'tank-level', 'obstacle-detect', 'robotics', 'automation'],
  },
  {
    id: 'dht22-sensor',
    name: 'DHT22 AM2302 Temperature + Humidity Sensors',
    category: 'sensors',
    quantity: 3,
    status: 'owned',
    phase: 'prototype',
    priority: 'critical',
    notes: 'Accurate digital air temp + humidity. Ambient monitoring near garden beds, inside a greenhouse, or in an enclosure to track conditions.',
    estimatedCost: 10,
    currency: 'CAD',
    costConfidence: 'estimated',
    purchaseSource: 'Amazon.ca',
    capabilityTags: ['temperature-monitoring', 'humidity-monitoring', 'greenhouse-monitoring', 'environmental-monitoring', 'weather-systems'],
  },

  // ==========================================================================
  // SMART HOME / AUTOMATION
  // ==========================================================================

  {
    id: 'relay-module-2ch',
    name: '2-Channel DC 5V Relay Module (2-pack)',
    category: 'automation',
    quantity: 2,
    status: 'owned',
    phase: 'automate',
    priority: 'critical',
    notes: 'Optocoupler-isolated relay. Controls high-voltage devices (pumps, valves, lights) from a 5V microcontroller signal. Requires a dedicated PSU for sustained loads.',
    relatedGoals: ['irrigation-automation'],
    estimatedCost: 8,
    currency: 'CAD',
    costConfidence: 'estimated',
    purchaseSource: 'Amazon.ca',
    capabilityTags: ['relay-control', 'irrigation-control', 'automation', 'pump-control', 'light-control'],
    dependencyIds: ['esp32-dev-board', 'power-supply-5v12v'],
  },
  {
    id: 'aqara-sensors',
    name: 'Aqara Motion Sensor + Smart Home Hub',
    category: 'smart-home',
    quantity: 1,
    status: 'owned',
    phase: 'optimize',
    priority: 'optional',
    notes: 'Zigbee-based motion sensing and smart home orchestration. Potential integration bridge into Home Assistant for occupancy-based automations.',
    estimatedCost: 40,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['motion-detect', 'smart-home', 'Home-Assistant', 'occupancy-sensing', 'automation'],
  },
  {
    id: 'home-assistant-hub',
    name: 'Home Assistant Setup + Smart Home Components',
    category: 'smart-home',
    quantity: 1,
    status: 'owned',
    phase: 'deploy',
    priority: 'useful',
    notes: 'Home Assistant running on local hardware. Orchestrates sensors, automations, and dashboards. Future: ELK Garden can integrate with HA for unified home + garden control.',
    estimatedCost: 100,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['Home-Assistant', 'smart-home', 'automation', 'sensor-orchestration', 'dashboard', 'event-automation'],
  },

  // ==========================================================================
  // WIRING / PROTOTYPING
  // ==========================================================================

  {
    id: 'breadboards',
    name: 'Breadboards (half-size)',
    category: 'wiring-prototyping',
    quantity: 3,
    status: 'owned',
    phase: 'learn',
    priority: 'critical',
    notes: 'Core prototyping hardware. All sensor circuit testing happens here before any soldering or permanent wiring.',
    estimatedCost: 8,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['prototyping', 'electronics-learning', 'rapid-prototyping'],
  },
  {
    id: 'dupont-jumper-wires',
    name: 'Dupont Jumper Wires (assorted sets)',
    category: 'wiring-prototyping',
    quantity: 1,
    status: 'owned',
    phase: 'learn',
    priority: 'critical',
    notes: 'M-M, M-F, F-F sets. The basic connective tissue of all prototype circuits. Have plenty.',
    estimatedCost: 20,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['prototyping', 'circuit-connections'],
  },
  {
    id: 'resistor-assortment',
    name: 'Resistor Assortment Kit',
    category: 'components',
    quantity: 1,
    status: 'owned',
    phase: 'learn',
    priority: 'useful',
    notes: 'Common values for LED protection, pull-up/pull-down resistors, voltage dividers, and current limiting.',
    estimatedCost: 20,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['electronics-learning', 'prototyping', 'voltage-control'],
  },
  {
    id: 'capacitor-assortments',
    name: 'Capacitor Assortment Kit',
    category: 'components',
    quantity: 1,
    status: 'owned',
    phase: 'learn',
    priority: 'useful',
    notes: 'Electrolytic and ceramic capacitors in common values. Power smoothing, decoupling, timing circuits, and filter stages.',
    estimatedCost: 20,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['electronics-learning', 'power-smoothing', 'timing-circuits', 'prototyping'],
  },
  {
    id: 'prototype-boards',
    name: 'Prototype / Perfboards',
    category: 'wiring-prototyping',
    quantity: 5,
    status: 'owned',
    phase: 'prototype',
    priority: 'useful',
    notes: 'For making semi-permanent circuits once breadboard testing is done. Soldered prototypes that can be mounted.',
    estimatedCost: 2,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['prototyping', 'circuit-assembly'],
  },
  {
    id: 'leds-assortment',
    name: 'LED Assortment (mixed colors)',
    category: 'wiring-prototyping',
    quantity: 1,
    status: 'owned',
    phase: 'learn',
    priority: 'useful',
    notes: 'Standard 5mm LEDs. The "Hello World" of electronics. Status indicators in any project.',
    estimatedCost: 6,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['electronics-learning', 'status-indicators', 'prototyping'],
  },
  {
    id: 'buttons-tactile',
    name: 'Tactile Push Buttons',
    category: 'user-input',
    quantity: 1,
    status: 'owned',
    phase: 'learn',
    priority: 'useful',
    notes: 'Standard momentary switches. Learn digital input, debouncing, interrupt handling. Useful as manual overrides in automation projects.',
    estimatedCost: 5,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['user-input', 'electronics-learning', 'manual-override', 'prototyping'],
  },
  {
    id: 'buzzers',
    name: 'Buzzers (active + passive)',
    category: 'wiring-prototyping',
    quantity: 2,
    status: 'owned',
    phase: 'learn',
    priority: 'optional',
    notes: 'Audio output for alerts and notifications. Useful in sensor projects for threshold alarms.',
    estimatedCost: 2,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['alerts', 'electronics-learning'],
  },
  {
    id: 'lcd-display-modules',
    name: 'LCD Display Modules (16×2 + I2C adapter)',
    category: 'wiring-prototyping',
    quantity: 1,
    status: 'owned',
    phase: 'learn',
    priority: 'optional',
    notes: 'Display sensor readings locally on a standalone node — no network required. Good for field-testing a sensor node before it goes into a dashboard.',
    estimatedCost: 8,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['display', 'electronics-learning', 'standalone-ui'],
  },

  // ==========================================================================
  // USER INPUT
  // ==========================================================================

  {
    id: 'joystick-module',
    name: 'Joystick Module (2-axis + button)',
    category: 'user-input',
    quantity: 1,
    status: 'owned',
    phase: 'learn',
    priority: 'optional',
    notes: 'Analog 2-axis input with centre button. Robotics control interfaces, menu navigation, or learning analog ADC reads.',
    estimatedCost: 15,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['user-input', 'robotics', 'analog-control', 'electronics-learning'],
  },
  {
    id: 'keypad-remote-modules',
    name: 'Matrix Keypad + IR Remote Receiver',
    category: 'user-input',
    quantity: 1,
    status: 'owned',
    phase: 'learn',
    priority: 'optional',
    notes: 'Matrix keypad for PIN/menu systems and IR receiver for remote-triggered actions. Useful for manual overrides in automation systems.',
    estimatedCost: 15,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['user-input', 'PIN-systems', 'remote-control', 'electronics-learning', 'manual-override'],
  },

  // ==========================================================================
  // POWER
  // ==========================================================================

  {
    id: 'usb-power-adapters',
    name: 'USB Power Adapters + Cables',
    category: 'power',
    quantity: 4,
    status: 'owned',
    phase: 'prototype',
    priority: 'useful',
    notes: '5V USB power for Pi, ESP32, and breadboard prototypes. Not weatherproof — indoor/lab use only. Do not use as a permanent relay/pump power source.',
    estimatedCost: 5,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['power-supply', 'prototyping', 'lab-power'],
  },

  // ==========================================================================
  // ENCLOSURES / DEPLOYMENT
  // ==========================================================================

  {
    id: 'raspberry-pi-case',
    name: 'Raspberry Pi Case',
    category: 'enclosures-deployment',
    quantity: 1,
    status: 'owned',
    phase: 'deploy',
    priority: 'optional',
    notes: 'Indoor case for the Pi 5. Keeps it protected during desk/lab use.',
    estimatedCost: 15,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['enclosure', 'prototyping'],
  },
  {
    id: 'black-project-enclosures',
    name: 'Black ABS Project Enclosures',
    category: 'enclosures-deployment',
    quantity: 2,
    status: 'owned',
    phase: 'deploy',
    priority: 'useful',
    notes: 'Generic ABS boxes — adequate for indoor or sheltered outdoor use. Not IP-rated. Good for dev-stage outdoor testing, not permanent installation.',
    estimatedCost: 6,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['enclosure', 'outdoor-deploy', 'prototyping'],
  },

  // ==========================================================================
  // NEEDED — next purchases
  // ==========================================================================

  {
    id: 'waterproof-cable-glands',
    name: 'Waterproof Cable Glands (PG7/PG9 assortment)',
    category: 'enclosures-deployment',
    quantity: 1,
    status: 'needed',
    phase: 'deploy',
    priority: 'critical',
    notes: 'Required to route sensor cables in/out of weatherproof enclosures. Cheap and essential — missing this blocks all outdoor deployment.',
    estimatedCost: 8,
    replacementCost: 12,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['outdoor-deploy', 'weatherproofing'],
  },
  {
    id: 'outdoor-sensor-cables',
    name: 'Outdoor-Rated Sensor Cables + Weatherproof Connectors',
    category: 'wiring-prototyping',
    quantity: 1,
    status: 'needed',
    phase: 'deploy',
    priority: 'critical',
    notes: 'UV-resistant cable for running sensor wiring from garden beds to the enclosure. Needed for any permanent outdoor install.',
    estimatedCost: 18,
    replacementCost: 25,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['outdoor-deploy', 'weatherproofing', 'sensor-routing'],
  },
  {
    id: 'power-supply-5v12v',
    name: 'Dedicated 5V/12V Power Supply (relay/irrigation-rated)',
    category: 'power',
    quantity: 1,
    status: 'needed',
    phase: 'automate',
    priority: 'critical',
    notes: 'USB adapters are not reliable for always-on relay/pump control. Needs a proper DIN-rail or wall-mount PSU with adequate current rating.',
    estimatedCost: 22,
    replacementCost: 35,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['power-supply', 'relay-control', 'irrigation-control', 'automation'],
  },
  {
    id: 'solenoid-valve-or-pump',
    name: 'Solenoid Irrigation Valve or 12V Water Pump',
    category: 'irrigation',
    quantity: 1,
    status: 'needed',
    phase: 'automate',
    priority: 'critical',
    notes: 'The physical actuator for automated irrigation. 12V solenoid valve on a hose line, or small submersible pump from a rain barrel.',
    relatedGoals: ['irrigation-automation'],
    estimatedCost: 28,
    replacementCost: 45,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['irrigation-control', 'automation', 'relay-control', 'pump-control'],
  },
  {
    id: 'waterproof-outdoor-enclosure',
    name: 'Weatherproof Outdoor Enclosure (IP65+) + Mounting',
    category: 'enclosures-deployment',
    quantity: 1,
    status: 'needed',
    phase: 'deploy',
    priority: 'critical',
    notes: 'IP65-rated polycarbonate box for permanent outdoor sensor node. Paired with cable glands for a production-grade installation.',
    estimatedCost: 28,
    replacementCost: 45,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['outdoor-deploy', 'weatherproofing', 'enclosure'],
  },
  {
    id: 'battery-pack-solar',
    name: 'Battery Pack + Solar Charging Option',
    category: 'power',
    quantity: 1,
    status: 'needed',
    phase: 'deploy',
    priority: 'useful',
    notes: 'Enables untethered outdoor sensor nodes. LiPo + TP4056 solar charger circuit, or a dedicated solar garden power kit.',
    estimatedCost: 35,
    replacementCost: 55,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['off-grid-power', 'outdoor-deploy', 'solar', 'autonomous-nodes'],
  },
  {
    id: 'inline-fuse-protection',
    name: 'Inline Fuse + Basic Power Protection Components',
    category: 'power',
    quantity: 1,
    status: 'needed',
    phase: 'automate',
    priority: 'useful',
    notes: 'Safety essentials for any project controlling pumps or valves from relay outputs. Prevents fires and protects the circuit.',
    estimatedCost: 6,
    replacementCost: 10,
    currency: 'CAD',
    costConfidence: 'estimated',
    capabilityTags: ['power-protection', 'relay-control', 'safety'],
  },
]

// ---------------------------------------------------------------------------
// Capability cards — what the current inventory enables
// ---------------------------------------------------------------------------

export const CAPABILITY_CARDS: CapabilityCard[] = [
  {
    id: 'basic-electronics-lab',
    title: 'Basic Electronics Learning Lab',
    description:
      'Work through LED circuits, button inputs, sensor reads, and display outputs. The Elegoo kit provides structured projects to build fundamentals before garden-specific builds.',
    phase: 'learn',
    requiredItemIds: [
      'arduino-mega',
      'breadboards',
      'dupont-jumper-wires',
      'leds-assortment',
      'buttons-tactile',
      'resistor-assortment',
      'elegoo-starter-kit',
    ],
  },
  {
    id: 'soil-moisture-prototype',
    title: 'Soil Moisture Monitoring Prototype',
    description:
      'Wire one or more capacitive soil moisture sensors to the ESP32. Read analog values, print to serial, and map to a 0–100% scale. The core sensor of the future ELK Garden node.',
    phase: 'prototype',
    requiredItemIds: [
      'esp32-dev-board',
      'capacitive-soil-moisture-sensors',
      'breadboards',
      'dupont-jumper-wires',
    ],
  },
  {
    id: 'water-tank-level-monitor',
    title: 'Water Tank Level Monitor',
    description:
      'Mount the HC-SR04 ultrasonic sensor above a rain barrel or tank. The ESP32 calculates depth from the speed-of-sound return time and alerts when water runs low.',
    phase: 'prototype',
    requiredItemIds: [
      'esp32-dev-board',
      'hc-sr04-ultrasonic',
      'breadboards',
      'dupont-jumper-wires',
    ],
  },
  {
    id: 'temp-humidity-monitor',
    title: 'Temperature + Humidity Monitor',
    description:
      'The DHT22 sensors pair with the ESP32 for accurate ambient air readings. Combine with the soil moisture sensor for a complete environment picture of each zone.',
    phase: 'prototype',
    requiredItemIds: ['esp32-dev-board', 'dht22-sensor', 'breadboards', 'dupont-jumper-wires'],
  },
  {
    id: 'raspberry-pi-dashboard',
    title: 'Raspberry Pi Local Dashboard Server',
    description:
      'Set up the Pi 5 as a headless server collecting sensor readings from ESP32 nodes over WiFi. This becomes the hub that feeds the ELK Garden app with real data.',
    phase: 'deploy',
    requiredItemIds: ['raspberry-pi-5', 'usb-power-adapters', 'raspberry-pi-gpio-breakout'],
  },
  {
    id: 'relay-automation-prototype',
    title: 'Relay-Controlled Automation Prototype',
    description:
      'Wire a relay channel to control a low-power device. Learn safe relay switching with optocoupler isolation before connecting to any pump or valve.',
    phase: 'automate',
    requiredItemIds: ['relay-module-2ch', 'esp32-dev-board', 'breadboards', 'dupont-jumper-wires'],
  },
  {
    id: 'outdoor-sensor-node',
    title: 'Weatherproof Outdoor Sensor Node',
    description:
      'Deploy a production-grade sensor node outdoors. Requires a proper IP65 enclosure, cable glands, and outdoor-rated wiring. This is the step that makes the prototype real.',
    phase: 'deploy',
    requiredItemIds: [
      'esp32-dev-board',
      'waterproof-outdoor-enclosure',
      'waterproof-cable-glands',
      'outdoor-sensor-cables',
    ],
  },
  {
    id: 'robotics-platform',
    title: 'Raspberry Pi Robotics Platform',
    description:
      'Use the Freenove robot car kit to learn motor control, camera integration, and autonomous navigation patterns with Python on the Pi.',
    phase: 'learn',
    requiredItemIds: ['raspberry-pi-5', 'freenove-rpi-car-kit'],
  },
  {
    id: 'home-assistant-garden',
    title: 'Home Assistant Garden Integration',
    description:
      'Connect ELK Garden sensor data into Home Assistant for unified home + garden control. Surface garden events alongside home automations on a single dashboard.',
    phase: 'deploy',
    requiredItemIds: ['home-assistant-hub', 'raspberry-pi-4', 'aqara-sensors'],
  },
]

// ---------------------------------------------------------------------------
// Project roadmap
// ---------------------------------------------------------------------------

export const PROJECT_CARDS: ProjectCard[] = [
  {
    id: 'sensor-node-mvp',
    title: 'Garden Sensor Node MVP',
    description:
      'Wire the ESP32 to one capacitive soil moisture sensor. Read data every 15 minutes, print to serial. The entire foundation of the future sensor network.',
    phase: 'prototype',
    requiredItemIds: ['esp32-dev-board', 'capacitive-soil-moisture-sensors', 'breadboards'],
    estimatedDifficulty: 'beginner',
    outcome: 'First real sensor reading from your garden.',
  },
  {
    id: 'soil-moisture-dashboard',
    title: 'Soil Moisture Dashboard',
    description:
      'Connect the ESP32 to WiFi. Send sensor readings to the Raspberry Pi over HTTP. Build a simple local web page showing live moisture percentages per zone.',
    phase: 'prototype',
    requiredItemIds: ['esp32-dev-board', 'raspberry-pi-5', 'capacitive-soil-moisture-sensors'],
    estimatedDifficulty: 'intermediate',
    outcome: 'Real garden data flowing into a local web dashboard.',
  },
  {
    id: 'water-tank-monitor',
    title: 'Water Tank Level Monitor',
    description:
      'Mount the HC-SR04 sensor above a rain barrel. Calculate water level in litres. Log to the Pi and display on the dashboard with a low-level alert.',
    phase: 'prototype',
    requiredItemIds: ['esp32-dev-board', 'hc-sr04-ultrasonic', 'raspberry-pi-5'],
    estimatedDifficulty: 'beginner',
    outcome: 'Know how much water you have before irrigating.',
  },
  {
    id: 'weather-aware-watering',
    title: 'Weather-Aware Watering Recommendations',
    description:
      'Combine soil moisture and DHT22 readings with a weather API. If rain is coming, suppress irrigation. If soil is dry and heat is high, escalate the alert.',
    phase: 'automate',
    requiredItemIds: ['esp32-dev-board', 'raspberry-pi-5', 'capacitive-soil-moisture-sensors', 'dht22-sensor'],
    estimatedDifficulty: 'intermediate',
    outcome: 'Recommendations that understand both soil and sky.',
  },
  {
    id: 'irrigation-prototype',
    title: 'Irrigation Automation Prototype',
    description:
      'Wire the relay to a 12V solenoid valve or pump. Trigger watering when moisture falls below threshold. Include a manual override and safety timer cutoff.',
    phase: 'automate',
    requiredItemIds: [
      'relay-module-2ch',
      'esp32-dev-board',
      'solenoid-valve-or-pump',
      'power-supply-5v12v',
      'inline-fuse-protection',
    ],
    estimatedDifficulty: 'advanced',
    outcome: 'The garden waters itself based on real sensor data.',
  },
  {
    id: 'ha-garden-integration',
    title: 'Home Assistant + Garden Sensor Integration',
    description:
      'Bridge ELK Garden sensor data into Home Assistant. Trigger home automations from garden events — e.g. alert when soil is critically dry, log harvest events.',
    phase: 'deploy',
    requiredItemIds: ['home-assistant-hub', 'raspberry-pi-5', 'esp32-dev-board'],
    estimatedDifficulty: 'intermediate',
    outcome: 'Unified home and garden intelligence on one platform.',
  },
  {
    id: 'yield-calorie-layer',
    title: 'High-Yield + Calorie Planning Layer',
    description:
      'Log harvests per zone and crop. Track yield in weight. Calculate estimated calories produced and build a planting density model for season planning.',
    phase: 'optimize',
    requiredItemIds: [],
    estimatedDifficulty: 'intermediate',
    outcome: 'Understand exactly how much food your garden produces.',
  },
]

// ---------------------------------------------------------------------------
// Learning path
// ---------------------------------------------------------------------------

export const LEARNING_STEPS: LearningStep[] = [
  {
    id: 'learn-hello-world',
    stepNumber: 1,
    title: 'Hello World Electronics',
    description: 'Blink an LED, read a button press, control a buzzer. Build confidence with digital input/output before touching sensors.',
    phase: 'learn',
    relatedItemIds: ['arduino-mega', 'leds-assortment', 'buttons-tactile', 'resistor-assortment', 'breadboards', 'elegoo-starter-kit'],
    outcome: 'You understand GPIO, voltage, and digital control.',
  },
  {
    id: 'learn-sensor-input',
    stepNumber: 2,
    title: 'Read Sensor Data',
    description: 'Connect the capacitive soil moisture sensor and waterproof temperature probe to the ESP32. Read analog and digital values.',
    phase: 'learn',
    relatedItemIds: ['esp32-dev-board', 'capacitive-soil-moisture-sensors', 'waterproof-temp-probe'],
    outcome: 'Your device reads real environmental data from your garden.',
  },
  {
    id: 'learn-esp32-wifi',
    stepNumber: 3,
    title: 'Transmit Data Over WiFi',
    description: 'Use the ESP32 WiFi stack to POST sensor readings to a local server endpoint. Learn JSON payloads and basic HTTP from a microcontroller.',
    phase: 'prototype',
    relatedItemIds: ['esp32-dev-board'],
    outcome: 'Sensor data flows wirelessly from garden to dashboard.',
  },
  {
    id: 'learn-raspberry-pi-server',
    stepNumber: 4,
    title: 'Raspberry Pi as a Local Server',
    description: 'Run a Node.js or Python server on the Pi that receives sensor data from ESP32 nodes and exposes a local API. This becomes the ELK Garden hub.',
    phase: 'prototype',
    relatedItemIds: ['raspberry-pi-5', 'raspberry-pi-gpio-breakout'],
    outcome: 'A real local server collecting and serving garden data.',
  },
  {
    id: 'learn-relay-safety',
    stepNumber: 5,
    title: 'Relay Safety + Control Basics',
    description: 'Understand optocoupler isolation in relay modules. Learn safe wiring for switching loads above 5V. Always use a fuse. Test with low-power loads first.',
    phase: 'automate',
    relatedItemIds: ['relay-module-2ch', 'inline-fuse-protection'],
    outcome: 'You can safely control high-current devices from a microcontroller.',
  },
  {
    id: 'learn-outdoor-deployment',
    stepNumber: 6,
    title: 'Outdoor Weatherproof Deployment',
    description: 'Learn cable gland installation, enclosure sealing, and UV-resistant wiring. Understand IP ratings and what outdoor-rated means in practice.',
    phase: 'deploy',
    relatedItemIds: ['waterproof-outdoor-enclosure', 'waterproof-cable-glands', 'outdoor-sensor-cables'],
    outcome: 'A sensor node that survives rain, sun, and a full outdoor season.',
  },
  {
    id: 'learn-irrigation-control',
    stepNumber: 7,
    title: 'Automated Irrigation Control',
    description: 'Wire a relay to a 12V pump or solenoid valve. Add a soil moisture trigger, a timer safety cutoff, and a manual override.',
    phase: 'automate',
    relatedItemIds: ['relay-module-2ch', 'solenoid-valve-or-pump', 'power-supply-5v12v'],
    outcome: 'The garden can water itself based on real data.',
  },
  {
    id: 'learn-yield-tracking',
    stepNumber: 8,
    title: 'Yield + Calorie Tracking',
    description: 'Log harvests by crop and zone. Calculate caloric output. Use data to optimise planting density and crop selection season over season.',
    phase: 'optimize',
    relatedItemIds: [],
    outcome: 'Understand your garden as a food production system with measurable output.',
  },
]

// ---------------------------------------------------------------------------
// Ambition modes
// ---------------------------------------------------------------------------

export const AMBITION_MODES: AmbitionModeDef[] = [
  {
    id: 'simple-garden',
    label: 'Simple Garden',
    tagline: 'Track what you grow, stay on top of watering.',
    description:
      'Focused on basic garden tracking — no hardware required. Log observations, follow watering guidance, and build good habits.',
    priorityCategories: ['seeds-plants', 'tools', 'soil-amendments'],
  },
  {
    id: 'serious-food-garden',
    label: 'Serious Food Garden',
    tagline: 'Real sensors, real data, better harvests.',
    description:
      'Add soil moisture and temperature sensors. Get alerts, trends, and recommendations backed by actual readings — not just intuition.',
    priorityCategories: ['sensors', 'boards-controllers', 'wiring-prototyping', 'power'],
  },
  {
    id: 'high-yield-garden',
    label: 'High-Yield Garden',
    tagline: 'Optimise every bed for maximum food production.',
    description:
      'Track yield and calories per zone. Combine sensor data with planting density models and seasonal timing to produce as much food as possible.',
    priorityCategories: ['sensors', 'edge-compute', 'irrigation', 'soil-amendments'],
  },
  {
    id: 'automation-lab',
    label: 'Automation Lab',
    tagline: 'Build the full autonomous garden system.',
    description:
      'Deploy outdoor sensor nodes, automate irrigation, run a local dashboard server, and integrate with Home Assistant. The complete ELK Garden hardware stack.',
    priorityCategories: [
      'edge-compute',
      'boards-controllers',
      'sensors',
      'automation',
      'irrigation',
      'power',
      'enclosures-deployment',
      'smart-home',
    ],
  },
  {
    id: 'resilience-garden',
    label: 'Resilience / Feed-the-Family Garden',
    tagline: 'Maximum food, maximum resilience, minimum dependency.',
    description:
      'Self-sufficient production with solar power, water management, yield tracking, and seasonal planning. Designed to produce a meaningful share of household calories.',
    priorityCategories: [
      'irrigation',
      'power',
      'sensors',
      'enclosures-deployment',
      'soil-amendments',
      'seeds-plants',
    ],
  },
]
