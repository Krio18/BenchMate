# SPEC.md --- BenchMate 3D

## 1. Goal and scope

BenchMate 3D is a demo of a diagnostic agent on fictitious
circuits. The agent inspects components, requests measurements,
revises its hypotheses, and proposes a diagnosis. The circuits are not
physical simulations: results come exclusively from the
device tables.

Each device is a data file (`devices/*.json`): the
chain, the measurement points, the components, the nominal datasheet,
the symptom, the fault scenarios, and the call budget. The
audio preamplifier (§3 to §5) is the reference device; the
other devices follow the same contract with their own tables.

The active scenario contains exactly one fault of the active device.
The healthy scenario is reserved for tests.

## 2. Golden rule

**The simulator is the authority; the model invents no value.**

-   All voltages, amplitudes, signal qualities, and metadata come
    from the simulator.
-   The model neither computes nor guesses any measurement; it must call
    the contractual tools.
-   The simulator returns the predefined values of the active scenario.
-   An unknown identifier produces an explicit error, never a
    substitute value.
-   The active scenario and the fault identity stay hidden from
    the agent.
-   The agent distinguishes measured facts from its hypotheses and
    justifies its diagnosis with tool-returned results.

## 3. Measurement points

DC voltages in volts (`V`), signal amplitudes in volts peak-to-peak
(`Vpp`). Allowed states: `clean`, `distorted`, `silent`, `weak`.
Below are the points of the reference device; each device
defines its own in its file.

  ID      Name           Description
  ------- -------------- --------------------------------------------
  `TP1`   `SUPPLY_9V`    Supply rail
  `TP2`   `BIAS_REF`     Bias reference
  `TP3`   `AMP_INPUT`    Amplifier input
  `TP4`   `AMP_OUTPUT`   Amplifier output
  `TP5`   `AUDIO_OUT`    Audio output after coupling capacitor

## 4. Predefined scenarios

In the rows below, each value is
`DC V / amplitude Vpp / quality`, in order
`TP1, TP2, TP3, TP4, TP5`. These values are demo
data, not manufacturing specifications.

  -------------------------------------------------------------------------------------------------------------------
  Scenario      TP1                TP2                TP3               TP4                   TP5
  --------------- ------------------ ------------------ ----------------- --------------------- ---------------------
  Healthy (tests `9.0/0.0/silent`   `4.5/0.0/silent`   `4.5/0.2/clean`   `4.5/2.0/clean`       `0.0/2.0/clean`
  only)

  F1 ---         `5.2/0.0/silent`   `2.6/0.0/silent`   `2.6/0.2/clean`   `2.6/0.5/distorted`   `0.0/0.4/distorted`
  weakened
  supply

  F2 --- open    `9.0/0.0/silent`   `0.1/0.0/silent`   `0.1/0.2/clean`   `0.1/0.1/silent`      `0.0/0.1/silent`
  bias network

  F3 --- failing `9.0/0.0/silent`   `4.5/0.0/silent`   `4.5/0.2/clean`   `4.5/0.2/distorted`   `0.0/0.2/distorted`
  amplifier
  stage

  F4 ---         `9.0/0.0/silent`   `4.5/0.0/silent`   `4.5/0.2/clean`   `4.5/2.0/clean`       `0.0/0.3/weak`
  degraded
  output
  capacitor
  -------------------------------------------------------------------------------------------------------------------

Note: the Healthy column also serves as the nominal datasheet given to the agent; columns F1 to F4 and any mention of the predefined faults or their count are forbidden to it. Each device follows the same rule: only its nominal datasheet (its healthy scenario) is given to the agent.

## 5. Inspectable components

Inspection returns only static metadata; it never
reveals the real fault state. Below are the components of the
reference device.

  ID      Name                       Role
  ------- -------------------------- --------------------------------------
  `C1`    Input capacitor            Couples the input signal
  `R1`    Bias network               Establishes the bias reference
  `U1`    Operational amplifier      Amplifies the signal
  `C2`    Output capacitor           Couples the signal to the output
  `PS1`   Power supply               Provides the supply rail

## 6. Three allowed tools: exact signatures

No additional tool must be added without authorization.

### `inspect_component`

