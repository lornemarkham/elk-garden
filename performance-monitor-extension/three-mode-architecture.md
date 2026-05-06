Three-Mode Monitor Architecture

Vision

Build one front-end observability platform that works across embedded apps, browser extensions, and cooperative parent/child systems.

This is not a Pro-only tool or an Eleos-only tool.

It should be:
	•	useful inside Sycle
	•	portable to other codebases
	•	honest about what it can and cannot know
	•	designed so richer capabilities come from better signals, not fake UI

⸻

Product Modes

1) Embedded Mode

The monitor runs inside an application you control.

Best for:
	•	owned apps
	•	internal tools
	•	microfrontends
	•	performance tuning during development and rollout

Strengths:
	•	access to app lifecycle signals
	•	can define real shell_visible, content_visible, ready
	•	access to router/navigation events
	•	can connect to app state and feature flags
	•	highest trust and fidelity

Limits:
	•	requires code changes in the app
	•	not instantly portable to arbitrary websites

⸻

2) Extension Mode

The monitor runs as a browser extension on pages from the outside.

Best for:
	•	quick diagnostics
	•	demos
	•	third-party codebases
	•	lightweight install without app changes

Strengths:
	•	easy to distribute
	•	works on many sites
	•	can capture page-observable signals like fetch/XHR, runtime errors, and basic timing
	•	good portable baseline

Limits:
	•	cannot naturally know app-private meaning
	•	weaker lifecycle truth
	•	more heuristic-based unless app cooperates

⸻

3) Hybrid Cooperative Mode

The extension or viewer works together with instrumented parent and/or child apps using a shared event contract.

Best for:
	•	iframe systems
	•	parent/child web apps
	•	embedded microservices
	•	startup and blame diagnosis across boundaries

Strengths:
	•	combines portability with semantic truth
	•	can compare parent vs child timing honestly
	•	can track cooperative readiness
	•	strongest differentiator for embedded-app ecosystems

Limits:
	•	requires shared protocol and adoption on both sides
	•	more moving parts than extension-only mode

⸻

Core Principle

Build one shared monitor core, not separate disconnected tools.

That shared core should define:
	•	event contracts
	•	canonical data models
	•	derived metrics
	•	classification rules
	•	reusable UI contracts where possible

Then attach different adapters depending on runtime.

⸻

Architecture Layers

A. Shared Core

Portable logic used everywhere.

Includes:
	•	monitor event types
	•	request/error/lifecycle models
	•	snapshot model
	•	derived metrics and summaries
	•	classification utilities
	•	shared UI-friendly view models

Examples:
	•	MonitorEvent
	•	RequestEvent
	•	RuntimeErrorEvent
	•	LifecycleMarker
	•	MonitorSnapshot
	•	deriveOverviewMetrics(snapshot)
	•	deriveStartupStory(snapshot)

⸻

B. Signal Adapters

Translate runtime-specific signals into the shared core model.

Embedded adapter
	•	router transitions
	•	app-defined lifecycle markers
	•	feature flags
	•	internal performance hooks

Extension adapter
	•	fetch/XHR interception
	•	runtime errors
	•	unhandled rejections
	•	navigation timing
	•	page-world bridge

Hybrid cooperative adapter
	•	parent/child handshake
	•	cross-frame event exchange
	•	readiness/version negotiation
	•	correlation across runtimes

⸻

C. Viewer Surfaces

Different ways to display the same model.

Examples:
	•	in-app docked panel
	•	browser extension side panel
	•	future devtools panel
	•	export/report surface later

The viewer should not own the truth.
The shared core and adapters should.

⸻

Shared vs Mode-Specific Features

Shared features

These should work in multiple modes when the required data exists:
	•	Overview
	•	Requests
	•	Errors
	•	basic Timeline
	•	session stats
	•	request classification
	•	slowest/failed call summaries

Embedded/Hybrid features

These need richer app cooperation:
	•	startup waterfall with real meaning
	•	shell/content/ready markers
	•	iframe diagnosis
	•	route-aware timing
	•	parent/child blame analysis
	•	richer lifecycle narratives

Extension-only conveniences

These are useful for portable diagnostics:
	•	page-observed runtime errors
	•	quick request capture on arbitrary sites
	•	lightweight deployment

⸻

Event Contract Direction

The long-term platform should revolve around a shared event protocol.

Representative events:
	•	shell_visible
	•	content_visible
	•	ready
	•	route_change_start
	•	route_change_end
	•	iframe_mount
	•	iframe_ready
	•	api_request_started
	•	api_request_finished
	•	runtime_error
	•	unhandled_rejection

Each event should be:
	•	versioned
	•	timestamped
	•	source-aware (parent, child, extension, page)
	•	honest about certainty level

⸻

Product Positioning

This is not just a Chrome extension.
It is a front-end observability kit for embedded and multi-surface web systems.

Potential positioning:
	•	diagnose startup behavior
	•	understand parent/child coordination
	•	monitor embedded apps honestly
	•	give teams a portable monitor plus deeper optional integration

⸻

Recommended Build Sequence

Phase 1 — Embedded excellence

Make the embedded/integrated version genuinely valuable using real app signals.

Phase 2 — Shared core extraction

Pull event contracts, derivations, and reusable view logic into a portable core.

Phase 3 — Extension alignment

Use the same shared core in the extension where data allows.

Phase 4 — Hybrid cooperation

Add shared parent/child protocol for deeper iframe and microfrontend diagnosis.

Phase 5 — External packaging

Make it installable for other teams/codebases with docs and adapters.

⸻

Non-Negotiables
	•	No fake certainty
	•	No misleading tracing claims
	•	No mode pretending it knows more than it does
	•	No duplicated business logic across app and extension if it can be shared
	•	Prefer trustworthy signals over flashy UI

⸻

One-Sentence Strategy

Build a shared observability core with multiple runtime adapters and multiple viewer modes, so the tool can be lightweight and portable when needed, but deeply powerful when integrated into cooperating apps.