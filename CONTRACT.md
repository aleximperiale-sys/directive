# Directive - Shared Contract & Handoff Reference (Service Operations MVP)

This file is the **single source of truth** for names and shapes shared between the
Salesforce backend (`force-app`) and the React frontend (`uiBundles/directiveUi`). Both
halves MUST use these exact identifiers. It doubles as the engineering handoff: every
object, picklist, action, facade method, trigger, and route the MVP relies on is listed
here with enough detail to extend safely.

- **API version:** project `sourceApiVersion` is **67.0** (required by `UIBundle`; Apex classes still declare 61.0 individually) · **Namespace:** none · Objects/fields use `__c`, metadata types `__mdt`, platform events `__e`.
- **Sharing/security:** all service classes are `with sharing`; SOQL uses `WITH USER_MODE` and DML uses `AccessLevel.USER_MODE` **except** platform-side detection DML (see [Automation](#automation--triggers)).
- **Deploy as one package** - Apex tests read seeded Custom Metadata, so `customMetadata/` must deploy with `classes/`.

---

## 1. Custom objects

| Object                          | Purpose                            | Loop stage |
| ------------------------------- | ---------------------------------- | ---------- |
| `Directive_Work_Item__c`        | Central work object                | all        |
| `Directive_Signal__c`           | Observed condition                 | Detect     |
| `Directive_Action_Run__c`       | Audit of every action attempt      | Execute    |
| `Directive_Recommendation__c`   | AI/deterministic recommendation    | Explain    |
| `Directive_Outcome__c`          | Measured result of completed work  | Measure    |
| `Directive_User_Preference__c`  | Per-user UI + work preferences     | -          |

### Key fields (non-exhaustive; see `objects/**/fields`)

- **`Directive_Work_Item__c`**: `Title__c`, `Summary__c`, `Type__c`, `Category__c`, `Status__c`, `Severity__c`, `Priority_Score__c` (0–100), `Assigned_User__c` (Lookup User), `Assigned_Queue_Id__c`, `Source_Record_Id__c`, `Source_Object__c`, `Source_Record_Label__c`, `Rule_Key__c`, `Dedupe_Key__c` (External Id - dedupe guarantee), `Reason_Codes__c`, `Explanation__c`, `Confidence__c` (%), `Business_Impact__c` (Currency), `Detected_At__c`, `Last_Evaluated_At__c`, `Due_At__c`, `Snoozed_Until__c`, `Completed_At__c`, `Completed_By__c`, `Context_JSON__c`, `Version__c`, `Expires_At__c`.
- **`Directive_Signal__c`**: `Signal_Type__c`, `Source_Record_Id__c`, `Source_Object__c`, `Occurred_At__c`, `Raw_Value__c`, `Normalized_Value__c`, `Rule_Key__c`, `Confidence__c` (%), `Processing_Status__c`, `Dedupe_Key__c` (External Id), `Work_Item__c` (Lookup).
- **`Directive_Action_Run__c`**: `Work_Item__c`, `Action_Key__c`, `Requested_By__c`, `Requested_Source__c`, `Input_Payload__c`, `Preflight_Result__c`, `Approval_State__c`, `Started_At__c`, `Completed_At__c`, `Result__c`, `Error__c`, `Correlation_Id__c`, `Idempotency_Key__c` (External Id), `Rollback_State__c`.
- **`Directive_Recommendation__c`**: `Work_Item__c`, `Recommendation_Type__c`, `Recommended_Action_Key__c`, `Explanation__c`, `Confidence__c` (%), `Model_Version__c`, `Context_Snapshot__c`, `Accepted__c`, `Dismissed__c`, `Outcome__c`.
- **`Directive_Outcome__c`**: `Work_Item__c`, `Outcome_Type__c`, `Measured_At__c`, `Detail__c`, `Business_Value__c` (Currency).

---

## 2. Custom Metadata Types

`Directive_Rule__mdt`, `Directive_Persona__mdt`, `Directive_Action_Definition__mdt`,
`Directive_Score_Component__mdt`, `Directive_View__mdt`.

**Seeded records** (`customMetadata/`):
- Rules (4): `Case_SLA_Breach` (SLA_THRESHOLD), `Critical_Case_No_Owner_Action` (NO_OWNER_ACTION, Transaction), `High_Value_Account_Critical_Case` (HIGH_VALUE_CRITICAL, Aggregated), `Repeated_Customer_Response` (REPEATED_RESPONSE, Transaction).
- Persona (1): `Service_Operations`.
- Action definitions (10): one per action key below.
- Score components (11): one per score component key below.
- Views (3): `My_Work`, `Critical`, `Due_Today`.

---

## 3. Platform events

| Event                    | Purpose                                                        |
| ------------------------ | ------------------------------------------------------------- |
| `Directive_Telemetry__e` | Fire-and-forget observability (action runs, latencies, errors) |

Fields: `Event_Type__c`, `User_Id__c`, `Session_Id__c`, `Correlation_Id__c`,
`Work_Item_Id__c`, `Action_Run_Id__c`, `Duration_Ms__c`, `Result__c`, `Error_Code__c`,
`Occurred_At__c`, `Metadata__c`. Published `PublishAfterCommit`. **No subscriber ships
yet** - add one to aggregate/forward (open TODO).

---

## 4. Picklist value sets

- **Work Item `Type__c`**: `SLA_Risk`, `Critical_Case`, `High_Value_At_Risk`, `Repeated_Response`, `Escalation`, `Agent_Failure`, `Routing_Anomaly`, `Knowledge_Gap`, `Approval`
- **Work Item `Category__c`**: `Revenue`, `Customer`, `Service`, `Data`, `AI`
- **Work Item `Status__c`**: `New`, `In_Progress`, `Waiting`, `Snoozed`, `Completed`, `Dismissed`
- **Work Item `Severity__c`**: `Critical`, `High`, `Medium`, `Low`
- **Signal `Signal_Type__c`**: `SLA_Threshold`, `No_Activity`, `Case_Priority_Change`, `Repeated_Response`, `Agent_Failure`, `Routing_Anomaly`, `Knowledge_Retrieval_Failure`, `Approval_Submitted`
- **Signal `Processing_Status__c`**: `Pending`, `Processed`, `Skipped`, `Error`
- **Action Run `Result__c`**: `Success`, `Failure`, `Partial`
- **Action Run `Approval_State__c`**: `Not_Required`, `Pending`, `Approved`, `Rejected`
- **Action Run `Requested_Source__c`**: `User`, `Agentforce`, `System`
- **Action Run `Rollback_State__c`**: `None`, `Rolled_Back`, `Failed`
- **Recommendation `Recommendation_Type__c`**: `Action`, `Summary`, `Risk`
- **Outcome `Outcome_Type__c`**: `Case_Closed`, `Customer_Responded`, `Risk_Decreased`, `Approval_Completed`, `Duplicate_Resolved`, `Ineffective`

### Priority bands (score 0–100)

`Critical` 90–100 · `High` 75–89 · `Medium` 50–74 · `Low` 25–49 · `Background` <25

### Score component keys (`Directive_Score_Component__mdt.Calculation_Key__c`)

`BASE_RULE`, `URGENCY`, `BUSINESS_IMPACT`, `CUSTOMER_IMPORTANCE`, `SLA_EXPOSURE`,
`USER_RELEVANCE`, `CONFIDENCE`, `ESCALATION`, `RECENCY`, `MITIGATION`, `SUPPRESSION`.

### Reason code vocabulary (`Reason_Codes__c` + score explanation)

`SLA_BREACH_IMMINENT`, `NO_OWNER_ACTION`, `HIGH_VALUE_ACCOUNT`,
`REPEATED_CUSTOMER_RESPONSE`, `EXECUTIVE_ENGAGEMENT_GAP`, `AGENT_FAILURE`,
`KNOWLEDGE_GAP`, `RECOVERY_ALREADY_SCHEDULED`, `DUPLICATE_WORK`.

---

## 5. Action registry

All 10 MVP actions are implemented. Runtime path (`DirectiveActionService.execute`):
resolve definition → idempotency short-circuit (`Idempotency_Key__c`) → custom-permission
check → audit row (`Directive_Action_Run__c`) → dispatch → telemetry emit.

| Action key                | Impl   | Custom permission                  | Confirm | Approval | Idempotent | Dispatch effect |
| ------------------------- | ------ | ---------------------------------- | :-----: | :------: | :--------: | --------------- |
| `SNOOZE_ITEM`             | Apex   | -                                  |   no    |   no     |    yes     | Work item → Snoozed until `now+hours` |
| `DISMISS_FALSE_POSITIVE`  | Apex   | -                                  |   no    |   no     |    no      | Work item → Dismissed |
| `CREATE_FOLLOWUP_TASK`    | Apex   | -                                  |   no    |   no     |    yes     | Task on the Case, owned by caller |
| `ESCALATE_CASE`           | Flow   | `Directive_Escalate_Case`          |   yes   |   no     |    no      | `Directive_Escalate_Case_Flow`: Case `IsEscalated=true`, `Priority=High` |
| `REASSIGN_CASE`           | Apex   | `Directive_Reassign_Work`          |   yes   |   no     |    no      | Case `OwnerId=assigneeId`; mirrors to work item if a User |
| `NOTIFY_MANAGER`          | Apex   | -                                  |   no    |   no     |    no      | High-priority Task owned by manager, on the Case |
| `DRAFT_CUSTOMER_RESPONSE` | Apex   | `Directive_Execute_AI_Action`      |   yes   |   no     |    no      | Recommendation (`Action`) with draft body |
| `GENERATE_CASE_SUMMARY`   | Apex   | `Directive_Execute_AI_Action`      |   no    |   no     |    yes     | Recommendation (`Summary`); re-run refreshes, no dup |
| `CREATE_KNOWLEDGE_DRAFT`  | Apex   | `Directive_Publish_Knowledge`      |   yes   |   no     |    no      | Recommendation (`Summary`) - draft article, pending review |
| `APPROVE_RECOMMENDATION`  | Apex   | `Directive_Approve_Recommendation` |   yes   |   yes    |    no      | Recommendation `Accepted__c=true`, run `Approval_State=Approved` |

### Action payloads (`ExecuteActionInput.inputPayload`, JSON)

- `SNOOZE_ITEM`: `{ "hours": <int, default 24> }`
- `REASSIGN_CASE`: `{ "assigneeId": "<UserId 005… or QueueId 00G…>" }` (**required**)
- `NOTIFY_MANAGER`: `{ "managerId": "<UserId>" }` (optional; defaults to running user's `ManagerId`; fails if none resolvable)
- `APPROVE_RECOMMENDATION`: `{ "recommendationId": "<id>" }` (optional; defaults to newest open recommendation on the work item)
- others: none required.

**Fallback:** an unrecognized action with `Approval_Required__c=true` records a `Partial`
run ("queued for approval"); any other `Flow`-type action reuses the generic
`dispatchFlow`. Failures are caught, recorded as `Failure` with `Error__c`, and still audited.

---

## 6. Custom permissions → permission set matrix

| Custom permission                  | User | Manager | Administrator | AI Actions | Sensitive Actions |
| ---------------------------------- | :--: | :-----: | :-----------: | :--------: | :---------------: |
| `Directive_Escalate_Case`          |      |         |      ✅       |            |        ✅         |
| `Directive_Reassign_Work`          |      |   ✅    |      ✅       |            |                   |
| `Directive_Execute_AI_Action`      |      |         |      ✅       |     ✅     |                   |
| `Directive_Publish_Knowledge`      |      |         |      ✅       |            |        ✅         |
| `Directive_Approve_Recommendation` |      |   ✅    |      ✅       |            |                   |

Object/field CRUD comes from `Directive_User` (base), `Directive_Manager`, and
`Directive_Administrator` (Modify/View All). `deploy.sh` assigns `Directive_User`.

---

## 7. Apex facades (public entry points for the UI)

- **`DirectiveWorkService`**
  - `getMyWork(WorkQuery q) → List<WorkItemView>` - filtered by category/severity/view, priority-sorted.
  - `getWorkItem(Id) → WorkItemView`
  - `updateStatus(Id, String status) → WorkItemView` - on `Completed`, records an Outcome.
  - `snooze(Id, Datetime until) → WorkItemView`
- **`DirectiveSignalService`**
  - `ingestSignal(SignalInput) → Directive_Signal__c`
  - `evaluateScheduled() → Integer` - scheduled channel; open High-priority Cases.
  - `buildWorkItems(List<Directive_Signal__c> [, SignalInput hints])` - dedup + score + explain.
- **`DirectivePriorityService`** - `score(wi, signals) → PriorityResult`, `explain(wi, signals) → String`, `band(Integer) → String`. Deterministic; weights from `Directive_Score_Component__mdt`.
- **`DirectiveActionService`** - `getAvailableActions(Id) → List<ActionOption>`, `execute(ExecuteActionInput) → ActionResult`.
- **`DirectiveContextService`** - `buildContext(Id userId, Id workItemId) → String` (JSON manifest).
- **`DirectiveApprovalService`** - `getPending() → List<PendingApproval>`, `approve(Id) → Directive_Action_Run__c`, `reject(Id, String reason) → Directive_Action_Run__c`. Approve/reject require `Directive_Approve_Recommendation`.
- **`DirectiveOutcomeService`** - `record(Id, String outcomeType, String detail, Decimal businessValue) → Directive_Outcome__c`, `recordForCompletion(Directive_Work_Item__c) → Directive_Outcome__c`.
- **`DirectiveTelemetryService`** - `publish(Event) → Boolean`, `emitActionRun(correlationId, workItemId, actionRunId, result, errorCode, durationMs)`. Never throws.
- **`DirectiveConfigurationService`** - cached CMDT accessors (`getActionDefinitions`, `getRules`, `getScoreComponents`, `getPersonas`, `getViews`).

Supporting: `DirectiveException`, `DirectiveSignalScheduler` (Schedulable), `DirectiveCaseTriggerHandler`, `DirectiveSignalTriggerHandler`, `DirectiveTestFactory` (test-only).

---

## 8. Automation & triggers

- **`DirectiveSignalTrigger`** (`after insert` on `Directive_Signal__c`) → `DirectiveSignalTriggerHandler.handleAfterInsert` → `buildWorkItems`. Guarded by `DirectiveSignalService.bypassTrigger`.
- **`DirectiveCaseTrigger`** (`after insert, after update` on `Case`) → `DirectiveCaseTriggerHandler`. Real-time (Transaction channel) detection: open **High-priority** Cases - on update only when *newly* concerning (raised to High, escalated, or reopened). Emits `No_Activity` / `NO_OWNER_ACTION` signals, upserted by dedupe key `Case:{id}:NO_OWNER_ACTION`. **Detection DML is intentionally system-mode** (not `USER_MODE`) so a Case editor lacking Directive access never breaks a Case save; `with sharing` still applies. Guarded by `DirectiveCaseTriggerHandler.bypass`.
- **`DirectiveSignalScheduler implements Schedulable`** → `evaluateScheduled()`. Schedule with `DirectiveSignalScheduler.schedule(name, cron)` or `System.schedule(...)`; `CRON_HOURLY = '0 0 * * * ?'`.

### Signal type → Work Item type mapping (`DirectiveSignalService.mapSignalToType`)

`SLA_Threshold→SLA_Risk` · `No_Activity→Critical_Case` · `Case_Priority_Change→Escalation`
· `Repeated_Response→Repeated_Response` · `Agent_Failure→Agent_Failure` ·
`Routing_Anomaly→Routing_Anomaly` · `Knowledge_Retrieval_Failure→Knowledge_Gap` ·
`Approval_Submitted→Approval`.

### Flow contract - `Directive_Escalate_Case_Flow` (AutoLaunched, SystemModeWithSharing)

- **Input var:** `recordId` (String) - the Case Id.
- **Output var:** `escalationMessage` (String) - surfaced back through `ActionResult.message`.
- Any future `Flow`-type action reuses `dispatchFlow`, which passes `recordId` and reads `escalationMessage`; keep those variable names.

---

## 9. Frontend contract

- **Base path:** inside Salesforce the bundle is served from `/app/c__<bundle>`, not `/`.
  `src/app/providers.tsx` reads `globalThis.SFDC_ENV.basePath` and passes it to
  `BrowserRouter` as `basename`. Standalone `npm run dev` has no `SFDC_ENV`, so the
  basename is `undefined` and the app serves from `/`. **Never hardcode route paths
  that assume the domain root.**
- **Data seam:** components never call the SDK directly. Flow: feature → TanStack Query hook (`src/hooks/`) → repository interface (`src/salesforce/repositories.ts`) → adapter chosen by `getRepositories()` factory on `VITE_DATA_MODE` (`mock` default | `salesforce`).
- **Repository interfaces:** `WorkItemRepository`, `ActionRepository`, `ApprovalRepository`, `ContextRepository` (composed as `Repositories`).
- **Domain types/schemas:** `src/domain/{types,schemas,priority,labels}.ts` - mirror the picklists and action keys above exactly.

### Routes (`src/app/routes.tsx`) & nav (`NAV_ITEMS`)

`/today` · `/work` · `/work/:workItemId` · `/cases` · `/knowledge-gaps` · `/customers` ·
`/customers/:recordId` · `/approvals` · `/ai-activity` · `/insights` · `/settings`
(`/rules`, `/personas`, `/actions`, `/scoring`, `/permissions`).

- `Cases` = active Case-backed / Service work; `Knowledge Gaps` = `Knowledge_Gap` type or `KNOWLEDGE_GAP` reason code. Both are also in the ⌘K command palette.
- SPA history fallback configured in `ui-bundle.json` (`routing.fallback → index.html`).

---

## 10. Core loop → components (traceability)

| Stage       | Backend                                                                 | Frontend surface        |
| ----------- | ----------------------------------------------------------------------- | ----------------------- |
| **Detect**  | `DirectiveCaseTrigger` (real-time) · `DirectiveSignalScheduler` (batch) · `DirectiveSignalService` | -                       |
| **Understand** | `DirectiveContextService.buildContext`                               | Work detail context panel |
| **Prioritize** | `DirectivePriorityService.score`                                     | Priority badge          |
| **Explain** | `DirectivePriorityService.explain`, `Reason_Codes__c`                   | Priority explanation     |
| **Execute** | `DirectiveActionService.execute` (+ `Directive_Escalate_Case_Flow`)     | Action workspace         |
| **Measure** | `DirectiveOutcomeService` (via `updateStatus` completion)               | Insights                 |
| **Approve** | `DirectiveApprovalService`                                              | Approvals                |
| **Observe** | `Directive_Telemetry__e` + `DirectiveTelemetryService`                  | (subscriber TODO)        |

---

## 11. Environment setup, tooling & deployment

### 11.1 Tooling

| Tool | Version | Why | Install |
| ---- | ------- | --- | ------- |
| **Node.js** | `>=22` (enforced in both `package.json` `engines`) | UI build (Vite + `tsc`), and the `sf` CLI installs via npm | [nodejs.org](https://nodejs.org) or `nvm install 22` |
| **npm** | bundled with Node | dependency install + script runner | - |
| **Salesforce CLI (`sf`)** | latest | org auth, metadata deploy, Apex tests, org open | `npm install --global @salesforce/cli` |
| **Git** | any | source control | OS package manager |
| **VS Code + Salesforce Extension Pack** | optional | dev ergonomics, browser auth, Apex language server | Marketplace |

- **Backend stack** (runs *in the org*, no local runtime): Apex, Flow, Custom Metadata, Platform Events, Custom Permissions, Permission Sets, Lightning app + tabs, and the Multi-Framework UI Bundle.
- **Frontend stack** (built locally, then deployed as the UI Bundle): React 18, TypeScript, Vite, Tailwind, shadcn-style components on Radix, TanStack Query/Table/Virtual, Zustand, Zod, React Hook Form, React Router, date-fns, lucide, Recharts, cmdk. Tests via Vitest + React Testing Library + jsdom; lint via ESLint.
- npm must resolve the **public registry** (`https://registry.npmjs.org`); a locked-down/private registry will 403 on install.

### 11.2 Fresh-machine setup

```bash
# 1. Install Node 22+ and the Salesforce CLI
nvm install 22 && nvm use 22          # or install Node from nodejs.org
npm install --global @salesforce/cli
sf --version                          # confirm the CLI is on PATH

# 2. Get the code
git clone <repo-url> && cd directive

# 3. Install UI dependencies (root has only script shims; deps live in the UI bundle)
npm run ui:install                    # == npm --prefix .../uiBundles/directiveUi install

# 4. Authorize the target org (browser opens; alias "directive" is set default)
bash scripts/auth.sh                  # or: npm run auth
#    headless / remote shell:
bash scripts/auth.sh --device

# 5. Build the UI + deploy all metadata + assign the base permission set
bash scripts/deploy.sh                # or: npm run deploy
```

### 11.3 Org options

- **A - existing Developer/sandbox org (default here).** `scripts/auth.sh` logs in via `sf org login web` against the My Domain host `https://YOUR-DOMAIN.develop.my.salesforce.com` with alias **`directive`** (set as default). Change `INSTANCE_URL`/`ALIAS` in the script for a different org.
- **B - scratch org (needs a Dev Hub).** `config/project-scratch-def.json` (Developer edition) is provided:
  ```bash
  sf org login web --set-default-dev-hub --alias devhub
  sf org create scratch -f config/project-scratch-def.json -a directive -d -y 7
  bash scripts/deploy.sh
  ```

### 11.4 Deploy

`scripts/deploy.sh` (1) `npm install && npm run build` in the UI bundle, then (2) `sf project deploy start --source-dir force-app --target-org directive --wait 33`, then (3) assigns `Directive_User`.

```bash
bash scripts/deploy.sh            # build UI + deploy everything + assign Directive_User
bash scripts/deploy.sh --no-ui    # metadata only (skip the UI build)
bash scripts/deploy.sh --check    # validate-only (adds --dry-run; commits nothing)
# equivalent manual deploy:
sf project deploy start --source-dir force-app --target-org directive --wait 33
```

**Deploy as one package.** Apex tests read seeded Custom Metadata, and `ESCALATE_CASE`
resolves `Directive_Escalate_Case_Flow` at runtime - so `classes/`, `customMetadata/`,
`flows/`, and `triggers/` must deploy together. `DirectiveCaseTrigger` installs on the
standard **Case** object (coordinate with existing Case automation). The UI Bundle deploys
with the rest but only *renders* where Multi-Framework is enabled (open TODO #2); standard
tabs work meanwhile.

### 11.5 Post-deploy

```bash
# Assign additional role permission sets as needed
sf org assign permset --name Directive_Manager       --target-org directive
sf org assign permset --name Directive_Administrator  --target-org directive
sf org assign permset --name Directive_AI_Actions     --target-org directive
sf org assign permset --name Directive_Sensitive_Actions --target-org directive

# Schedule the periodic signal evaluation (hourly)
echo "DirectiveSignalScheduler.schedule('Directive Signal Evaluation', DirectiveSignalScheduler.CRON_HOURLY);" \
  | sf apex run --target-org directive

# Open the app
sf org open --target-org directive --path lightning/app/Directive_UI
```

### 11.6 UI local development (no org required)

```bash
npm run ui:dev        # Vite dev server → http://localhost:5173 (VITE_DATA_MODE=mock default)
npm run ui:build      # tsc -b && vite build → dist/  (what deploy.sh runs)
```

`VITE_DATA_MODE=salesforce` switches the repository factory to the live adapter - that
adapter is still stubbed (open TODO #1), so `mock` is the working default.

### 11.7 Tests

```bash
npm run apex:test     # sf apex run test --result-format human --code-coverage --wait 20 (runs in the org)
cd force-app/main/default/uiBundles/directiveUi && npm run test   # Vitest + RTL
cd force-app/main/default/uiBundles/directiveUi && npm run lint   # ESLint
```

Apex tests: `DirectiveActionServiceTest`, `DirectiveActionServiceExtendedTest`,
`DirectiveApprovalServiceTest`, `DirectiveOutcomeServiceTest`, `DirectiveDetectionTest`,
`DirectivePriorityServiceTest`, `DirectiveSignalServiceTest`, `DirectiveWorkServiceTest`.
Permission-gated actions run under `DirectiveTestFactory.permittedUser()` via `System.runAs`.

### 11.8 Troubleshooting

- **`sf: command not found`** → `npm install --global @salesforce/cli` and reopen the shell.
- **npm `403 Forbidden` on install** → point npm at the public registry (`npm config set registry https://registry.npmjs.org`).
- **Node too old** → the build/test fail on the `engines` gate; upgrade to Node 22+.
- **Deploy fails on the flow** → confirm API 61.0 and that `Directive_Escalate_Case_Flow` deploys `Active`.
- **`ESCALATE_CASE` test fails locally-only** → the flow must be present in the org; deploy the package as one unit (§11.4).
- **Auth expired / wrong org** → `sf org display --target-org directive`; re-run `bash scripts/auth.sh`.

---

## 12. Open contract-affecting TODOs

1. **Wire the live Salesforce adapter** (`SalesforceRepositories.ts`) and run
   `VITE_DATA_MODE=salesforce`. Two known prerequisites:
   - The SDK is real and installable: `@salesforce/platform-sdk` (`^10.6.0`), alongside
     `@salesforce/ui-bundle` and `@salesforce/vite-plugin-ui-bundle`.
   - **No Apex facade method is `@AuraEnabled` today** - all 49 annotations sit on DTO
     fields, not on `execute` / `getMyWork` / `getAvailableActions` / etc. They must be
     annotated before any client can invoke them.
2. **UI Bundle deployment** - deploys clean; rendering pending confirmation. Three
   things are required, and **all three must be right or the app renders an empty
   "No Items" shell while every deploy still reports success**:
   - `sourceApiVersion` **67.0** (`UIBundle` does not exist below it).
   - a `directiveUi.uibundle-meta.xml` descriptor. `<target>` is **optional** - it
     defaults to `CustomApplication` for internal employee apps, and the official
     reference app omits it. (The beta's `<target>AppLauncher</target>` is deprecated;
     don't reintroduce it.) Note `sf template generate ui-bundle` does scaffold the
     descriptor but our bundle predated it and had none.
   - `CustomApplication.uiBundle` set to the **namespace-qualified** `c__directiveUi`
     (`c__` + the `uiBundles/` folder name). A bare `directive` deploys successfully
     and renders nothing - this was the actual bug.

   `ui-bundle.json` must also use the real schema (`outputDir` + `routing`), not the
   invented `buildOutput`/`type`/`entry`/`rewrites` keys it originally had.

   Both files now mirror the official reference app,
   [trailheadapps/multiframework-recipes](https://github.com/trailheadapps/multiframework-recipes)
   (`force-app/main/default/applications/reactRecipes.app-meta.xml` +
   `force-app/main/react-recipes/uiBundles/reactRecipes/`). Also see the
   [Multi-Framework guide](https://developer.salesforce.com/docs/platform/multiframework/guide/reactdev-integrate.html)
   and [CustomApplication reference](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_customapplication.htm).
3. Agentforce: structured-output validation + Conversation Client inline embedding; `DirectiveContextService` already returns the manifest.
4. Harden detection: real SLA milestones / last-owner-activity; implement `REPEATED_RESPONSE` and `HIGH_VALUE_CRITICAL` rules; consider CDC/Platform Events for volume.
5. Add a `Directive_Telemetry__e` subscriber for metric aggregation / external forwarding.
6. **Test isolation.** The three negative permission tests assert that the *running*
   user lacks a custom permission, so they break if an admin self-assigns
   `Directive_Administrator` / `Directive_Sensitive_Actions`. They should run under an
   explicitly unpermitted `System.runAs` user instead of depending on org state.

### 12.1 Platform gotchas found during the first real deploy

These cost real debugging time; they are recorded so nobody re-derives them.

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `UNKNOWN_EXCEPTION`, 0 component errors, on `customMetadata/` | records used `xsi:type="xsd:string"` but never declared `xmlns:xsd` | declare both `xmlns:xsd` and `xmlns:xsi` on `<CustomMetadata>` |
| Every UI Bundle file: *"Not available for deploy for this API version"* | `UIBundle` needs API ≥ 67.0; project was pinned to 61.0 | bump `sourceApiVersion` (the `--api-version` **flag alone does not work**) |
| `ExpectedSourceFilesError: Expected source files for type 'UIBundle'` | no `<name>.uibundle-meta.xml` descriptor in the bundle folder | add it (`sf template generate ui-bundle` scaffolds a reference) |
| `tabs cannot be updated for applications backed by a uiBundle` | a `CustomApplication` may have tabs **or** a bundle, never both | drop `<tabs>`; rely on permission-set tab visibility |
| App renders **"No Items"** / "this app doesn't have any navigation items" - while every deploy reports Succeeded | `CustomApplication.uiBundle` was a bare bundle name instead of the namespace-qualified `c__<bundle>` | use `c__` + the `uiBundles/` folder name |
| `sf project retrieve start` returns `success: true, files: 0` for `CustomApplication` / `UIBundle` | CLI quirk in this org - cannot read back what was stored | verify by loading the app, not by retrieving |
| App shell renders, but the main pane shows **our own React-Router 404** | the bundle is mounted at `/app/c__<name>`, not `/`. React Router matched the full pathname against `/today`, `/work`, … and found nothing | pass the platform-injected `globalThis.SFDC_ENV.basePath` to `BrowserRouter` as `basename` (see `src/app/providers.tsx`) |
| Apex: `Unexpected token 'List'` / `Variable does not exist: in` | `where` and `in` are **reserved words** used as local identifiers | rename (`filters`, `si`) |
| Apex: `void deserializeUntyped(String) from the type String` | a local named `json` shadowed the system `JSON` class (Apex is case-insensitive) | rename the local |
| SOQL `No such column 'Title__c'` under `WITH USER_MODE` | `Directive_User` was never assigned to the running user | `sf org assign permset --name Directive_User` |
| Signal tests: `DUPLICATE_VALUE` / 2 work items instead of 1 | fixtures insert an open High-priority Case, which `DirectiveCaseTrigger` independently detects | set `DirectiveCaseTriggerHandler.bypass` in the fixture |