``` python
inspect_component(component_id: str) -> ComponentInfo
```

`component_id` must be a component identifier of the active device
(`C1`, `R1`, `U1`, `C2` or `PS1` for the preamplifier). Returns:

``` python
{
    "component_id": str,
    "name": str,
    "role": str,
    "visual_notes": str
}
```

`visual_notes` contains only static information. Do not
return `is_faulty`, the active fault, or a hint revealing it.

### `measure_voltage`

``` python
measure_voltage(point_id: str) -> VoltageReading
```

`point_id` must be a point identifier of the active device
(`TP1` to `TP5` for the preamplifier). Returns:

``` python
{
    "point_id": str,
    "voltage_v": float,
    "unit": "V"
}
```

`voltage_v` is read directly from the active scenario table.

### `test_signal`

``` python
test_signal(point_id: str) -> SignalReading
```

`point_id` must be a point identifier of the active device
(`TP1` to `TP5` for the preamplifier). Returns:

``` python
{
    "point_id": str,
    "amplitude_vpp": float,
    "quality": "clean" | "distorted" | "silent" | "weak"
}
```

Amplitude and quality are read directly from the active scenario
table.

### Errors

An unknown identifier returns a structured error, with no silent
correction or default value. Use `UNKNOWN_COMPONENT_ID` for
an invalid component and `UNKNOWN_POINT_ID` for an invalid point.

``` python
{
    "error": "UNKNOWN_POINT_ID",
    "message": "Unknown point_id: TP99"
}
```

Errors are not measurements.

## 7. Expected agent loop

1.  Reported symptom, that of the active device, identical for all its fault scenarios (preamplifier: "The audio output does not sound right.").
2.  Present the possible causes as hypotheses.
3.  Choose a discriminating inspection or measurement.
4.  Call one tool and faithfully report its result.
5.  Revise the hypotheses from the observations.
6.  Repeat if another measurement is useful.
7.  Give the best-supported diagnosis, the results supporting it,
    and a recommended confirmation test.
8.  The loop stops when the agent names a component, or when the call budget is exhausted (8 by default, the device's `budget_appels` value otherwise). A forced stop is logged as a diagnosis failure. A single tool is executed per turn; text with neither a call nor a diagnosis triggers a neutral retry, outside the budget.

The agent never claims to have run a test without a tool call and
never presents a hypothesis as an unsupported certainty.

The system prompt imposes three principles: propagation (an upstream anomaly makes the downstream abnormal; the culprit
immediately precedes the first anomaly), dichotomy (characterize the symptom at the output, then work back up by
dichotomy on the relevant quantity), and operating-conditions check (supply and bias of the suspect before accusing it, even with a signal-only symptom).

## 8. Verifiable diagnosis log
The log is a mandatory MVP deliverable, not an optional feature. It must let a person verify how the agent reached its diagnosis. Each diagnosis turn that calls a tool adds a log entry containing at minimum:
- turn: turn number, in chronological order;
- reasoning_before: the agent text preceding the call;
- tool: exact name of the tool called;
- argument: exact argument passed to the tool;
- value_received: exact value returned by the tool, or the structured error received;
- reasoning_after: the agent text following the result;
- remaining_hypotheses: hypotheses still plausible after taking this result into account.
Logged values must match the actual calls and returns, with no rewriting and no measurement added by the model. Remaining hypotheses are the agent's interpretation and must stay distinct from factual measurements. The log must be viewable during the demonstration and allow tracing each step of the diagnosis. Do not log the secret active-scenario identifier or any data directly revealing it.

## 9. Acceptance criteria
- Each device encodes its faults and its healthy scenario as deterministic tables.
- Each device's points and three tools honor this contract.
- Invalid identifiers return explicit errors.
- The agent does not receive the active scenario identity.
- The call budget is the device's (`budget_appels`, default 8).
- The JSON export replays the run with no simulator or API; the 3D viewer reads only it.
- Every simulator function has an executable test.
- Each turn logs the tool called, its argument, the exact value received, and the hypotheses remaining after that value.
- The log is viewable during the demo and allows verifying the diagnosis chain without revealing the secret scenario.
- The demo shows at least two measurements, one hypothesis revision, and a diagnosis grounded in the tool results.
