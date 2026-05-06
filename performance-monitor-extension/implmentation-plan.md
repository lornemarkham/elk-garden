Monitor MVP Implementation Plan

Goal

Ship a credible MVP of the monitor that coworkers can install, use, discuss, and improve.

This MVP should:
	•	work in real development environments
	•	be honest about what it knows
	•	support both embedded and extension use cases without pretending they are identical
	•	use feature switches so new capabilities can be rolled out safely
	•	create a foundation that other engineers can contribute to without confusion

This is not the final platform. It is the first version that is solid enough for internal adoption and feedback.

⸻

MVP Outcome

At MVP, a teammate should be able to:
	1.	install or enable the monitor
	2.	open a page/app
	3.	see request activity, runtime errors, and basic session health
	4.	understand whether they are in extension mode or embedded mode
	5.	optionally enable richer instrumentation behind feature flags
	6.	give useful product and engineering feedback

⸻

MVP Product Scope

In scope
	•	stable extension monitor
	•	stable embedded monitor inside an app we control
	•	shared event contract for core request/error/lifecycle events
	•	shared derivation logic for overview metrics
	•	feature switches for richer/experimental capabilities
	•	simple docs so coworkers can run it locally

Out of scope for MVP
	•	perfect parity across all modes
	•	full tracing product
	•	polished external packaging for the public
	•	AI summaries as a core dependency
	•	automatic iframe diagnosis for every site on earth
	•	enterprise-grade auth, billing, hosted dashboards

⸻

MVP Principle

One shared monitor core, two practical surfaces, optional hybrid enrichment later.

For MVP, we should avoid trying to ship every mode equally.

Priority order
	1.	Embedded mode becomes the most trustworthy internal demo
	2.	Extension mode stays stable and useful as the portable surface
	3.	Hybrid cooperative mode is designed now, but only partially implemented if needed for MVP

⸻

Proposed Repo/Code Shape

This is a recommended target shape, not a mandatory immediate refactor.

performance-monitor-extension/
  src/
    extension/
      content/
      page-world/
      ui/
    shared/
      contracts/
      derive/
      classify/
      types/
      flags/
      utils/
    embedded/
      adapter/
      ui/
    hybrid/
      protocol/
      adapter/
  docs/

If the current repo structure is not ready for this exact layout yet, that is okay. MVP can begin with a lighter version:

src/
  shared/
  extension/
  embedded/
  hybrid/

The key thing is clear boundaries, not folder perfection.

⸻

MVP Architecture Responsibilities

1. Shared Core

This is the most important part of the MVP.

Responsibility:
Provide the canonical language of the monitor.

Owns:
	•	event types
	•	request/error/lifecycle data models
	•	snapshot types
	•	derived overview/session metrics
	•	request classification helpers
	•	mode/capability flags

Must not own:
	•	direct browser APIs
	•	React panel mounting details
	•	app-specific routing logic

MVP deliverables:
	•	MonitorEvent
	•	RequestEvent
	•	RuntimeErrorEvent
	•	LifecycleEvent
	•	MonitorSnapshot
	•	deriveOverviewMetrics(snapshot)
	•	classifyRequest(url, context)
	•	MonitorCapabilities

⸻

2. Extension Adapter

Responsibility:
Collect page-observable signals and normalize them into the shared model.

Owns:
	•	fetch/XHR capture
	•	window error capture
	•	unhandled rejection capture
	•	page-world bridge
	•	extension-side store ingestion

Must not own:
	•	fake app-specific lifecycle meaning
	•	app router assumptions
	•	iframe truth it cannot prove

MVP deliverables:
	•	stable request capture
	•	stable error capture
	•	extension snapshot from shared model
	•	overview/requests/errors tabs using shared derivations where possible
	•	pause/resume/reset session controls

⸻

3. Embedded Adapter

Responsibility:
Collect app-defined signals from an app we control.

Owns:
	•	lifecycle markers like shell/content/ready
	•	router/navigation hooks
	•	app-level request annotation if available
	•	app-aware mode metadata

Must not own:
	•	duplicated core derivation logic already in shared
	•	assumptions that every external team will use our app signals

MVP deliverables:
	•	minimal embedded integration API
	•	app-defined lifecycle marker emission
	•	shared snapshot compatibility
	•	one credible embedded demo inside an owned app

⸻

4. Hybrid Protocol

Responsibility:
Define how parent and child apps cooperate when both are instrumented.

For MVP:
Design it clearly, but implement only the minimum needed.

Owns:
	•	parent/child event envelope
	•	protocol version
	•	source identity (parent, child, extension, page)
	•	handshake rules

MVP deliverables:
	•	draft protocol spec
	•	minimal handshake event shape
	•	optional future flag; not required to be fully productionized at MVP

⸻

MVP Feature Set

A. Shared features required at MVP

These should be available anywhere the data exists.

Overview tab
	•	total calls
	•	failed calls
	•	page/runtime errors
	•	average duration
	•	slowest request
	•	request kinds breakdown
	•	recent error summary
	•	explicit mode/capability messaging

Requests tab
	•	request list
	•	status/success
	•	duration
	•	method
	•	URL
	•	request kind badge
	•	simple filters
	•	stable sorting or newest-first ordering

Errors tab
	•	runtime errors
	•	unhandled rejections
	•	timestamp
	•	message
	•	stack preview when available

⸻

B. Embedded-only MVP features

These should only appear when supported by real embedded signals.
	•	shell/content/ready markers
	•	simple startup story
	•	route-aware session context
	•	app-specific mode label

⸻

