# Human Feedback Loop / Garden Rounds

Status: Future idea

This is a concept note only. Do not build this into the MVP yet.

## Why It Matters

Humans are sensors too. A person walking through the garden notices context that hardware may miss: a plant looking ill, a bed that feels off, a crop that is not producing, or a camera that failed to catch the real issue.

This matters especially for seniors and busy households because speaking can be easier than typing. A quick voice note, photo, or text observation can preserve what happened without forcing the user through a complicated form.

## What It Might Become

Future ELK Garden could support lightweight garden rounds:

- User walks the garden with their phone.
- User captures voice, text, or photo observations.
- Notes can include things like "camera missed this," "rhubarb is not producing," or "plant looks ill."
- The app summarizes observations later.
- The app compares human observations against sensor/camera signals.
- The app builds year-over-year learning from what people actually saw.

## MVP Not Now

Do not add voice capture, photo upload, summaries, or long-term learning yet. For now, keep the MVP focused on the fake sensor ingestion path and simple dashboard/task reactions.

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
