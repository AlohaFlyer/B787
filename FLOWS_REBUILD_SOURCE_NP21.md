# B787 Flows Rebuild - FCOM NP.21 Verbatim Source

Staged 2026-06-23 (Cowork desktop). Verbatim transcription from FCOM R10 (Apr 1, 2026),
Normal Procedures - Amplified Procedures. Source of truth for finishing the four DRAFT stub
flows and the flow 3/4 audit in flows_quiz.html and phase_flows.html.

Rules carried into the rebuild: FCOM-verbatim, item counts confirmed, semantic colors
non-negotiable (coral-red = flight-deck/CA verbal calls + PF tags; teal-blue = ground crew
calls + FMC/CDU entries), gate markers per the spec, trigger flags = red dot + TRIGGER badge.

Status: SOURCE STAGED, NOT YET BUILT INTO THE PORTAL. The four flows below are still DRAFT
stubs on flows_quiz.html line 229 (refs NP.21.30, Cruise/ETOPS entry, NP.21.45, NP.21.48).

---

## Pushback or Towing Procedure (FCOM NP.21.29-.30)

The Engine Start procedure may be done during pushback or towing.

- Ground handling personnel ........ Establish communications  [C]
- CAUTION: Do not turn the nose wheel tiller during pushback or towing. This can damage the nose gear or the tow bar.
- CAUTION: Do not use airplane brakes to stop the airplane during pushback or towing. This can damage the nose gear or the tow bar.
- TRANSPONDER MODE Selector ............ XPDR  [F/O]
- Parking brake ........ Set or release  [C]  (set or release as directed by ground handling personnel)
- When pushback or towing is complete:
  - Tow bar ........ Verify not connected  [C]
  - Nose gear steering ........ Verify not locked out  [C]

## Engine Start Procedure (FCOM NP.21.30)

- Select the secondary engine indications.  [F/O]
- Crew action to correct for abnormal engine indications is not needed.
- Respond to any EICAS messages that show.
- Note: The engines may not start if external power and the APU are both supplying electric power at the same time. One source must be selected off. The APU is the preferred electric power source for engine start.
- Note: Do not make flap or primary flight control inputs on the ground until after the EICAS engine RUNNING indication appears and all four GEN CTRL OFF lights are extinguished.
- CAUTION: If OAT is above 40 deg C, do not attempt to start both engines at the same time.
- Start clearance ........ Obtain  [C]
- Start sequence ........ Announce  [C]  (the engines may be started at the same time)
- Call "START ____ ENGINE"  [C]
- Engine START selector ........ START  [F/O]
- FUEL CONTROL switch ........ RUN  [C]
- If the engines were not started at the same time: after the engine is stabilized at idle, start the other engine.
- Note (PCU Y201 software): PACK L and PACK R messages can show ~30 s after the second engine is running and blank ~20 s after; not a fault unless shown >1 min after the second engine is running.

## Landing Procedure - Instrument Approach Using IAN (FCOM NP.21.45)

IAN should be used only for approaches that have one of the following features:
- a published GP angle on the LEGS page for the final approach segment
- a RWxx waypoint at the approach end of the runway
- a missed approach waypoint before the approach end of the runway (for example, MXxx)

Use of IAN is not recommended when an approach has a visual maneuver segment that is not in the FMC database. This procedure is not authorized using QFE.

PF / PM:
- Initially (PF): radar vectors -> HDG SEL, Pitch mode (as needed); enroute to a fix -> LNAV or other roll mode, VNAV or other pitch mode.
- PF: Call "FLAPS___" per flap extension schedule.  PM: Set flap lever as directed.
- On LOC/final approach course intercept heading (PF): Verify nav radios tuned/identified (as needed); verify deviation pointers shown.
- PM: When cleared for the approach, select TAXI light switch ON.
- PF: Arm the APP mode.
- PF: Use LNAV/HDG SEL/TRK SEL/HDG HOLD/TRK HOLD to intercept final approach course as needed.
- PM: Call "COURSE/LOCALIZER ALIVE."
- PF: Verify LOC/final approach course captured.
- Approx 2 NM before FAF (PF): "GEAR DOWN", "FLAPS 20".  PM: "APPROACHING GLIDE PATH"; gear lever DN; flap lever 20.
- PF: Speedbrake lever ARMED.
- At GP capture (PF): "FLAPS___" as needed for landing.  PM: Set flap lever as directed.
- PF: Set missed approach altitude on MCP.
- PF: Call "LANDING CHECKLIST."  PM: Do the LANDING checklist.
- PF: At FAF verify crossing altitude; monitor approach.
- PM: When cleared to land, NOSE LANDING light ON.
- PF: At DA(H)/MDA(H)/MAP with suitable visual reference, disengage autopilot per regs; maintain glide path to landing.

## Landing Procedure - Instrument Approach Using VNAV (FCOM NP.21.48)

VNAV should be used only for approaches with: published GP angle on LEGS for final segment; an RWxx waypoint at the approach end; or a missed approach waypoint before the approach end (e.g., MXxx). Not authorized using QFE.

PF / PM:
- Initially (PF): radar vectors -> HDG SEL, Pitch mode (as needed); enroute to a fix -> LNAV or other roll mode, VNAV or other pitch mode.
- PF: Call "FLAPS___" per flap extension schedule.  PM: Set flap lever as directed.
- Recommended final-approach roll modes: RNAV/GPS/VOR/NDB -> LNAV; B/CRS -> LNAV or B/CRS; LOC/SDF/LDA/ILS(G/S off)/IGS(G/S off) -> LNAV or LOC.
- On final approach course intercept heading for LOC/B/CRS/SDF/LDA (PF): Verify localizer tuned/identified; verify LOC pointer shown.
- PM: When cleared for the approach, TAXI light ON.
- PF: Arm LNAV or LOC mode.
- WARNING: Using LNAV to intercept the localizer, LNAV might parallel the localizer without capturing it; the airplane can then descend on the VNAV path with the localizer not captured.
- PF: Use LNAV/HDG SEL/TRK SEL/HDG HOLD/TRK HOLD to intercept final approach course as needed.
- PM: Call "COURSE/LOCALIZER ALIVE" (as appropriate).
- PF: Verify LNAV engaged or localizer captured.
- Approx 2 NM before FAF and after ALT/VNAV PTH/VNAV ALT annunciated (PF): Set DA(H)/MDA(H) on MCP; select/verify VNAV; select/verify speed intervention.  PM: "APPROACHING GLIDE PATH".
- PF: "GEAR DOWN", "FLAPS 20".  PM: gear lever DN; flap lever 20.
- PF: Speedbrake lever ARMED.
- Beginning final approach descent (PF): "FLAPS ___" as needed for landing.  PM: Set flap lever as directed.

## Cruise / ETOPS-NAT Entry (DRAFT - no single NP section)

Not a standalone NP.21 amplified procedure. Build from ETOPS/oceanic items in
B787_ChairFly_07_ETOPS_Enroute_CA_Script.md and FCOM SP oceanic/ETOPS sections. Confirm exact
items against the manual before publishing; do not invent.

## Flow 3 / Flow 4 audit note

CDU Preflight verbatim source already lives in cdu_preflight.html / B787_CDU_Preflight_Study.md
(FCOM NP.21.2-5). Flow 4 is the next Preflight-phase flow; confirm its FCOM NP.21 section and
decompose into the item/act/role/trg schema before publishing.
