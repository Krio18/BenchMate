# BenchMate 3D

A fault-diagnosis agent, and the bench that proves it reasons.

Muse Spark receives a symptom, a datasheet, and three measurement tools. It
forms its hypotheses, chooses where to measure, interprets what it receives,
eliminates, and concludes. It never has access to the real board state: every
value comes from a deterministic simulator which does know the fault.

**The model cannot invent anything.** That is what makes every diagnosis verifiable.

## Results

**200 diagnoses, 200 correct.** Four unrelated devices, agent prompt identical
word for word.

| Device | Points | Components | Faults | Rate | Avg measurements |
| --- | --- | --- | --- | --- | --- |
| Audio preamplifier | 5 | 5 | 4 | 40/40 | 6.0 |
| Regulated power supply | 6 | 4 | 4 | 40/40 | 4.7 |
| Motor driver board | 10 | 8 | 6 | 60/60 | 6.1 |
| Drone control board | 14 | 13 | 6 | 60/60 | 7.4 |

Reproducible: `python batch.py 10 drone` (`preamplificateur`, `alimentation`,
`moteur` or `drone`, 10 runs per fault).

## What was built during the hackathon

**The whole repository.** No code predating October 27, 2026, no electronic
simulation library, no dependency outside the Python standard library. The
specifications are dated October 26, all code October 27 to November 2 — the
git history shows it.

## The core: what it took to get there

The model alone reached **50%**. It systematically blamed the component
closest to the symptom. Three principles, added to its prompt, brought it to
100%:

1. **Propagation.** An upstream anomaly makes everything downstream abnormal.
   The culprit precedes the *first* anomaly in the chain — everything after
   merely suffers.
2. **Dichotomy.** Start from the symptom where it manifests and work back up
   by splitting the chain in two, rather than sweeping the points in order.
3. **Operating-conditions check.** Never condemn a component without checking
   its supply and bias. A poorly powered component misbehaves without being
   at fault.

None of the three is specific to electronics: they are the reflexes of any
troubleshooting by elimination, and the model does not apply them on its own.

Each one fixed some faults while breaking others. The third completed the
motor board but degraded the preamplifier — the measurement harness revealed
it in two minutes.

## What the agent reasons, on the drone board

Fault J2, partially degraded fuse, 13-component board discovered with no
adaptation:

> Degraded motor output → walks back up the PWM chain → **TP10 nominal**, the
> microcontroller drive is good → TP11 abnormal just past the gate driver, *but
> its TP3 supply reads 11 V instead of 14.8* → **"U5 is therefore suffering its
> supply condition"** → dichotomy on the supply chain → TP2 abnormal, TP1
> nominal → **FU1**.

Two components successively exonerated, two levels walked back up, eight
measurements.

## Device-independent

The agent prompt contains **no point identifier, no component name, no
reference to any circuit** — an automated test verifies this against every
device in the repository.

Adding a device means adding a data file: the chain, the points, the
components, the manufacturer's nominal datasheet, the scenarios. The three
devices added after the first were added this way, and diagnosed at 100%
without a word of the prompt changing.

In production, the simulator is replaced by the real instrument. The agent
itself does not change.

## What the agent receives, and what it does not

**Receives**: the chain description, the measurement points, the three tools,
the nominal-values datasheet — the one any technician has — and the reported
symptom.

**Does not receive**: the fault tables, their count, their existence, or any
faulty value. Anti-leak tests verify that none of those values appears in its
context. And no instruction tells it to call a tool: it decides alone whether
to measure, and where.

## The 3D replay

`viewer/index.html` — standalone page, no network requests, open by
double-click. It loads a run log and replays it: the 3D board with its modeled
components, the probe moving from point to point, the oscilloscope trace
overlaying the nominal signal on the measured signal, the agent's reasoning
displayed as it unfolds, and hypotheses switching off one by one.

On the drone board, the list goes from **13 hypotheses to 1** in eight
measurements.

The page touches neither the simulator nor the API: everything comes from the
log.

## Meta models

**Muse Spark** (`muse-spark-1.3`), via the Meta Model API, with function
calling. It is the entire engine: hypotheses, measurement choices,
interpretation, conclusion. No other model is used — none would have served
any purpose but padding the count.

## Architecture

- `simulator.py` — holds the truth, exposes three tools, never reveals the active scenario
- `contexte.py` — builds the agent context from the device; contains nothing device-specific
- `diagnostic.py` — the loop: one tool per turn, configurable budget, everything logged
- `export_json.py` — the recording of one run, replayable with no simulator or API
- `batch.py` — replays each fault N times and scores the results
- `devices/*.json` — the four devices
- `viewer/` — the 3D replay

## Run

```
$env:MODEL_API_KEY = "..."
python diagnostic.py J1 drone
python diagnostic.py J1 drone --json runs/my_run.json
python batch.py 10 drone
pytest
```

Then open `viewer/index.html` and load a log from `runs/`.

## Limitations

The devices are simulated: the values are tables, not circuit solving. That is
deliberate — the subject is the agent's reasoning, and a deterministic table
is precisely what makes it gradable. Switching to a real instrument happens
behind the three tools, without touching the agent.

One fault at a time. Multiple faults are not handled.
