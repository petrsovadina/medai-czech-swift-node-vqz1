[SELECTED_THEME: minimal-white]

Czech MedAI — Patient-Centric Clinical AI Assistant

1. Overview

Czech MedAI is a localized, FHIR HL7 CZ Core-compliant clinical AI assistant for Czech healthcare professionals. It provides evidence-based answers in Czech with PMID/DOI citations, patient-centric long-term memory (diagnoses, medications, lab values, allergies persisted per patient), and integration with Czech healthcare standards (SÚKL, VZP, ČLS JEP). The system uses a Manager-Subagent architecture to coordinate clinical consultation, medical literature research, and patient context recall — enabling doctors to work within the full clinical context of each patient across sessions.

2. User Stories





As a physician, I want to select a patient and ask clinical questions with full awareness of their history so I can make informed decisions



As a GP, I want evidence-based answers with Czech guidelines (ČLS JEP) and VZP reimbursement info so I can prescribe efficiently



As a specialist, I want to search PubMed literature on a topic and get synthesized summaries with citations so I stay current



As a physician, I want the system to auto-capture diagnoses, medications, and lab values from our conversation into the patient's record



As an admin, I want to manage physician accounts and view audit logs for compliance

3.a. Agent Architecture

Pattern: Manager-Subagent + Independent Agent

Reasoning: A single clinical query requires coordinated retrieval from the patient's FHIR-structured memory AND medical literature simultaneously, then synthesis into a formatted response — this is a one-shot multi-source workflow needing specialized sub-agents. The Literature Search (SynthMode) operates independently as a separate feature doctors access via a different tab.

Agent Flow:
Doctor logs in → selects/creates a patient (identified by hashed rodné číslo) → enters the Patient Consultation screen → types a clinical question → clicks "Zeptat se" (Ask) → Clinical Coordinator Manager routes the query to Patient Context Agent (retrieves FHIR-structured patient memory: conditions, medications, allergies, observations) and Medical Knowledge Agent (searches KB of Czech guidelines + uses Perplexity for current evidence) → Manager synthesizes both into a QuickConsult or DeepConsult formatted response with inline citations and patient-specific context → response displayed with sources panel. Auto-capture runs after each exchange, extracting clinical facts (diagnoses, meds, labs, allergies) and persisting them to the patient's record in MongoDB. Separately, on the "Vyhledávání literatury" tab, the doctor can trigger the Literature Research Agent independently to search and summarize PubMed studies.

Data Sources Detected: 3 — Knowledge Base (Czech clinical guidelines, SÚKL SPC documents), Perplexity web search (PubMed/current medical evidence), MongoDB (patient FHIR records + user accounts)

Agents Table:







Agent Type



Agent Name



Description



Tools/Data Sources



Trigger



Provider



Model



Temperature



Top_p





Manager



Clinical Coordinator



Coordinates patient context retrieval and medical knowledge search, aggregates results into QuickConsult/DeepConsult formatted responses with citations, handles urgency classification



N/A



"Zeptat se" on Patient Consultation



OpenAI



gpt-5.1



0.3



1





Sub-Agent



Patient Context Agent



Retrieves and summarizes patient's FHIR-structured clinical data (conditions, medications, allergies, observations, encounters) from MongoDB, applies weighted importance to recent vs. historical data



Knowledge Base (patient guidelines)



Auto (via Manager)



OpenAI



gpt-4.1



0.2



1





Sub-Agent



Medical Knowledge Agent



Searches Czech clinical guidelines KB and current medical literature for evidence-based answers with PMID/DOI citations, prioritizes Czech sources (ČLS JEP, SÚKL) over international



Knowledge Base (Czech guidelines, SÚKL)



Auto (via Manager)



Perplexity



sonar-pro



0.2



1





Independent



Literature Research Agent



Independently searches and synthesizes PubMed/medical literature on a given topic, produces SynthMode card-based summaries with study design, findings, limitations, and clinical implications



N/A



"Vyhledat studie" on Literature Search tab



Perplexity



sonar-pro



0.3



1

Workflow Visualization:

The Input Node is positioned at the far left. The Clinical Coordinator Manager connects to the right of the Input Node at the same vertical level. Directly below the Manager, two sub-agents (Patient Context Agent and Medical Knowledge Agent) are positioned in a horizontal row at the same vertical level, evenly spaced. The Manager connects downward to both sub-agents. The Literature Research Agent is positioned independently to the right of the Manager at the same vertical level, representing a separate workflow accessed via a different UI tab.

