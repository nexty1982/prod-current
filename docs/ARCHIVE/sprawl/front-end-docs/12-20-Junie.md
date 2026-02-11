📁 Documentation Organization Rules for OrthodoxMetrics
Core principle (non-negotiable)

Documentation is organized by Category → Type, not by feature names or people.

Category = domain of the work (matches OM-Tasks Category)

Type = nature of the content (matches OM-Tasks Type)

Nothing gets placed arbitrarily.

📂 Top-Level Directory Structure
/docs
  /ingestion-digitization
  /data-structuring-accuracy
  /workflow-user-experience
  /platform-infrastructure
  /analytics-intelligence


These directory names must exactly map to the OM-Tasks Category dropdown:

OM-Tasks Category	Directory
Ingestion & Digitization	ingestion-digitization
Data Structuring & Accuracy	data-structuring-accuracy
Workflow & User Experience	workflow-user-experience
Platform & Infrastructure	platform-infrastructure
Analytics & Intelligence	analytics-intelligence

No extra top-level folders allowed.

📂 Second-Level: Type Directories (Required)

Inside each category, create these four fixed subdirectories:

/documentation
/configuration
/reference
/guides


These must exactly match the OM-Tasks type field:

OM-Tasks Type	Directory
documentation	documentation
configuration	configuration
reference	reference
guide	guides

No synonyms. No pluralization changes (except guides).

📁 Example (Correct)
/docs
  /ingestion-digitization
    /documentation
      ocr-pipeline-overview.md
    /configuration
      google-vision-settings.md
    /reference
      vision-ocr-json-schema.md
    /guides
      tune-handwriting-detection.md

🚫 What NOT to Do (Important)

Junie must not:

Create folders like /ocr, /fusion, /vision, /misc

Mix types in the same folder

Put guides under documentation

Put reference material under guides

Create personal or temporary folders

Reorganize by feature instead of category

Features belong in filenames, not directory structure.

🏷️ Naming Rules for Files

Use kebab-case

Be explicit and boring (clarity > cleverness)

Include scope when needed

Examples:

fusion-entry-bounding-boxes.md
ocr-language-filtering-ru-en.md
baptism-field-extraction-reference.md
deploy-prod-nginx-config.md

🔁 Mapping Rule (Critical)

Every document must map cleanly to:

One Category

One Type

One OM-Task

If Junie cannot confidently assign both:
→ Stop and ask (do not guess).

📌 Decision Checklist for Junie

Before placing a file, answer:

What domain does this belong to? → Category

Is this:

Explaining what something is? → documentation

Telling how to set it up? → configuration

Defining exact rules / schemas / APIs? → reference

Step-by-step instructions? → guide

Does this match an OM-Task entry?

If any answer is unclear → flag it.

Strong enforcement rule (tell Junie this explicitly)

Directory structure is a contract with the system.
If the structure drifts, OM-Tasks, public docs, and OMAI intelligence will break.