C. Deferred beyond MVP
	•	tracing tab
	•	full waterfall diagnosis
	•	full iframe diagnosis UI
	•	AI summaries
	•	broad plugin SDK for the public
	•	polished export/reporting system

These can exist behind feature flags or stay off entirely.

⸻

Feature Switch Strategy

We want this to be safe for coworkers and flexible during adoption.

Principles
	•	every non-core capability should be toggleable
	•	defaults should prefer safety and clarity
	•	flags should describe capability, not implementation detail

Recommended MVP flags
	•	monitorEnabled
	•	monitorOverviewEnabled
	•	monitorRequestsEnabled
	•	monitorErrorsEnabled
	•	monitorEmbeddedLifecycleEnabled
	•	monitorHybridProtocolEnabled
	•	monitorExperimentalViewsEnabled

Behavior
	•	core stable tabs should be on in dev/test by default
	•	embedded lifecycle should only show if real signals exist
	•	hybrid protocol should default off until handshake is proven
	•	experimental views should be clearly marked and isolated

⸻

Suggested Milestones

Milestone 1 — Stabilize the portable foundation

Goal: make the extension trustworthy and usable.

Tasks
	•	keep stable snapshot/store architecture
	•	add shared types for request/error/core snapshot shape
	•	use shared derivation logic for Overview metrics
	•	finalize extension tabs: Overview, Requests, Errors
	•	ensure pause/resume/reset are stable
	•	document local install and test steps

Success criteria
	•	no render-loop crashes
	•	coworkers can load extension locally
	•	monitor is useful on arbitrary pages
	•	UI clearly states what it can and cannot know

⸻

Milestone 2 — Create the shared core

Goal: stop duplicating domain logic.

Tasks
	•	extract shared monitor types
	•	extract request classification helpers
	•	extract overview/session derivations
	•	define capabilities object and mode labels
	•	move mode-neutral logic out of extension-only components

Success criteria
	•	extension consumes shared contracts/derive helpers
	•	embedded path can reuse them without copy/paste
	•	shared folder has a clear reason to exist

⸻

Milestone 3 — Embedded MVP inside an owned app

Goal: create the strongest internal demo.

Tasks
	•	define minimal embedded adapter API
	•	emit shell/content/ready markers from an owned app
	•	render embedded Overview + Requests + Errors using shared core
	•	add explicit capability/mode banners
	•	keep richer lifecycle info behind a flag

Success criteria
	•	teammates can see why embedded mode is more powerful
	•	lifecycle markers are real, not heuristic theater
	•	embedded view reuses shared logic rather than starting over

⸻

Milestone 4 — Internal coworker adoption

Goal: get real engineers using it and giving feedback.

Tasks
	•	write quick-start setup doc
	•	add screenshots/GIFs
	•	prepare short internal demo message
	•	provide a feedback checklist:
	•	what was useful
	•	what was confusing
	•	what felt missing
	•	what felt misleading
	•	collect initial issues / ideas in one place

Success criteria
	•	at least a few coworkers can run it locally
	•	feedback becomes concrete rather than abstract
	•	contributors can identify where to add code

⸻

Milestone 5 — Hybrid protocol draft and spike

Goal: prove cross-boundary cooperation without overbuilding.

Tasks
	•	write protocol envelope
	•	add version field
	•	define source identity and timestamp expectations
	•	spike one parent/child handshake flow
	•	keep behind monitorHybridProtocolEnabled

Success criteria
	•	one believable cooperative event flow exists
	•	no confusion between real signals and inferred signals
	•	groundwork is laid for iframe/microfrontend differentiation later

⸻

Team Adoption Plan

We want this to become something coworkers can help shape, not just react to.

What makes it contributor-friendly
	•	clear docs
	•	clear folder boundaries
	•	clear flag behavior
	•	clear “shared vs extension vs embedded” ownership
	•	small, safe contribution areas

Good early contribution areas for coworkers
	•	request classification rules
	•	Overview UI polish
	•	better error presentation
	•	capability banners / labels
	•	embedded adapter integration in owned apps
	•	protocol draft feedback

Avoid giving coworkers this as early contribution work
	•	massive architectural rewrites
	•	fake tracing claims
	•	mode parity promises
	•	unclear protocol changes with no spec

⸻

MVP Release Shape

For internal sharing, MVP should include:
	•	extension that runs locally
	•	one embedded demo integration
	•	docs for setup
	•	screenshots or a short demo
	•	feature flag list
	•	known limitations section

This is enough to begin internal traction.

⸻

Known Limitations to State Openly
	•	extension mode is observability from the outside, not full app truth
	•	embedded mode requires code integration
	•	hybrid mode is early and gated
	•	some richer tabs are intentionally deferred
	•	this is an MVP for real usage and feedback, not a finished observability platform

⸻

Practical Next Build Order
	1.	Add shared monitor contracts/types
	2.	Add shared overview derivations
	3.	Add extension Overview tab using shared derivations
	4.	Clean up docs and install/testing flow
	5.	Define embedded adapter API
	6.	Add one embedded integration demo
	7.	Add coworker quick-start and feedback path
	8.	Draft hybrid protocol spec

⸻

Cursor Work Style for This Project

When using Cursor on this project:
	•	ask for small surgical changes
	•	request file-by-file plans before broad refactors
	•	preserve stable behavior first
	•	require explanation of shared vs mode-specific ownership
	•	avoid vague prompts like “make it better”
	•	prefer “extract shared types/derive logic for X” or “add Overview tab using only real extension data”

⸻

One-Sentence MVP Strategy

Ship a stable shared-core monitor MVP with a portable extension surface, a strong embedded demo, and feature-flagged growth paths, so coworkers can use it now and help evolve it into a broader observability product.