Connection Summary:





Input → Clinical Coordinator: Right



Clinical Coordinator → Patient Context Agent: Bottom



Clinical Coordinator → Medical Knowledge Agent: Bottom



Input → Literature Research Agent: Right (separate flow)

3.b. Files/Website Provided by User

These files will be used by the agents:







File Name/Website Link



Purpose



Description





Benjamin langchain.pdf



Build Context



Defines the Czech MedAI v3.0 clinical prompt specification — used to configure agent instructions for response formatting (QuickConsult/DeepConsult templates), citation standards, safety guardrails, urgency classification, and Czech healthcare contextualization (SÚKL, VZP, ČLS JEP)





https://build.fhir.org/ig/HL7-cz/cz-core/



Knowledge Base



Medical Knowledge Agent & Patient Context Agent — FHIR HL7 CZ Core implementation guide defining Czech patient data profiles (Patient, Condition, MedicationRequest, Observation, AllergyIntolerance, Encounter, DiagnosticReport, DocumentReference) for structuring patient records

Summary:





Agent(s) with KB: Medical Knowledge Agent, Patient Context Agent



Content type: Website (FHIR HL7 CZ Core IG)



Purpose: Enables agents to structure and query patient data per Czech FHIR standards and answer questions about FHIR resource profiles

3.g. Database Configuration

Database: MongoDB (Built-in Lyzr Studio database)

User Management: Required — physicians sign up with email, password, specialty, and institution type. All screens gated behind authentication.







Collection / Entity



Purpose



Key Fields





users



Physician accounts, authentication, role-based access



id, email, password_hash, name, specialty, institution_type, role, clk_number, created_at





patients



Patient registry with anonymized identifiers



id, patient_hash (SHA-256 of rodné číslo), display_name (optional alias), created_by_user_id, created_at





patient_conditions



FHIR Condition resources per patient



id, patient_id, code, display, clinical_status, onset_date, severity_weight, recorded_by, created_at





patient_medications



FHIR MedicationRequest resources



id, patient_id, medication_code, display, dosage, status, authored_on, recorded_by





patient_observations



FHIR Observation resources (lab values, vitals)



id, patient_id, code, display, value, unit, effective_date, recorded_by





patient_allergies



FHIR AllergyIntolerance resources



id, patient_id, substance_code, display, criticality, reaction, recorded_by





patient_encounters



FHIR Encounter resources (session logs)



id, patient_id, encounter_type, period_start, period_end, reason, session_notes, recorded_by





patient_documents



FHIR DocumentReference resources (linked studies/guidelines)



id, patient_id, doc_type, title, url, description, recorded_by





audit_logs



GDPR-compliant audit trail



id, user_id, action, resource_type, resource_id, timestamp, anonymized_query_hash





session_history



Conversation transcripts per patient encounter



id, patient_id, user_id, encounter_id, messages_json, created_at

Roles:







Role



Access Level





admin



Full access — manage physicians, view audit logs, system configuration





physician



Standard — manage own patients, consult, search literature

Authentication Flow: Physician signs up with email, password, name, specialty, institution type. Login with email + password. All routes protected. Admin role assigned manually.

4. User Flow

1. Physician lands on Login Screen
2. New user → clicks \"Registrace\" → fills name, email, password, specialty, institution → account created → redirected to app
3. Returning user → enters email + password → authenticated → enters Dashboard
4. Dashboard shows: recent patients, quick stats, navigation to Patient Consultation and Literature Search
5. Physician clicks \"Nový pacient\" or selects existing patient from list
   - New patient: enters rodné číslo (auto-hashed) + optional display alias → patient created in MongoDB
   - Existing patient: system loads full FHIR-structured context from MongoDB
6. Patient Consultation Screen loads with patient summary panel (conditions, meds, allergies, recent observations)
7. Physician types clinical question in chat → clicks \"Zeptat se\"
   → Clinical Coordinator Manager orchestrates:
→ Patient Context Agent retrieves relevant patient FHIR data from MongoDB
     → Medical Knowledge Agent searches Czech guidelines KB + Perplexity for evidence
→ Manager synthesizes into QuickConsult/DeepConsult response with citations
8. Response displayed with: answer panel, sources sidebar (clickable PMID/DOI links), patient context badges
9. Auto-capture: system extracts new clinical facts (diagnoses, meds, labs mentioned) and offers to save to patient record
10. Physician confirms/edits auto-captured data → persisted to MongoDB FHIR collections
11. Physician can switch to \"Vyhledávání literatury\" tab → enters topic → clicks \"Vyhledat studie\"
    → Literature Research Agent returns card-based SynthMode summaries
