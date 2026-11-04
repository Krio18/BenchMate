# AGENT.md --- Working rules for Muse Code

Read `AGENT.md` and `SPEC.md` in full before starting any
task. These files are the project contract. In case of conflict or
ambiguity, stop and ask for clarification before modifying
the code.

Agent's initial context. The agent receives, built from the active device: a textual circuit description (its components and their role, the signal order), the list of measurement points with their names, the list of the three tools, the nominal datasheet (expected DC voltages, amplitudes, and qualities in normal operation, i.e. the device's healthy scenario), and the reported symptom. It receives neither the fault tables, nor any mention of their existence or count, nor the list of possible faults. The system prompt, identical for all devices, additionally imposes three reasoning principles: propagation (the culprit precedes the first anomaly), dichotomy (characterize the symptom at the output, then work back up by dichotomy on the relevant quantity), and operating-conditions check (supply and bias of the suspect before accusing it).

## Mandatory rules

1.  **Allowed stack:** Python for the simulator and the agent;
    Three.js for the 3D scene. Do not add any other dependency,
    library, framework, or service without asking me first.
2.  **One task at a time:** work only on the explicitly
    requested task. Once finished, run the relevant
    checks, summarize the changes, and wait for my approval. Never
    start the next task on your own.
3.  **Size limit:** no code file may exceed 200 lines. If
    a code file risks exceeding this limit, stop and propose
    a split before continuing.
4.  **Mandatory tests:** every simulator function must come
    with a test I can run. Give the exact command
    to run the tests. Do not add a test dependency without
    asking; prefer already-available standard test tools.
5.  **Architecture decisions:** if an architecture, project-structure,
    protocol, dependency, or API-contract decision
    is needed and is not defined in the specifications,
    stop and ask me. Do not decide for me.
6.  **No electronic-simulation library:** the simulator
    is a table of predefined values. It must not use an
    electronic-simulation library or attempt to physically model
    the circuit.
7.  **Respect `SPEC.md`:** do not change the devices, their
    faults, their measurement points, the three tools, their signatures
    or their return structures without my explicit authorization.
8.  **The simulator is authoritative:** the model must never invent
    a measurement. Voltages, amplitudes, and signal states are read
    from the active scenario table.
9.  **No scenario leak:** the agent must not receive
    the active fault identifier or any indicator revealing the
    defective component.
10. **No false success:** do not claim a test passed if
    you did not run it. Clearly report unrun tests and
    encountered limitations.
11. **Minimal changes:** do not refactor unrelated code.
    Do not overwrite existing work, and examine the relevant files
    before modifying them.
12. **No invented features:** do not create additional
    features, files, or configuration that were
    not requested or approved.

## Procedure for each task

1.  Read `AGENT.md` and `SPEC.md`.
2.  Examine the existing files directly relevant to the task.
3.  Briefly restate the goal and the files to be
    modified.
4.  If a required piece of information or decision is missing, stop and ask
    me.
5.  Perform only the authorized task.
6.  Verify that each modified code file is at most 200 lines.
7.  Run the relevant tests, including the relevant simulator
    tests.
8.  Summarize the modified files, the commands run, and the
    exact results.
9.  Stop and wait for my approval before continuing.

## Report format

At the end of each task, provide: - **Done:** changes made. -
**Files:** list of modified files. - **Tests:** exact
command and actual result, or why they were not
run. - **Limitations:** unverified points or known issues. -
**Next:** wait for my instruction; do not start a new
task.
