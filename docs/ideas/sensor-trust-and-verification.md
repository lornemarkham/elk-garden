# Sensor Trust And Verification

Status: Future idea

This is a concept note only. Do not build this into the MVP yet.

## Why It Matters

Sensors are signals, not truth. Soil probes drift, cameras miss context, weather feeds can be too broad, and repeated readings may mean a hardware problem rather than a garden problem.

ELK Garden should avoid turning every signal into an urgent task. A trust layer can help separate useful signals from false positives, false negatives, and sensor malfunctions.

## What It Might Become

Future ELK Garden could include a verification workflow:

- Confidence levels for sensor, camera, weather, and human observations.
- "Confirm issue," "False alarm," and "Checked and okay" actions.
- Camera review windows for motion or animal activity.
- Repeated-reading detection for possible sensor malfunction.
- Escalation only after enough confidence or human confirmation.
- A trust layer before recommendations become urgent.

## MVP Not Now

Do not add verification queues, backend confidence scoring, camera review tooling, or sensor health monitoring yet. Keep current fake sensor events flowing through `sensorIngestion.ts` and use simple copy to explain confidence.

## Architecture Reminder

Future ELK Garden intelligence loop:

sensor/camera/weather/human observation
-> ingestion
-> interpretation
-> confidence
-> recommendation
-> human verification
-> task
-> learning over time