12. Admin can access Admin Panel → view audit logs, manage physician accounts


5. Integrations Required

No out-of-the-box integrations required for this app.



Manual Setup Required: This app requires custom FHIR API integration for future EHR system connectivity (PC doktor, AIS, GALEN) and SÚKL/VZP API access for real-time drug registration and reimbursement checks. These are not available as pre-built integrations on Lyzr Studio. You will need to configure these manually using Custom Tools (OpenAPI spec) or MCP Servers after deployment. The FHIR HL7 CZ Core website is used as a Knowledge Base for now; live FHIR server integration is a future enhancement. This does not block the 'Push to Agents' flow.

6. UI/UX Specification

App Structure

Left sidebar navigation (collapsible) with: Dashboard, Patient Consultation, Literature Search, Admin Panel (admin only). Top header with app logo, physician name/specialty badge, and logout. Main content area takes remaining space.

Design System

Components: Patient summary cards, clinical data badges (conditions, meds, allergies), chat message bubbles with citation markers, source cards with PMID/DOI links, data capture confirmation modals, form inputs with validation states.
Visual Hierarchy: 8pt grid, large headings for patient name/section titles, subtle secondary text for timestamps and metadata. Clean, high-density clinical interface with minimal empty space — information-rich but not cluttered.
Production-Ready: Skeleton loaders during agent processing, error toasts with recovery actions ("Zkuste znovu"), empty states ("Žádní pacienti — vytvořte prvního pacienta"), smooth transitions between screens.

Modern medical-professional aesthetic. Clean sans-serif typography. Card-based layouts. Subtle shadows for depth. Responsive design. Toast notifications for auto-capture confirmations. Modal dialogs for patient creation and data confirmation. Floating action button for quick patient creation on Dashboard.

Screens

Screen 0: Login

Purpose: Authenticates physicians
Components: Centered card form — email, password inputs, "Přihlásit se" button, "Nemáte účet? Registrace" link, error state for invalid credentials

Screen 0b: Sign Up

Purpose: Creates new physician accounts
Components: Name, email, password, specialty dropdown (Praktický lékař, Kardiolog, Farmaceut, etc.), institution type radio (Nemocnice, Ambulance, Terén), "Vytvořit účet" button, link back to login

Screen 1: Dashboard

Purpose: Overview and quick access to patients and recent activity
Layout: Two-column — left: recent patients list with search/filter, right: quick stats (total patients, today's consultations, pending captures)
Components: Patient cards (name/alias, last encounter date, top conditions), "Nový pacient" floating action button, navigation tiles to Literature Search

Screen 2: Patient Consultation

Purpose: Core clinical consultation interface with patient context
Layout: Three-panel — left sidebar: patient summary (collapsible panels for Conditions, Medications, Allergies, Observations), center: chat interface, right sidebar: sources panel (citations from latest response)
Components:





Patient header: display name, anonymized ID badge, last encounter date



Summary panels: expandable cards per FHIR resource type with badges showing count



Chat area: message bubbles with QuickConsult/DeepConsult formatted responses, inline citation markers [1][2]



Input bar: text area + "Zeptat se" CTA + Quick/Deep toggle



Sources panel: clickable citation cards (PMID link, journal, year, confidence tier badge)



Auto-capture toast: "Nová diagnóza detekována: Hypertenze — Uložit?" with Confirm/Edit/Dismiss

Screen 3: Literature Search

Purpose: Independent PubMed/literature research
Layout: Single column — search bar at top, results as SynthMode cards below
Components: Topic input field, time filter dropdown, "Vyhledat studie" CTA, result cards (study title, design badge, key findings, limitations, PMID link, abstract preview on hover)

Screen 4: Admin Panel (admin only)

Purpose: User management and audit log review
Components: Physician list table (name, specialty, last active, status), audit log table (timestamp, user, action, resource type), filters by date and user

Complete User Journey

Physician opens app → Login screen → authenticates → Dashboard with patient list → selects patient → Patient Consultation with full FHIR context loaded in sidebar → types question → agent processes (skeleton loader) → formatted response with citations appears → auto-capture toast for new clinical facts → confirms save → data persisted → continues conversation or switches to Literature Search tab → searches topic → SynthMode cards displayed → returns to Dashboard. Admin pathway
